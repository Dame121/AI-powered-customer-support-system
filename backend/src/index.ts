import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import chat from './routes/api/chat/index.js'
import agents from './routes/api/agents/index.js'
import health from './routes/api/health/index.js'

const app = new Hono()

// Home route
app.get('/', (c) => {
  return c.text('🚀 Hono server is running!')
})

// --- API Routes ---
app.route('/api/chat', chat)
app.route('/api/agents', agents)
app.route('/api/health', health)

// Start server
serve({
  fetch: app.fetch,
  port: 3000
})

console.log('✅ Server running at http://localhost:3000')
