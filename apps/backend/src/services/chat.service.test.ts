import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma before importing chatService
vi.mock('../db/index.js', () => ({
  default: {
    conversation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    message: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))

// Mock the router agent to avoid LLM calls
vi.mock('../agents/router.agent.js', () => ({
  classifyIntent: vi.fn().mockResolvedValue('support'),
  routeToAgent: vi.fn().mockResolvedValue({
    text: Promise.resolve('Mocked response'),
    textStream: new ReadableStream({
      start(controller) {
        controller.enqueue('Mocked response')
        controller.close()
      },
    }),
  }),
}))

import { chatService } from '../services/chat.service.js'
import prisma from '../db/index.js'

const mockPrisma = prisma as unknown as {
  conversation: {
    create: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
  message: {
    create: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
  }
}

describe('chatService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── processMessage ──────────────────────────────

  describe('processMessage', () => {
    it('creates a new conversation when no conversationId is provided', async () => {
      mockPrisma.conversation.create.mockResolvedValue({ id: 'conv-new' })
      mockPrisma.message.create.mockResolvedValue({})
      mockPrisma.message.findMany.mockResolvedValue([
        { role: 'user', content: 'Hello' },
      ])

      const result = await chatService.processMessage('Hello')

      expect(mockPrisma.conversation.create).toHaveBeenCalledOnce()
      expect(result.conversationId).toBe('conv-new')
      expect(result.agentType).toBe('support')
    })

    it('uses existing conversation when conversationId is provided', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'conv-123' })
      mockPrisma.message.create.mockResolvedValue({})
      mockPrisma.message.findMany.mockResolvedValue([
        { role: 'user', content: 'Hello' },
      ])

      const result = await chatService.processMessage('Hello', 'conv-123')

      expect(mockPrisma.conversation.create).not.toHaveBeenCalled()
      expect(result.conversationId).toBe('conv-123')
    })

    it('throws 404 when conversation does not exist', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(null)

      await expect(
        chatService.processMessage('Hello', 'nonexistent')
      ).rejects.toThrow('Conversation not found')
    })

    it('saves the user message to the database', async () => {
      mockPrisma.conversation.create.mockResolvedValue({ id: 'conv-1' })
      mockPrisma.message.create.mockResolvedValue({})
      mockPrisma.message.findMany.mockResolvedValue([])

      await chatService.processMessage('Test message')

      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'conv-1',
          role: 'user',
          content: 'Test message',
        },
      })
    })

    it('applies context compaction when history exceeds 20 messages', async () => {
      mockPrisma.conversation.create.mockResolvedValue({ id: 'conv-1' })
      mockPrisma.message.create.mockResolvedValue({})

      // Create 25 mock messages
      const longHistory = Array.from({ length: 25 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }))
      mockPrisma.message.findMany.mockResolvedValue(longHistory)

      const result = await chatService.processMessage('Latest message')

      // Should still succeed — compaction happens internally
      expect(result.conversationId).toBe('conv-1')
    })
  })

  // ─── saveAssistantMessage ─────────────────────────

  describe('saveAssistantMessage', () => {
    it('saves assistant message with agentType', async () => {
      mockPrisma.message.create.mockResolvedValue({})
      mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'conv-1', title: 'Existing' })

      await chatService.saveAssistantMessage('conv-1', 'Hello!', 'support')

      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Hello!',
          agentType: 'support',
        },
      })
    })

    it('auto-sets conversation title from first user message if not set', async () => {
      mockPrisma.message.create.mockResolvedValue({})
      mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'conv-1', title: null })
      mockPrisma.message.findFirst.mockResolvedValue({
        content: 'What is the status of my order?',
      })
      mockPrisma.conversation.update.mockResolvedValue({})

      await chatService.saveAssistantMessage('conv-1', 'Response', 'order')

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        data: { title: 'What is the status of my order?' },
      })
    })

    it('truncates long titles to 60 chars + ellipsis', async () => {
      mockPrisma.message.create.mockResolvedValue({})
      mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'conv-1', title: null })
      const longMessage = 'A'.repeat(100)
      mockPrisma.message.findFirst.mockResolvedValue({ content: longMessage })
      mockPrisma.conversation.update.mockResolvedValue({})

      await chatService.saveAssistantMessage('conv-1', 'Response', 'support')

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        data: { title: 'A'.repeat(60) + '...' },
      })
    })
  })

  // ─── listConversations ────────────────────────────

  describe('listConversations', () => {
    it('returns conversations ordered by createdAt desc', async () => {
      const mockConvs = [
        { id: 'c2', createdAt: new Date('2026-02-11'), messages: [] },
        { id: 'c1', createdAt: new Date('2026-02-10'), messages: [] },
      ]
      mockPrisma.conversation.findMany.mockResolvedValue(mockConvs)

      const result = await chatService.listConversations()

      expect(result).toEqual(mockConvs)
      expect(mockPrisma.conversation.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      })
    })
  })

  // ─── getConversation ──────────────────────────────

  describe('getConversation', () => {
    it('returns conversation with messages', async () => {
      const mockConv = { id: 'conv-1', messages: [{ content: 'Hi' }] }
      mockPrisma.conversation.findUnique.mockResolvedValue(mockConv)

      const result = await chatService.getConversation('conv-1')
      expect(result).toEqual(mockConv)
    })

    it('throws 404 when conversation not found', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(null)

      await expect(chatService.getConversation('bad-id')).rejects.toThrow(
        'Conversation not found'
      )
    })
  })

  // ─── deleteConversation ───────────────────────────

  describe('deleteConversation', () => {
    it('deletes an existing conversation', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'conv-1' })
      mockPrisma.conversation.delete.mockResolvedValue({})

      await chatService.deleteConversation('conv-1')

      expect(mockPrisma.conversation.delete).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
      })
    })

    it('throws 404 when conversation does not exist', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(null)

      await expect(chatService.deleteConversation('bad-id')).rejects.toThrow(
        'Conversation not found'
      )
    })
  })
})
