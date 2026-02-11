import { hc } from 'hono/client'
import type { AppType } from 'backend'

// ─── Hono RPC Client (type-safe) ─────────────────────────

const client = hc<AppType>('http://localhost:3000')

// ─── Types ───────────────────────────────────────────────

export interface Conversation {
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
  messages: Message[]
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  agentType: string | null
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

// ─── Health (RPC) ────────────────────────────────────────

export async function checkHealth(): Promise<{ status: string }> {
  const res = await client.api.health.$get()
  return res.json() as Promise<{ status: string }>
}

// ─── Chat (streaming — raw fetch for ReadableStream) ─────

export interface SendMessageResult {
  conversationId: string
  agentType: string
  reader: ReadableStreamDefaultReader<Uint8Array>
}

/**
 * Send a message and get a streaming readable response.
 * Streaming uses raw fetch because Hono RPC does not proxy ReadableStream.
 */
export async function sendMessage(
  content: string,
  conversationId?: string
): Promise<SendMessageResult> {
  // Use RPC URL but raw fetch for streaming body
  const res = await fetch(client.api.chat.messages.$url().toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, conversationId }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`)
  }

  const convId = res.headers.get('X-Conversation-Id') || ''
  const agentType = res.headers.get('X-Agent-Type') || 'support'
  const reader = res.body!.getReader()

  return { conversationId: convId, agentType, reader }
}

// ─── Conversations (RPC) ─────────────────────────────────

export async function listConversations(): Promise<Conversation[]> {
  const res = await client.api.chat.conversations.$get()
  const data: any = await res.json()
  return data.conversations
}

export async function getConversation(id: string): Promise<Conversation> {
  const res = await client.api.chat.conversations[':id'].$get({ param: { id } })
  const data: any = await res.json()
  return data.conversation
}

export async function deleteConversation(id: string): Promise<void> {
  await client.api.chat.conversations[':id'].$delete({ param: { id } })
}

// ─── Agents (RPC) ────────────────────────────────────────

export async function listAgents(): Promise<Agent[]> {
  const res = await client.api.agents.$get()
  const data: any = await res.json()
  return data.agents
}

export async function getAgentCapabilities(type: string): Promise<AgentCapabilities> {
  const res = await client.api.agents[':type'].capabilities.$get({ param: { type } })
  return res.json() as Promise<AgentCapabilities>
}
