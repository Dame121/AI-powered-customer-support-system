import { Hono } from 'hono'
import { chatController } from '../controllers/chat.controller.js'

const chatRoutes = new Hono()

// POST /api/chat/messages — send message, AI streams back a response
chatRoutes.post('/messages', chatController.sendMessage)

// GET /api/chat/conversations — list all conversations
chatRoutes.get('/conversations', chatController.listConversations)

// GET /api/chat/conversations/:id — get a conversation with messages
chatRoutes.get('/conversations/:id', chatController.getConversation)

// DELETE /api/chat/conversations/:id — delete a conversation
chatRoutes.delete('/conversations/:id', chatController.deleteConversation)

export default chatRoutes
