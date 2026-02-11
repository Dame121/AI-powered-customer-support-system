import { describe, it, expect } from 'vitest'
import type { AgentType } from '../types/index.js'

describe('AgentType', () => {
  it('accepts valid agent types', () => {
    const validTypes: AgentType[] = ['support', 'order', 'billing']
    expect(validTypes).toHaveLength(3)
  })
})

describe('Agent Definitions', () => {
  it('order agent has correct structure', async () => {
    const { orderAgentDef } = await import('../agents/order.agent.js')
    expect(orderAgentDef.type).toBe('order')
    expect(orderAgentDef.name).toBe('Order Agent')
    expect(orderAgentDef.systemPrompt).toContain('Order Support Agent')
    expect(orderAgentDef.systemPrompt).toContain('READ-ONLY')
  })

  it('billing agent has correct structure', async () => {
    const { billingAgentDef } = await import('../agents/billing.agent.js')
    expect(billingAgentDef.type).toBe('billing')
    expect(billingAgentDef.name).toBe('Billing Agent')
    expect(billingAgentDef.systemPrompt).toContain('Billing Support Agent')
    expect(billingAgentDef.systemPrompt).toContain('READ-ONLY')
  })

  it('support agent has correct structure', async () => {
    const { supportAgentDef } = await import('../agents/support.agent.js')
    expect(supportAgentDef.type).toBe('support')
    expect(supportAgentDef.name).toBe('Support Agent')
    expect(supportAgentDef.systemPrompt).toContain('General Support Agent')
  })

  it('order agent tools are defined', async () => {
    const { orderAgentTools } = await import('../agents/order.agent.js')
    expect(orderAgentTools).toHaveProperty('getOrderDetails')
    expect(orderAgentTools).toHaveProperty('checkDeliveryStatus')
    expect(orderAgentTools).toHaveProperty('getTrackingInfo')
  })

  it('billing agent tools are defined', async () => {
    const { billingAgentTools } = await import('../agents/billing.agent.js')
    expect(billingAgentTools).toHaveProperty('getInvoiceDetails')
    expect(billingAgentTools).toHaveProperty('checkPaymentStatus')
    expect(billingAgentTools).toHaveProperty('checkRefundStatus')
    expect(billingAgentTools).toHaveProperty('listAllInvoices')
  })

  it('support agent tools are defined', async () => {
    const { supportAgentTools } = await import('../agents/support.agent.js')
    expect(supportAgentTools).toHaveProperty('searchFAQ')
    expect(supportAgentTools).toHaveProperty('getConversationHistory')
  })
})
