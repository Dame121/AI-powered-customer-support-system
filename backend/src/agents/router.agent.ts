import { streamText, generateText, type ModelMessage } from 'ai'
import { groq } from '@ai-sdk/groq'
import { orderAgentDef, orderAgentTools } from './order.agent.js'
import { billingAgentDef, billingAgentTools } from './billing.agent.js'
import { supportAgentDef, supportAgentTools } from './support.agent.js'
import { getOrderDetails, checkDeliveryStatus, getTrackingInfo } from '../tools/order.tools.js'
import { getInvoiceDetails, checkPaymentStatus, listInvoices } from '../tools/billing.tools.js'
import { answerFAQ, getConversationHistory } from '../tools/support.tools.js'
import type { AgentType, AgentDefinition } from '../types/index.js'

// --- Agent Registry ---

const agentRegistry: Record<AgentType, { definition: AgentDefinition; tools: Record<string, any> }> = {
  order: { definition: orderAgentDef, tools: orderAgentTools },
  billing: { definition: billingAgentDef, tools: billingAgentTools },
  support: { definition: supportAgentDef, tools: supportAgentTools },
}

// --- Intent Classification ---

const ROUTER_SYSTEM_PROMPT = `You are an intelligent customer support router. Your ONLY job is to classify the customer's intent and respond with exactly one word:
- "order" — if the query is about orders, shipping, delivery, tracking, order status, cancellations, or modifications
- "billing" — if the query is about payments, invoices, refunds, charges, subscriptions, or billing issues
- "support" — if the query is about general help, FAQs, troubleshooting, account issues, or anything else

Respond with ONLY the single word: order, billing, or support. Nothing else.`

/**
 * Classifies a user message into one of the agent types.
 */
export async function classifyIntent(message: string): Promise<AgentType> {
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

  if (agentType === 'order') {
    for (const id of orderIds) {
      const order = await getOrderDetails(id)
      if (order) {
        contextParts.push(`[Tool Result] Order ${id}: status="${order.status}", tracking="${order.tracking}"`)
      } else {
        contextParts.push(`[Tool Result] Order ${id}: not found in the system.`)
      }
    }
    if (orderIds.length === 0) {
      contextParts.push('[Tool Result] No specific order ID was mentioned by the customer. Ask them for their order ID (format: ORD-XXXX).')
    }
  }

  if (agentType === 'billing') {
    for (const id of invoiceIds) {
      const invoice = await getInvoiceDetails(id)
      if (invoice) {
        contextParts.push(`[Tool Result] Invoice ${id}: amount=$${invoice.amount}, status="${invoice.status}"`)
      } else {
        contextParts.push(`[Tool Result] Invoice ${id}: not found in the system.`)
      }
    }
    if (invoiceIds.length === 0) {
      // If no specific invoice, list all
      const allInvoices = await listInvoices()
      contextParts.push(`[Tool Result] All invoices: ${JSON.stringify(allInvoices)}`)
    }
  }

  if (agentType === 'support') {
    const faqAnswer = answerFAQ(message)
    contextParts.push(`[Tool Result] FAQ lookup: "${faqAnswer}"`)

    // Also pull conversation history for context if we have a conversationId
    if (conversationId) {
      const history = await getConversationHistory(conversationId)
      if (history && history.messages.length > 0) {
        const summary = history.messages
          .map((m) => `${m.role}: ${m.content}`)
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
