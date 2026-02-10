import { tool } from 'ai'
import { z } from 'zod'
import { answerFAQ, getConversationHistory } from '../tools/support.tools.js'
import type { AgentDefinition } from '../types/index.js'

// --- Agent Definition ---

export const supportAgentDef: AgentDefinition = {
  type: 'support',
  name: 'Support Agent',
  description: 'Handles general support inquiries, FAQs, and troubleshooting',
  systemPrompt: `You are a General Support Agent. You help customers with general inquiries, FAQs, and troubleshooting.
You can search FAQs and look up past conversation history to provide context-aware answers.
Always be polite, concise, and helpful. If you cannot answer the question, offer to escalate.
Use the tools available to you to find relevant information before responding.`,
}

// --- Agent Tools ---

export const supportAgentTools = {
  searchFAQ: tool({
    description: 'Search the FAQ knowledge base for an answer to a customer question',
    inputSchema: z.object({
      question: z.string().describe('The customer question or keyword to search for'),
    }),
    execute: async ({ question }) => {
      const answer = answerFAQ(question)
      return { answer }
    },
  }),

  getConversationHistory: tool({
    description: 'Retrieve the full message history of a conversation for context',
    inputSchema: z.object({
      conversationId: z.string().describe('The conversation ID to retrieve history for'),
    }),
    execute: async ({ conversationId }) => {
      const conversation = await getConversationHistory(conversationId)
      if (!conversation) return { found: false as const, message: 'Conversation not found.' }
      return {
        found: true as const,
        messageCount: conversation.messages.length,
        messages: conversation.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }
    },
  }),
}
