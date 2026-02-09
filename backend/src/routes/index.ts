import { Hono } from 'hono'
import chatRoutes from './chat/index.js'
import agentRoutes from './agents/index.js'
import healthRoutes from './health/index.js'


const api = new Hono()

// /api/chat
api.route('/chat', chatRoutes)

// /api/agents
api.route('/agents', agentRoutes)

// /api/health
api.route('/health', healthRoutes)



export default api
