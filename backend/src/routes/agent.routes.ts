import { Hono } from 'hono'
import { getAllAgents, getAgentByType } from '../agents/router.agent.js'

const agentRoutes = new Hono()

// GET /api/agents — list all available agents
agentRoutes.get('/', (c) => {
  return c.json({ agents: getAllAgents() })
})

// GET /api/agents/:type/capabilities — get capabilities of a specific agent
agentRoutes.get('/:type/capabilities', (c) => {
  const type = c.req.param('type')
  const agent = getAgentByType(type)

  if (!agent) {
    return c.json({ error: `Agent type '${type}' not found` }, 404)
  }

  const { definition, tools } = agent

  // Extract tool names and descriptions for the capabilities response
  const capabilities = Object.entries(tools).map(([name, t]) => ({
    tool: name,
    description: (t as any).description ?? '',
  }))

  return c.json({
    type: definition.type,
    name: definition.name,
    description: definition.description,
    capabilities,
  })
})

export default agentRoutes
