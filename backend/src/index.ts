import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { errorHandler } from './middlewares/errorHandler.js'
import api from './routes/index.js'

const app = new Hono()

// CORS — allow frontend dev server
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:4173'],
  allowHeaders: ['Content-Type'],
  exposeHeaders: ['X-Conversation-Id', 'X-Agent-Type'],
}))

// Global error handling middleware
app.use('*', errorHandler)

// Home route
app.get('/', (c) => {
  return c.text('🚀 Hono server is running!')
})

// --- API Routes ---
app.route('/api', api)

// Start server
serve({
  fetch: app.fetch,
  port: 3000
})

console.log('✅ Server running at http://localhost:3000')
