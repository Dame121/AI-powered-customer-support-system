import { streamText, generateText, type ModelMessage } from 'ai'
import { groq } from '@ai-sdk/groq'
import { orderAgentDef, orderAgentTools } from './order.agent.js'
import { billingAgentDef, billingAgentTools } from './billing.agent.js'
import { supportAgentDef, supportAgentTools } from './support.agent.js'
import { getOrderDetails, checkDeliveryStatus, getTrackingInfo, listOrders } from '../tools/order.tools.js'
import { getInvoiceDetails, checkPaymentStatus, checkRefundStatus, listInvoices } from '../tools/billing.tools.js'
import { answerFAQ, getConversationHistory } from '../tools/support.tools.js'
import prisma from '../db/index.js'
import type { AgentType, AgentDefinition } from '../types/index.js'

// --- Agent Registry ---

const agentRegistry: Record<AgentType, { definition: AgentDefinition; tools: Record<string, any> }> = {
  order: { definition: orderAgentDef, tools: orderAgentTools },
  billing: { definition: billingAgentDef, tools: billingAgentTools },
  support: { definition: supportAgentDef, tools: supportAgentTools },
}

// --- Intent Classification ---

const ROUTER_SYSTEM_PROMPT = `You are an intelligent customer support router. Your ONLY job is to classify the customer's intent and respond with exactly one word.

Rules:
- Reply "order" if the query is about orders, shipping, delivery, tracking, order status, cancellations, modifications, or mentions an order ID like ORD-XXXX.
- Reply "billing" if the query is about payments, invoices, refunds, charges, subscriptions, billing issues, or mentions an invoice ID like INV-XXXX.
- Reply "support" if the query is about general help, FAQs, troubleshooting, account issues, password reset, or anything else.

IMPORTANT: If the message mentions "invoice" or "INV-", ALWAYS reply "billing". If the message mentions "order" or "ORD-", ALWAYS reply "order".

Respond with ONLY one word: order, billing, or support. Nothing else.`

/**
 * Classifies a user message into one of the agent types.
 */
export async function classifyIntent(message: string, conversationId?: string): Promise<AgentType> {
  // Quick keyword-based pre-check for reliability
  const lower = message.toLowerCase()

  // 1. Explicit ID mentions always win (highest priority)
  if (/\binv-\d+/i.test(message)) return 'billing'
  if (/\bord-\d+/i.test(message)) return 'order'

  // 2. Support keywords — general help, FAQ-type questions, account issues
  if (/\bpassword\b/.test(lower) || /\breset\b/.test(lower) || /\btroubleshoot/.test(lower) || /\bfaq\b/.test(lower) || /\baccount\s*(issue|problem|help|lock|access)/i.test(lower) || /\bhow\s+(do|can|to)\b/.test(lower) || /\bhelp\s+(with|me)\b/.test(lower) || /\breturn\s?policy\b/.test(lower) || /\bhow\s+long\b/.test(lower)) return 'support'

  // 3. Billing keywords — specific invoice/payment actions
  if (/\binvoices?\b/.test(lower) || /\bpayment\b/.test(lower) || /\bcharge\b/.test(lower) || /\bbilling\b/.test(lower) || /\bsubscription\b/.test(lower)) return 'billing'

  // 4. Order keywords
  if (/\borders?\b/.test(lower) || /\btracking\b/.test(lower) || /\bshipment\b/.test(lower) || /\bdelivery\b/.test(lower) || /\bshipping\b/.test(lower)) return 'order'

  // For ambiguous follow-ups ("yes please", "ok", "tell me more"), check conversation history
  // to reuse the previous agent's context
  if (conversationId && lower.length < 40) {
    const lastAgentMsg = await prisma.message.findFirst({
      where: { conversationId, role: 'assistant' },
      orderBy: { createdAt: 'desc' },
    })
    if (lastAgentMsg) {
      // Check what the previous assistant response was about
      const prevContent = lastAgentMsg.content.toLowerCase()
      if (/invoice|billing|payment|amount/.test(prevContent)) return 'billing'
      if (/order|tracking|shipped|delivery/.test(prevContent)) return 'order'
    }
  }

  const { text } = await generateText({
    model: groq('llama-3.3-70b-versatile'),
    system: ROUTER_SYSTEM_PROMPT,
    prompt: message,
    maxOutputTokens: 10,
  })

  const classification = text.trim().toLowerCase() as AgentType

  if (classification in agentRegistry) {
    return classification
  }

  // Fallback to support for unclassified queries
  return 'support'
}

// --- Delegated Streaming ---

/**
 * Extract IDs from user message (e.g. ORD-1001, INV-2001)
 */
function extractIds(message: string): { orderIds: string[]; invoiceIds: string[] } {
  const orderIds = [...message.matchAll(/ORD-\d+/gi)].map((m) => m[0].toUpperCase())
  const invoiceIds = [...message.matchAll(/INV-\d+/gi)].map((m) => m[0].toUpperCase())
  return { orderIds, invoiceIds }
}

/**
 * Gather relevant data from tools based on the agent type and user message.
 * Returns a context string to inject into the LLM prompt.
 */
async function gatherToolContext(agentType: AgentType, message: string, conversationId?: string): Promise<string> {
  const { orderIds, invoiceIds } = extractIds(message)
  const contextParts: string[] = []

  // Always gather order data if order IDs are present (regardless of agent type)
  if (orderIds.length > 0) {
    for (const id of orderIds) {
      const order = await getOrderDetails(id)
      if (order) {
        const items = JSON.parse(order.items)
        const itemList = items.map((i: any) => `${i.name} x${i.quantity} ($${i.price})`).join(', ')
        contextParts.push(
          `[Tool Result] Order ${id}: customer="${order.customerName}", email="${order.customerEmail}", status="${order.status}", tracking="${order.tracking || 'N/A'}", items=[${itemList}], total=$${order.total}, ordered=${order.createdAt.toISOString().split('T')[0]}, delivery=${order.deliveryDate ? order.deliveryDate.toISOString().split('T')[0] : 'TBD'}`
        )
      } else {
        contextParts.push(`[Tool Result] Order ${id}: not found in the system.`)
      }
    }
  } else if (agentType === 'order') {
    const allOrders = await listOrders()
    const formatted = allOrders.map((o: any) => `- ${o.id}: customer="${o.customerName}", status="${o.status}", total=$${o.total}`).join('\n')
    contextParts.push(`[Tool Result] No specific order ID was mentioned. Available orders:\n${formatted}`)
  }

  // Always gather invoice data if invoice IDs are present (regardless of agent type)
  if (invoiceIds.length > 0) {
    for (const id of invoiceIds) {
      const invoice = await getInvoiceDetails(id)
      if (invoice) {
        contextParts.push(
          `[Tool Result] Invoice ${id}: customer="${invoice.customerName}", amount=$${invoice.amount}, status="${invoice.status}", description="${invoice.description}", created=${invoice.createdAt.toISOString().split('T')[0]}, due=${invoice.dueDate.toISOString().split('T')[0]}`
        )
      } else {
        contextParts.push(`[Tool Result] Invoice ${id}: not found in the system.`)
      }
    }
  } else if (agentType === 'billing') {
    // If no specific invoice, list all with full details
    const allInvoices = await listInvoices()
    const formatted = allInvoices.map((inv: any) => `- ${inv.id}: customer="${inv.customerName}", amount=$${inv.amount}, status="${inv.status}", due=${inv.dueDate.toISOString().split('T')[0]}`).join('\n')
    contextParts.push(`[Tool Result] All invoices in the system:\n${formatted}`)
  }

  if (agentType === 'support') {
    const faqAnswer = answerFAQ(message)
    contextParts.push(`[Tool Result] FAQ lookup: "${faqAnswer}"`)

    // Also pull conversation history for context if we have a conversationId
    if (conversationId) {
      const history = await getConversationHistory(conversationId)
      if (history && history.messages.length > 0) {
        const summary = history.messages
          .map((m: any) => `${m.role}: ${m.content}`)
          .join('\n')
        contextParts.push(`[Tool Result] Conversation history:\n${summary}`)
      }
    }
  }

  return contextParts.length > 0 ? '\n\n--- Data from tools ---\n' + contextParts.join('\n') : ''
}

/**
 * Routes the user's message to the appropriate sub-agent and returns a streaming response.
 * Gathers tool data first, then passes it as context (no LLM tool calling needed).
 */
export async function routeToAgent(agentType: AgentType, messages: ModelMessage[], conversationId?: string) {
  const agent = agentRegistry[agentType]
  const lastMessage = messages[messages.length - 1]
  const userMessage = typeof lastMessage.content === 'string' ? lastMessage.content : ''

  // Gather tool data and add to the system prompt
  const toolContext = await gatherToolContext(agentType, userMessage, conversationId)
  const enrichedSystem = agent.definition.systemPrompt + toolContext

  return streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: enrichedSystem,
    messages,
  })
}

/**
 * Returns all registered agent definitions (for the /agents endpoint).
 */
export function getAllAgents() {
  return Object.values(agentRegistry).map(({ definition }) => ({
    type: definition.type,
    name: definition.name,
    description: definition.description,
  }))
}

/**
 * Returns a specific agent definition by type.
 */
export function getAgentByType(type: string) {
  if (type in agentRegistry) {
    return agentRegistry[type as AgentType]
  }
  return null
}
