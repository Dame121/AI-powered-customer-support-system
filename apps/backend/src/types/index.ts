// --- Agent Types ---

export type AgentType = 'support' | 'order' | 'billing'

export interface AgentDefinition {
  type: AgentType
  name: string
  description: string
  systemPrompt: string
}

// --- Chat Types ---

export interface SendMessageBody {
  conversationId?: string
  content: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'agent'
  content: string
}

// --- API Response Types ---

export interface ApiError {
  error: string
  details?: string
}
