import 'dotenv/config'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { errorHandler } from './middlewares/errorHandler.js'
import api from './routes/index.js'

const app = new Hono()

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
