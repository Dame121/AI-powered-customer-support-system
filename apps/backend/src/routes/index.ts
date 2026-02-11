import { Hono } from 'hono'
import chatRoutes from './chat.routes.js'
import agentRoutes from './agent.routes.js'
import healthRoutes from './health.routes.js'

// Chained route definition for Hono RPC type inference
const api = new Hono()
  .route('/chat', chatRoutes)
  .route('/agents', agentRoutes)
  .route('/health', healthRoutes)

export type ApiType = typeof api
export default api
