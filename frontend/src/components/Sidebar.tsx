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
}

export default function Sidebar({ activeId, onSelect, onNew, refreshKey }: Props) {
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
    const firstMsg = conv.messages?.[0]
    if (firstMsg?.content) {
      return firstMsg.content.length > 30
        ? firstMsg.content.slice(0, 30) + '...'
        : firstMsg.content
    }
    return 'New conversation'
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>💬 Support</h1>
        <button className="new-chat-btn" onClick={onNew} title="New conversation">
          +
        </button>
      </div>

      {/* Conversation List */}
      <div className="sidebar-section">
        <h3>Conversations</h3>
        <div className="conversation-list">
          {conversations.length === 0 && (
            <p className="empty-text">No conversations yet</p>
          )}
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${activeId === conv.id ? 'active' : ''}`}
              onClick={() => onSelect(conv.id)}
            >
              <div className="conv-info">
                <span className="conv-preview">{getPreview(conv)}</span>
                <span className="conv-date">{formatDate(conv.createdAt)}</span>
              </div>
              <button
                className="delete-btn"
                onClick={(e) => handleDelete(conv.id, e)}
                title="Delete"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Info */}
      <div className="sidebar-section">
        <h3
          className="clickable"
          onClick={() => setShowAgents(!showAgents)}
        >
          Agents {showAgents ? '▾' : '▸'}
        </h3>
        {showAgents && (
          <div className="agent-list">
            {agents.map((a) => (
              <div key={a.type} className="agent-item">
                <strong>{a.name}</strong>
                <p>{a.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
