import { useState, useEffect } from 'react'
import {
  listConversations,
  deleteConversation,
  listAgents,
  type Conversation,
  type Agent,
} from '../api/client'

interface Props {
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  refreshKey: number
  isOpen: boolean
  onToggle: () => void
}

export default function Sidebar({ activeId, onSelect, onNew, refreshKey, isOpen, onToggle }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [showAgents, setShowAgents] = useState(false)

  useEffect(() => {
    loadConversations()
    loadAgents()
  }, [refreshKey])

  async function loadConversations() {
    try {
      const convs = await listConversations()
      setConversations(convs)
    } catch {
      console.error('Failed to load conversations')
    }
  }

  async function loadAgents() {
    try {
      const a = await listAgents()
      setAgents(a)
    } catch {
      console.error('Failed to load agents')
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Delete this conversation?')) return
    try {
      await deleteConversation(id)
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (activeId === id) onNew()
    } catch {
      console.error('Failed to delete conversation')
    }
  }

  function getPreview(conv: Conversation): string {
    if (conv.title) return conv.title
    const firstMsg = conv.messages?.[0]
    if (firstMsg?.content) {
      return firstMsg.content.length > 40
        ? firstMsg.content.slice(0, 40) + '...'
        : firstMsg.content
    }
    return 'New conversation'
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHr = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHr < 24) return `${diffHr}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  const agentEmoji: Record<string, string> = {
    order: '📦',
    billing: '💳',
    support: '🔧',
  }

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <span className="brand-icon">🤖</span>
          {isOpen && <span className="brand-text">AI-Powered Customer Support System</span>}
        </div>
        <button className="sidebar-toggle" onClick={onToggle} title={isOpen ? 'Close sidebar' : 'Open sidebar'}>
          {isOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><polyline points="15 9 12 12 15 15"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><polyline points="13 9 16 12 13 15"/></svg>
          )}
        </button>
      </div>

      {/* New Chat Button */}
      <div className="sidebar-actions">
        <button className="new-chat-btn" onClick={onNew} title="New conversation">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {isOpen && <span>New Chat</span>}
        </button>
      </div>

      {isOpen && (
        <>
          {/* Conversation List */}
          <div className="sidebar-section">
            <div className="section-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span>Recent Chats</span>
              {conversations.length > 0 && <span className="count-badge">{conversations.length}</span>}
            </div>
            <div className="conversation-list">
              {conversations.length === 0 && (
                <p className="empty-text">No conversations yet. Start chatting!</p>
              )}
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`conversation-item ${activeId === conv.id ? 'active' : ''}`}
                  onClick={() => onSelect(conv.id)}
                >
                  <div className="conv-icon">💬</div>
                  <div className="conv-info">
                    <span className="conv-preview">{getPreview(conv)}</span>
                    <span className="conv-date">{formatDate(conv.createdAt)}</span>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={(e) => handleDelete(conv.id, e)}
                    title="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Agent Info */}
          <div className="sidebar-section sidebar-agents">
            <div
              className="section-label clickable"
              onClick={() => setShowAgents(!showAgents)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>Agents</span>
              <svg className={`chevron ${showAgents ? 'rotated' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            {showAgents && (
              <div className="agent-list">
                {agents.map((a) => (
                  <div key={a.type} className="agent-item">
                    <div className="agent-header">
                      <span className="agent-emoji">{agentEmoji[a.type] || '🤖'}</span>
                      <strong>{a.name}</strong>
                    </div>
                    <p>{a.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
