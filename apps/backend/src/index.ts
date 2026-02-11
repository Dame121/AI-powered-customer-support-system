import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { errorHandler } from './middlewares/errorHandler.js'
import { rateLimiter } from './middlewares/rateLimiter.js'
import api, { type ApiType } from './routes/index.js'

const app = new Hono()

// CORS — allow frontend dev server
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173'],
  allowHeaders: ['Content-Type'],
  exposeHeaders: ['X-Conversation-Id', 'X-Agent-Type'],
}))

// Global error handling middleware
app.use('*', errorHandler)

// Rate limiting — 30 requests per minute per IP
app.use('/api/*', rateLimiter({ windowMs: 60_000, max: 30 }))

// Home route
app.get('/', (c) => {
  return c.text('🚀 Hono server is running!')
})

// --- API Routes ---
const appWithApi = app.route('/api', api)

// Export the full app type for Hono RPC client
export type AppType = typeof appWithApi

// Start server
serve({
  fetch: app.fetch,
  port: 3000
})

console.log('✅ Server running at http://localhost:3000')
