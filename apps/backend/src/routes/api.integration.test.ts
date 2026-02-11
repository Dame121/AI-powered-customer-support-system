import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma before importing the app
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
    $queryRaw: vi.fn(),
  },
}))

// Mock the router agent to avoid LLM calls
vi.mock('../agents/router.agent.js', () => ({
  classifyIntent: vi.fn().mockResolvedValue('support'),
  routeToAgent: vi.fn().mockResolvedValue({
    text: Promise.resolve('Test response'),
    textStream: new ReadableStream({
      start(controller) {
        controller.enqueue('Test response')
        controller.close()
      },
    }),
  }),
  getAllAgents: vi.fn().mockReturnValue([
    { type: 'order', name: 'Order Agent', description: 'Handles orders' },
    { type: 'billing', name: 'Billing Agent', description: 'Handles billing' },
    { type: 'support', name: 'Support Agent', description: 'Handles support' },
  ]),
  getAgentByType: vi.fn().mockImplementation((type: string) => {
    const agents: Record<string, any> = {
      order: {
        definition: { type: 'order', name: 'Order Agent', description: 'Handles orders' },
        tools: { getOrderDetails: { description: 'Look up an order' } },
      },
      billing: {
        definition: { type: 'billing', name: 'Billing Agent', description: 'Handles billing' },
        tools: { getInvoiceDetails: { description: 'Look up an invoice' } },
      },
      support: {
        definition: { type: 'support', name: 'Support Agent', description: 'Handles support' },
        tools: { searchFAQ: { description: 'Search FAQs' } },
      },
    }
    return agents[type] || null
  }),
}))

import { Hono } from 'hono'
import healthRoutes from '../routes/health.routes.js'
import agentRoutes from '../routes/agent.routes.js'
import chatRoutes from '../routes/chat.routes.js'
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
  $queryRaw: ReturnType<typeof vi.fn>
}

// Build a test app with routes
const app = new Hono()
  .route('/api/health', healthRoutes)
  .route('/api/agents', agentRoutes)
  .route('/api/chat', chatRoutes)

describe('API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Health ─────────────────────────────────────────

  describe('GET /api/health', () => {
    it('returns ok status when DB is connected', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }])

      const res = await app.request('/api/health')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.status).toBe('ok')
      expect(body.database).toBe('connected')
      expect(body).toHaveProperty('uptime')
      expect(body).toHaveProperty('timestamp')
    })

    it('returns degraded status when DB is disconnected', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection refused'))

      const res = await app.request('/api/health')
      const body = await res.json()

      expect(res.status).toBe(503)
      expect(body.status).toBe('degraded')
      expect(body.database).toBe('disconnected')
      expect(body.error).toBe('Connection refused')
    })
  })

  // ─── Agents ─────────────────────────────────────────

  describe('GET /api/agents', () => {
    it('returns all registered agents', async () => {
      const res = await app.request('/api/agents')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.agents).toHaveLength(3)
      expect(body.agents.map((a: any) => a.type)).toEqual(['order', 'billing', 'support'])
    })
  })

  describe('GET /api/agents/:type/capabilities', () => {
    it('returns capabilities for a valid agent type', async () => {
      const res = await app.request('/api/agents/order/capabilities')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.type).toBe('order')
      expect(body.name).toBe('Order Agent')
      expect(body.capabilities).toBeInstanceOf(Array)
      expect(body.capabilities.length).toBeGreaterThan(0)
    })

    it('returns 404 for an invalid agent type', async () => {
      const res = await app.request('/api/agents/unknown/capabilities')
      const body = await res.json()

      expect(res.status).toBe(404)
      expect(body.error).toContain('not found')
    })
  })

  // ─── Chat — Conversations ──────────────────────────

  describe('GET /api/chat/conversations', () => {
    it('returns a list of conversations', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([
        { id: 'c1', title: 'Test', messages: [] },
      ])

      const res = await app.request('/api/chat/conversations')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.conversations).toHaveLength(1)
    })
  })

  describe('GET /api/chat/conversations/:id', () => {
    it('returns a conversation by ID', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        title: 'Chat',
        messages: [{ role: 'user', content: 'Hi' }],
      })

      const res = await app.request('/api/chat/conversations/conv-1')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.conversation.id).toBe('conv-1')
    })

    it('returns error when conversation not found', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(null)

      const res = await app.request('/api/chat/conversations/bad-id')

      // The chatService throws — Hono surfaces it as a server error
      expect([404, 500]).toContain(res.status)
    })
  })

  describe('DELETE /api/chat/conversations/:id', () => {
    it('deletes a conversation', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue({ id: 'conv-1' })
      mockPrisma.conversation.delete.mockResolvedValue({})

      const res = await app.request('/api/chat/conversations/conv-1', {
        method: 'DELETE',
      })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.message).toBe('Conversation deleted')
    })
  })

  // ─── Chat — Messages ───────────────────────────────

  describe('POST /api/chat/messages', () => {
    it('returns 400 when content is empty', async () => {
      const res = await app.request('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '' }),
      })
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toBe('Content is required')
    })

    it('returns 400 when content is missing', async () => {
      const res = await app.request('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toBe('Content is required')
    })

    it('streams a response for a valid message', async () => {
      mockPrisma.conversation.create.mockResolvedValue({ id: 'conv-new' })
      mockPrisma.message.create.mockResolvedValue({})
      mockPrisma.message.findMany.mockResolvedValue([
        { role: 'user', content: 'Hello' },
      ])

      const res = await app.request('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Hello' }),
      })

      expect(res.status).toBe(200)
      expect(res.headers.get('X-Conversation-Id')).toBe('conv-new')
      expect(res.headers.get('X-Agent-Type')).toBe('support')

      // Read the streamed body
      const text = await res.text()
      expect(text).toContain('__STATUS__:')
    })
  })
})
