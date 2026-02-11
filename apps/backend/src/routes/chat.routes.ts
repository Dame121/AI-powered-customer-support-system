import { Hono } from 'hono'
import { chatController } from '../controllers/chat.controller.js'

// Chained route definition for Hono RPC type inference
const chatRoutes = new Hono()
  // POST /api/chat/messages — send message, AI streams back a response
  .post('/messages', chatController.sendMessage)
  // GET /api/chat/conversations — list all conversations
  .get('/conversations', chatController.listConversations)
  // GET /api/chat/conversations/:id — get a conversation with messages
  .get('/conversations/:id', chatController.getConversation)
  // DELETE /api/chat/conversations/:id — delete a conversation
  .delete('/conversations/:id', chatController.deleteConversation)

export default chatRoutes
