import { describe, it, expect } from 'vitest'
import { classifyIntent } from '../agents/router.agent.js'

// These tests cover the synchronous keyword-based classification paths
// (no LLM or DB calls needed for these cases)

describe('classifyIntent — keyword routing', () => {
  // --- Explicit ID-based routing ---

  it('routes to billing when message contains INV-XXXX', async () => {
    expect(await classifyIntent('Show me INV-2001')).toBe('billing')
  })

  it('routes to order when message contains ORD-XXXX', async () => {
    expect(await classifyIntent('What is the status of ORD-1001?')).toBe('order')
  })

  it('is case-insensitive for order IDs', async () => {
    expect(await classifyIntent('check ord-1002')).toBe('order')
  })

  it('is case-insensitive for invoice IDs', async () => {
    expect(await classifyIntent('details for inv-2003')).toBe('billing')
  })

  // --- Support keywords ---

  it('routes to support for password questions', async () => {
    expect(await classifyIntent('How do I reset my password?')).toBe('support')
  })

  it('routes to support for FAQ questions', async () => {
    expect(await classifyIntent('How do I return an item?')).toBe('support')
  })

  it('routes to support for troubleshooting', async () => {
    expect(await classifyIntent('I need help troubleshooting my account')).toBe('support')
  })

  it('routes to support for "how do/can/to" questions', async () => {
    expect(await classifyIntent('How can I track my package?')).toBe('support')
  })

  it('routes to support for return policy questions', async () => {
    expect(await classifyIntent('What is the return policy?')).toBe('support')
  })

  it('routes to support for "how long" questions', async () => {
    expect(await classifyIntent('How long does shipping take?')).toBe('support')
  })

  // --- Billing keywords ---

  it('routes to billing for invoice queries', async () => {
    expect(await classifyIntent('Show me my invoices')).toBe('billing')
  })

  it('routes to billing for payment queries', async () => {
    expect(await classifyIntent('My payment failed')).toBe('billing')
  })

  it('routes to billing for charge queries', async () => {
    expect(await classifyIntent('I see an unexpected charge')).toBe('billing')
  })

  it('routes to billing for subscription queries', async () => {
    expect(await classifyIntent('Cancel my subscription')).toBe('billing')
  })

  // --- Order keywords ---

  it('routes to order for tracking queries', async () => {
    expect(await classifyIntent('Where is my tracking number?')).toBe('order')
  })

  it('routes to order for delivery queries', async () => {
    expect(await classifyIntent('When will my delivery arrive?')).toBe('order')
  })

  it('routes to order for shipment queries', async () => {
    expect(await classifyIntent('Has my shipment been sent?')).toBe('order')
  })

  // --- Priority: ID match wins over keywords ---

  it('INV-ID takes priority over order keywords', async () => {
    expect(await classifyIntent('Check order INV-2001')).toBe('billing')
  })

  it('ORD-ID takes priority over billing keywords', async () => {
    expect(await classifyIntent('Payment for ORD-1001')).toBe('order')
  })
})
