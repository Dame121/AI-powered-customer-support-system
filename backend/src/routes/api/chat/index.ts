import { Hono } from 'hono'
import prisma from '../../../lib/db.js'

const chat = new Hono()

// POST /api/chat/messages - Send a message (auto-creates conversation if no conversationId)
chat.post('/messages', async (c) => {
  const body = await c.req.json<{ conversationId?: string; role?: string; content?: string }>()

  if (!body.content?.trim()) {
    return c.json({ error: 'Content is required' }, 400)
  }

  const role = body.role?.trim() || 'user'
  if (!['user', 'assistant', 'agent'].includes(role)) {
    return c.json({ error: 'Role must be user, assistant, or agent' }, 400)
  }

  let conversationId = body.conversationId

  // If no conversationId provided, create a new conversation
  if (!conversationId) {
    const conversation = await prisma.conversation.create({ data: {} })
    conversationId = conversation.id
  } else {
    // Verify conversation exists
    const existing = await prisma.conversation.findUnique({ where: { id: conversationId } })
    if (!existing) {
      return c.json({ error: 'Conversation not found' }, 404)
    }
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      role,
      content: body.content.trim(),
    },
  })

  return c.json({ conversationId, message }, 201)
})

// GET /api/chat/conversations - List all conversations
chat.get('/conversations', async (c) => {
  const conversations = await prisma.conversation.findMany({
    orderBy: { createdAt: 'desc' },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
  return c.json({ conversations })
})

// GET /api/chat/conversations/:id - Get a conversation with messages
chat.get('/conversations/:id', async (c) => {
  const id = c.req.param('id')
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })

  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404)
  }

  return c.json({ conversation })
})

// DELETE /api/chat/conversations/:id - Delete a conversation and its messages
chat.delete('/conversations/:id', async (c) => {
  const id = c.req.param('id')

  const conversation = await prisma.conversation.findUnique({ where: { id } })
  if (!conversation) {
    return c.json({ error: 'Conversation not found' }, 404)
  }

  await prisma.conversation.delete({ where: { id } })
  return c.json({ message: 'Conversation deleted' })
})

export default chat
