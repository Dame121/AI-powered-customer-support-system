import { Hono } from 'hono'

const chat = new Hono()

// In-memory chat store
interface ChatMessage {
  id: number
  user: string
  message: string
  timestamp: string
}

let messages: ChatMessage[] = []
let nextId = 1

// GET /api/chat - Get all chat messages
chat.get('/', (c) => {
  return c.json({ messages })
})

// POST /api/chat - Send a new chat message
chat.post('/', async (c) => {
  const body = await c.req.json<{ user?: string; message?: string }>()

  if (!body.message || !body.message.trim()) {
    return c.json({ error: 'Message is required' }, 400)
  }

  const newMessage: ChatMessage = {
    id: nextId++,
    user: body.user?.trim() || 'Anonymous',
    message: body.message.trim(),
    timestamp: new Date().toISOString(),
  }

  messages.push(newMessage)

  return c.json({ message: newMessage }, 201)
})

// GET /api/chat/:id - Get a specific message
chat.get('/:id', (c) => {
  const id = Number(c.req.param('id'))
  const msg = messages.find((m) => m.id === id)

  if (!msg) {
    return c.json({ error: 'Message not found' }, 404)
  }

  return c.json({ message: msg })
})

// DELETE /api/chat - Clear all messages
chat.delete('/', (c) => {
  messages = []
  nextId = 1
  return c.json({ message: 'All messages cleared' })
})

export default chat
