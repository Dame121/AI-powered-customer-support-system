import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { sendMessage } from '../api/client'

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
  agentType?: string | null
}

interface Props {
  conversationId: string | null
  onConversationCreated: (id: string) => void
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

const THINKING_PHRASES = [
  'Analyzing your query...',
  'Searching knowledge base...',
  'Looking up information...',
  'Processing request...',
  'Connecting to agent...',
]

const AGENT_INFO: Record<string, { label: string; color: string; icon: string }> = {
  order: { label: 'Order Agent', color: '#3b82f6', icon: '📦' },
  billing: { label: 'Billing Agent', color: '#8b5cf6', icon: '💳' },
  support: { label: 'Support Agent', color: '#10b981', icon: '🔧' },
}

export default function ChatArea({ conversationId, onConversationCreated, sidebarOpen, onToggleSidebar }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [agentType, setAgentType] = useState<string | null>(null)
  const [thinkingStatus, setThinkingStatus] = useState<string | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const skipFetchRef = useRef(false)

  // Load messages when conversation switches
  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      setAgentType(null)
      return
    }
    if (skipFetchRef.current) {
      skipFetchRef.current = false
      return
    }
    setIsLoadingHistory(true)
    setError(null)
    fetch(`http://localhost:3000/api/chat/conversations/${conversationId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load conversation')
        return r.json()
      })
      .then((data) => {
        if (data.conversation?.messages) {
          setMessages(
            data.conversation.messages.map((m: any) => ({
              role: m.role,
              content: m.content,
              agentType: m.agentType || null,
            }))
          )
          const lastAssistant = [...data.conversation.messages].reverse().find((m: any) => m.role === 'assistant')
          if (lastAssistant?.agentType) setAgentType(lastAssistant.agentType)
        }
      })
      .catch((err) => setError(err.message || 'Failed to load conversation'))
      .finally(() => setIsLoadingHistory(false))
  }, [conversationId])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px'
    }
  }, [input])

  async function handleSend() {
    const text = input.trim()
    if (!text || isStreaming) return

    setInput('')
    setError(null)
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setIsStreaming(true)

    setThinkingStatus(THINKING_PHRASES[0])
    const thinkingInterval = setInterval(() => {
      setThinkingStatus((prev) => {
        const idx = THINKING_PHRASES.indexOf(prev || '')
        return THINKING_PHRASES[(idx + 1) % THINKING_PHRASES.length]
      })
    }, 1500)

    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const { conversationId: convId, agentType: agent, reader } =
        await sendMessage(text, conversationId ?? undefined)

      if (!conversationId) {
        skipFetchRef.current = true
        onConversationCreated(convId)
      }
      setAgentType(agent)

      const decoder = new TextDecoder()
      let done = false
      let statusProcessed = false

      while (!done) {
        const { value, done: streamDone } = await reader.read()
        done = streamDone
        if (value) {
          let chunk = decoder.decode(value, { stream: true })

          if (!statusProcessed && chunk.includes('__STATUS__:')) {
            const statusMatch = chunk.match(/__STATUS__:(.+?)\n/)
            if (statusMatch) {
              setThinkingStatus(statusMatch[1])
              chunk = chunk.replace(/__STATUS__:.+?\n/, '')
              await new Promise((r) => setTimeout(r, 600))
            }
            statusProcessed = true
            clearInterval(thinkingInterval)
            setThinkingStatus(null)
          }

          if (chunk) {
            setMessages((prev) => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              if (last && last.role === 'assistant') {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + chunk,
                  agentType: agent,
                }
              }
              return updated
            })
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last && last.role === 'assistant') {
          updated[updated.length - 1] = {
            ...last,
            content: `Error: ${err.message}`,
          }
        }
        return updated
      })
    } finally {
      clearInterval(thinkingInterval)
      setThinkingStatus(null)
      setIsStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function getAgentBadge(type: string | null | undefined) {
    if (!type) return null
    const info = AGENT_INFO[type] || { label: type, color: '#6b7280', icon: '🤖' }
    return (
      <span className="agent-badge" style={{ '--agent-color': info.color } as React.CSSProperties}>
        {info.icon} {info.label}
      </span>
    )
  }

  return (
    <main className="chat-area">
      {/* Header */}
      <header className="chat-header">
        <div className="chat-header-left">
          {!sidebarOpen && (
            <button className="sidebar-open-btn" onClick={onToggleSidebar} title="Open sidebar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><polyline points="13 9 16 12 13 15"/></svg>
            </button>
          )}
          <div className="header-title">
            <h2>Chat</h2>
            <span className="header-subtitle">AI-Powered Customer Support</span>
          </div>
        </div>
        {agentType && getAgentBadge(agentType)}
      </header>

      {/* Messages */}
      <div className="messages">
        {error && (
          <div className="error-banner">
            <div className="error-content">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {isLoadingHistory && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading conversation...</p>
          </div>
        )}

        {messages.length === 0 && !isLoadingHistory && (
          <div className="empty-state">
            <div className="empty-icon">🤖</div>
            <h3>How can I help you today?</h3>
            <p>I can assist with orders, billing, and general support questions.</p>
            <div className="examples">
              <button onClick={() => setInput('What is the status of order ORD-1001?')}>
                <span className="example-icon">📦</span>
                <span className="example-text">
                  <strong>Order status</strong>
                  <small>Check your order details</small>
                </span>
              </button>
              <button onClick={() => setInput('Show me invoice INV-2001')}>
                <span className="example-icon">💳</span>
                <span className="example-text">
                  <strong>Invoice details</strong>
                  <small>View payment information</small>
                </span>
              </button>
              <button onClick={() => setInput('How do I reset my password?')}>
                <span className="example-icon">🔧</span>
                <span className="example-text">
                  <strong>General support</strong>
                  <small>Get help with your account</small>
                </span>
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'user' ? (
                <div className="avatar user-avatar">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
              ) : (
                <div className="avatar bot-avatar">🤖</div>
              )}
            </div>
            <div className="message-content">
              <div className="message-meta">
                <span className="message-role">
                  {msg.role === 'user' ? 'You' : 'Assistant'}
                </span>
                {msg.role === 'assistant' && msg.agentType && getAgentBadge(msg.agentType)}
              </div>
              <div className="message-text">
                {msg.role === 'assistant' ? (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {isStreaming && messages[messages.length - 1]?.content === '' && (
          <div className="thinking-status">
            <div className="thinking-dots">
              <span></span><span></span><span></span>
            </div>
            {thinkingStatus && <p className="thinking-text">{thinkingStatus}</p>}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-wrapper">
        <div className="chat-input-area">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            disabled={isStreaming}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            title="Send message"
          >
            {isStreaming ? (
              <div className="send-loading"></div>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            )}
          </button>
        </div>
        <p className="input-hint">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </main>
  )
}
