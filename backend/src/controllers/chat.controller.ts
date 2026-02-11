import type { Context } from 'hono'
import { stream } from 'hono/streaming'
import { chatService } from '../services/chat.service.js'

/**
 * Chat controller — thin handlers that delegate to chatService.
 */
export const chatController = {
  /**
   * POST /api/chat/messages
   * Sends a user message, classifies intent, routes to sub-agent, and streams the AI response.
   * Includes a "thinking" phase prefix so the frontend can show agent routing status.
   */
  async sendMessage(c: Context) {
    const body = await c.req.json<{ conversationId?: string; content?: string }>()

    if (!body.content?.trim()) {
      return c.json({ error: 'Content is required' }, 400)
    }

    const content = body.content.trim()

    // Phase 1: Classify intent (this happens before streaming starts)
    const { conversationId, agentType, result } = await chatService.processMessage(
      content,
      body.conversationId
    )

    // Phase 2: Stream the response with a status prefix
    // We use Hono's streaming helper to prepend a routing status line,
    // then pipe the AI stream.
    c.header('X-Conversation-Id', conversationId)
    c.header('X-Agent-Type', agentType)
    c.header('Content-Type', 'text/plain; charset=utf-8')
    c.header('Transfer-Encoding', 'chunked')

    // Save assistant message to DB after stream finishes (non-blocking)
    result.text.then((fullText) => {
      chatService.saveAssistantMessage(conversationId, fullText, agentType).catch(console.error)
    })

    return stream(c, async (s) => {
      // Send routing status as a special prefix line
      await s.write(`__STATUS__:Routed to ${agentType} agent\n`)

      // Pipe AI stream
      const reader = result.textStream.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          await s.write(value)
        }
      } finally {
        reader.releaseLock()
      }
    })
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
