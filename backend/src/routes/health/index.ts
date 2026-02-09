import { Hono } from 'hono'
import prisma from '../../db/index.js'

const healthRoutes = new Hono()

// GET /api/health - System health check
healthRoutes.get('/', async (c) => {
  const status: {
    status: string
    uptime: number
    timestamp: string
    database: string
    error?: string
  } = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: 'disconnected',
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    status.database = 'connected'
  } catch (err) {
    status.status = 'degraded'
    status.database = 'disconnected'
    status.error = err instanceof Error ? err.message : 'Unknown database error'
  }

  const code = status.status === 'ok' ? 200 : 503
  return c.json(status, code)
})

export default healthRoutes
