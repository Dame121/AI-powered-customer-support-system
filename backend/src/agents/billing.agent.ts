import { tool } from 'ai'
import { z } from 'zod'
import { getInvoiceDetails, checkPaymentStatus, listInvoices } from '../tools/billing.tools.js'
import type { AgentDefinition } from '../types/index.js'

// --- Agent Definition ---

export const billingAgentDef: AgentDefinition = {
  type: 'billing',
  name: 'Billing Agent',
  description: 'Handles invoice lookups, payment status, and billing inquiries',
  systemPrompt: `You are a Billing Support Agent. You help customers with billing and payment inquiries.
You can ONLY look up invoices, check payment status, and list invoices.
You are READ-ONLY — you CANNOT process payments, issue refunds, modify invoices, or change any billing data. If a customer asks to make a payment or get a refund, politely tell them you cannot do that and suggest they contact a human agent.
Always be polite, concise, and helpful. If you cannot find an invoice, let the customer know.
Use the data provided in the tool results below to answer — do NOT make up data.`,
}

// --- Agent Tools ---

export const billingAgentTools = {
  getInvoiceDetails: tool({
    description: 'Look up an invoice by its ID and return full details (amount, status, etc.)',
    inputSchema: z.object({
      invoiceId: z.string().describe('The invoice ID to look up, e.g. INV-2001'),
    }),
    execute: async ({ invoiceId }) => {
      const invoice = await getInvoiceDetails(invoiceId)
      if (!invoice) return { found: false as const, message: `Invoice ${invoiceId} not found.` }
      return { found: true as const, invoice }
    },
  }),

  checkPaymentStatus: tool({
    description: 'Check the payment status of a specific invoice',
    inputSchema: z.object({
      invoiceId: z.string().describe('The invoice ID to check payment status for'),
    }),
    execute: async ({ invoiceId }) => {
      const status = await checkPaymentStatus(invoiceId)
      if (!status) return { found: false as const, message: `Invoice ${invoiceId} not found.` }
      return { found: true as const, invoiceId, status }
    },
  }),

  listAllInvoices: tool({
    description: 'List all invoices in the system',
    inputSchema: z.object({}),
    execute: async () => {
      const invoices = await listInvoices()
      return { invoices, count: invoices.length }
    },
  }),
}
