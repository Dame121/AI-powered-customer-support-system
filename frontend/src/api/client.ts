const API_BASE = 'http://localhost:3000/api'

// ─── Types ───────────────────────────────────────────────

export interface Conversation {
  id: string
  createdAt: string
  updatedAt: string
  messages: Message[]
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  conversationId: string
}

export interface Agent {
  type: string
  name: string
  description: string
}

export interface AgentCapability {
  tool: string
  description: string
}

export interface AgentCapabilities {
  type: string
  name: string
  description: string
  capabilities: AgentCapability[]
}

// ─── Health ──────────────────────────────────────────────

export async function checkHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/health`)
  return res.json()
}

// ─── Chat ────────────────────────────────────────────────

export interface SendMessageResult {
  conversationId: string
  agentType: string
  reader: ReadableStreamDefaultReader<Uint8Array>
}

/**
 * Send a message and get a streaming readable response.
 * Returns the conversationId, agentType, and a reader for streaming text.
 */
export async function sendMessage(
  content: string,
  conversationId?: string
): Promise<SendMessageResult> {
  const res = await fetch(`${API_BASE}/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, conversationId }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  const convId = res.headers.get('X-Conversation-Id') || ''
  const agentType = res.headers.get('X-Agent-Type') || 'support'
  const reader = res.body!.getReader()

  return { conversationId: convId, agentType, reader }
}

// ─── Conversations ───────────────────────────────────────

export async function listConversations(): Promise<Conversation[]> {
  const res = await fetch(`${API_BASE}/chat/conversations`)
  const data = await res.json()
  return data.conversations
}

export async function getConversation(id: string): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/chat/conversations/${id}`)
  const data = await res.json()
  return data.conversation
}

export async function deleteConversation(id: string): Promise<void> {
  await fetch(`${API_BASE}/chat/conversations/${id}`, { method: 'DELETE' })
}

// ─── Agents ──────────────────────────────────────────────

export async function listAgents(): Promise<Agent[]> {
  const res = await fetch(`${API_BASE}/agents`)
  const data = await res.json()
  return data.agents
}

export async function getAgentCapabilities(type: string): Promise<AgentCapabilities> {
  const res = await fetch(`${API_BASE}/agents/${type}/capabilities`)
  return res.json()
}
