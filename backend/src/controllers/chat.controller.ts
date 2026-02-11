import type { Context } from 'hono'
import { chatService } from '../services/chat.service.js'

/**
 * Chat controller — thin handlers that delegate to chatService.
 */
export const chatController = {
  /**
   * POST /api/chat/messages
   * Sends a user message, classifies intent, routes to sub-agent, and streams the AI response.
   */
  async sendMessage(c: Context) {
    const body = await c.req.json<{ conversationId?: string; content?: string }>()

    if (!body.content?.trim()) {
      return c.json({ error: 'Content is required' }, 400)
    }

    const { conversationId, agentType, result } = await chatService.processMessage(
      body.content.trim(),
      body.conversationId
    )

    // Stream the response using Vercel AI SDK's data stream
    const response = result.toTextStreamResponse({
      headers: {
        'X-Conversation-Id': conversationId,
        'X-Agent-Type': agentType,
      },
    })

    // Save assistant message to DB after stream finishes (non-blocking)
    result.text.then((fullText) => {
      chatService.saveAssistantMessage(conversationId, fullText, agentType).catch(console.error)
    })

    return response
  },

  /**
   * GET /api/chat/conversations
   */
  async listConversations(c: Context) {
    const conversations = await chatService.listConversations()
    return c.json({ conversations })
  },

  /**
   * GET /api/chat/conversations/:id
   */
  async getConversation(c: Context) {
    const id = c.req.param('id')
    const conversation = await chatService.getConversation(id)
    return c.json({ conversation })
  },

  /**
   * DELETE /api/chat/conversations/:id
   */
  async deleteConversation(c: Context) {
    const id = c.req.param('id')
    await chatService.deleteConversation(id)
    return c.json({ message: 'Conversation deleted' })
  },
}
