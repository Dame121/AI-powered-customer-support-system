import type { ModelMessage } from 'ai'
import prisma from '../db/index.js'
import { classifyIntent, routeToAgent } from '../agents/router.agent.js'
import type { AgentType } from '../types/index.js'

/**
 * Chat service — handles all business logic for chat interactions.
 * Keeps route handlers thin (controller-service pattern).
 */
export const chatService = {
  /**
   * Process a new user message:
   * 1. Resolve or create a conversation
   * 2. Save the user message
   * 3. Load conversation history for context
   * 4. Classify intent → route to sub-agent
   * 5. Return the streaming result + metadata
   */
  async processMessage(content: string, conversationId?: string) {
    // 1. Resolve conversation
    let convId = conversationId
    if (!convId) {
      const conv = await prisma.conversation.create({ data: {} })
      convId = conv.id
    } else {
      const existing = await prisma.conversation.findUnique({ where: { id: convId } })
      if (!existing) throw Object.assign(new Error('Conversation not found'), { status: 404 })
    }

    // 2. Save user message
    await prisma.message.create({
      data: { conversationId: convId, role: 'user', content },
    })

    // 3. Load conversation history for context
    const history = await prisma.message.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: 'asc' },
    })

    const messages: ModelMessage[] = history.map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant' as const,
      content: m.content,
    }))

    // 4. Classify intent (pass conversationId for follow-up context)
    const agentType: AgentType = await classifyIntent(content, convId)

    // 5. Stream response from the delegated sub-agent
    const result = await routeToAgent(agentType, messages, convId)

    return { conversationId: convId, agentType, result }
  },

  /**
   * Save the final assistant response to DB after streaming completes.
   */
  async saveAssistantMessage(conversationId: string, content: string, agentType: AgentType) {
    // Save the assistant message with agentType
    await prisma.message.create({
      data: { conversationId, role: 'assistant', content, agentType },
    })

    // Auto-set conversation title from first user message if not set
    const conv = await prisma.conversation.findUnique({ where: { id: conversationId } })
    if (conv && !conv.title) {
      const firstMsg = await prisma.message.findFirst({
        where: { conversationId, role: 'user' },
        orderBy: { createdAt: 'asc' },
      })
      if (firstMsg) {
        const title = firstMsg.content.length > 60
          ? firstMsg.content.slice(0, 60) + '...'
          : firstMsg.content
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { title },
        })
      }
    }
  },

  /**
   * List all conversations with their messages.
   */
  async listConversations() {
    return prisma.conversation.findMany({
      orderBy: { createdAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
  },

  /**
   * Get a single conversation by ID.
   */
  async getConversation(id: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
    if (!conversation) throw Object.assign(new Error('Conversation not found'), { status: 404 })
    return conversation
  },

  /**
   * Delete a conversation and all its messages.
   */
  async deleteConversation(id: string) {
    const conversation = await prisma.conversation.findUnique({ where: { id } })
    if (!conversation) throw Object.assign(new Error('Conversation not found'), { status: 404 })
    await prisma.conversation.delete({ where: { id } })
  },
}
