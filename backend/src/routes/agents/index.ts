import { Hono } from 'hono'

const agentRoutes = new Hono()

// Agent definitions — your AI agents and what they can do
const agentList = [
  {
    type: 'order',
    name: 'Order Agent',
    description: 'Handles order lookups, status checks, and tracking info',
    capabilities: [
      { action: 'lookupOrder', description: 'Look up an order by ID', params: ['orderId'] },
      { action: 'getOrderStatus', description: 'Get current order status', params: ['orderId'] },
      { action: 'getTracking', description: 'Get tracking information', params: ['orderId'] },
    ],
  },
  {
    type: 'invoice',
    name: 'Invoice Agent',
    description: 'Handles invoice lookups, payment status, and billing questions',
    capabilities: [
      { action: 'lookupInvoice', description: 'Look up an invoice by ID', params: ['invoiceId'] },
      { action: 'getPaymentStatus', description: 'Check payment status', params: ['invoiceId'] },
      { action: 'listInvoices', description: 'List all invoices for a customer', params: [] },
    ],
  },
  {
    type: 'support',
    name: 'Support Agent',
    description: 'Handles general customer support and FAQ',
    capabilities: [
      { action: 'answerFAQ', description: 'Answer frequently asked questions', params: ['question'] },
      { action: 'escalate', description: 'Escalate to a human agent', params: ['reason'] },
    ],
  },
]

// GET /api/agents - List all available agents
agentRoutes.get('/', (c) => {
  const summary = agentList.map(({ type, name, description }) => ({ type, name, description }))
  return c.json({ agents: summary })
})

// GET /api/agents/:type/capabilities - Get capabilities of a specific agent
agentRoutes.get('/:type/capabilities', (c) => {
  const type = c.req.param('type')
  const agent = agentList.find((a) => a.type === type)

  if (!agent) {
    return c.json({ error: `Agent type '${type}' not found` }, 404)
  }

  return c.json({
    type: agent.type,
    name: agent.name,
    description: agent.description,
    capabilities: agent.capabilities,
  })
})

export default agentRoutes
