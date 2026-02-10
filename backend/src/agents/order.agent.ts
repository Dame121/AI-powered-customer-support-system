import { tool } from 'ai'
import { z } from 'zod'
import { getOrderDetails, checkDeliveryStatus, getTrackingInfo } from '../tools/order.tools.js'
import type { AgentDefinition } from '../types/index.js'

// --- Agent Definition ---

export const orderAgentDef: AgentDefinition = {
  type: 'order',
  name: 'Order Agent',
  description: 'Handles order status, tracking, and delivery inquiries',
  systemPrompt: `You are an Order Support Agent. You help customers with order-related inquiries.
You can ONLY look up orders, check delivery status, and provide tracking information.
You are READ-ONLY — you CANNOT modify, cancel, update, or change any order. If a customer asks to change, cancel, or update an order, politely tell them you cannot do that and suggest they contact a human agent.
Always be polite, concise, and helpful. If you cannot find an order, let the customer know.
Use the data provided in the tool results below to answer — do NOT make up data.`,
}

// --- Agent Tools ---

export const orderAgentTools = {
  getOrderDetails: tool({
    description: 'Look up an order by its ID and return full order details (status, tracking, etc.)',
    inputSchema: z.object({
      orderId: z.string().describe('The order ID to look up, e.g. ORD-1001'),
    }),
    execute: async ({ orderId }) => {
      const order = await getOrderDetails(orderId)
      if (!order) return { found: false as const, message: `Order ${orderId} not found.` }
      return { found: true as const, order }
    },
  }),

  checkDeliveryStatus: tool({
    description: 'Check the current delivery/shipping status of an order',
    inputSchema: z.object({
      orderId: z.string().describe('The order ID to check status for'),
    }),
    execute: async ({ orderId }) => {
      const status = await checkDeliveryStatus(orderId)
      if (!status) return { found: false as const, message: `Order ${orderId} not found.` }
      return { found: true as const, orderId, status }
    },
  }),

  getTrackingInfo: tool({
    description: 'Get the tracking number/information for a shipped order',
    inputSchema: z.object({
      orderId: z.string().describe('The order ID to get tracking info for'),
    }),
    execute: async ({ orderId }) => {
      const tracking = await getTrackingInfo(orderId)
      if (!tracking) return { found: false as const, message: `No tracking info found for order ${orderId}.` }
      return { found: true as const, orderId, tracking }
    },
  }),
}
