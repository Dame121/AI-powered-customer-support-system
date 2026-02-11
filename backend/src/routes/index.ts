import { Hono } from 'hono'
import chatRoutes from './chat.routes.js'
import agentRoutes from './agent.routes.js'
import healthRoutes from './health.routes.js'

const api = new Hono()

// /api/chat
api.route('/chat', chatRoutes)

// /api/agents
api.route('/agents', agentRoutes)

// /api/health
api.route('/health', healthRoutes)

export default api
