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
}

const THINKING_PHRASES = [
  'Analyzing your query...',
  'Searching knowledge base...',
  'Looking up information...',
  'Processing request...',
  'Connecting to agent...',
]

export default function ChatArea({ conversationId, onConversationCreated }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [agentType, setAgentType] = useState<string | null>(null)
  const [thinkingStatus, setThinkingStatus] = useState<string | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const skipFetchRef = useRef(false)

  // Load messages when conversation switches (but skip if we just created it mid-stream)
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
    // Fetch existing messages
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
          // Set agent type from last assistant message
          const lastAssistant = [...data.conversation.messages].reverse().find((m: any) => m.role === 'assistant')
          if (lastAssistant?.agentType) setAgentType(lastAssistant.agentType)
        }
      })
      .catch((err) => setError(err.message || 'Failed to load conversation'))
      .finally(() => setIsLoadingHistory(false))
  }, [conversationId])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || isStreaming) return

    setInput('')
    setError(null)
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setIsStreaming(true)

    // Show thinking indicator with rotating phrases
    setThinkingStatus(THINKING_PHRASES[0])
    const thinkingInterval = setInterval(() => {
      setThinkingStatus((prev) => {
        const idx = THINKING_PHRASES.indexOf(prev || '')
        return THINKING_PHRASES[(idx + 1) % THINKING_PHRASES.length]
      })
    }, 1500)

    // Add empty assistant message to stream into
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const { conversationId: convId, agentType: agent, reader } =
        await sendMessage(text, conversationId ?? undefined)

      if (!conversationId) {
        skipFetchRef.current = true
        onConversationCreated(convId)
      }
      setAgentType(agent)

      // Read stream
      const decoder = new TextDecoder()
      let done = false
      let statusProcessed = false

      while (!done) {
        const { value, done: streamDone } = await reader.read()
        done = streamDone
        if (value) {
          let chunk = decoder.decode(value, { stream: true })

          // Parse status prefix from backend (e.g. "__STATUS__:Routed to order agent")
          if (!statusProcessed && chunk.includes('__STATUS__:')) {
            const statusMatch = chunk.match(/__STATUS__:(.+?)\n/)
            if (statusMatch) {
              setThinkingStatus(statusMatch[1])
              chunk = chunk.replace(/__STATUS__:.+?\n/, '')
              // Brief delay to show routing status before content starts
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

  return (
    <div className="chat-area">
      {/* Header */}
      <div className="chat-header">
        <h2>Chat</h2>
        {agentType && <span className="agent-badge">{agentType} agent</span>}
      </div>

      {/* Messages */}
      <div className="messages">
        {/* Error banner */}
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {/* Loading state */}
        {isLoadingHistory && (
          <div className="loading-state">
            <div className="typing-indicator"><span></span><span></span><span></span></div>
            <p>Loading conversation...</p>
          </div>
        )}

        {messages.length === 0 && !isLoadingHistory && (
          <div className="empty-state">
            <h3>AI Customer Support</h3>
            <p>Ask about orders, billing, or general support.</p>
            <div className="examples">
              <button onClick={() => setInput('What is the status of order ORD-1001?')}>
                📦 Order status
              </button>
              <button onClick={() => setInput('Show me invoice INV-2001')}>
                💳 Invoice details
              </button>
              <button onClick={() => setInput('How do I reset my password?')}>
                🔧 General support
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className="message-content">
              <div className="message-role">
                {msg.role === 'user' ? 'You' : `Assistant${msg.agentType ? ` (${msg.agentType})` : agentType ? ` (${agentType})` : ''}`}
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

        {/* Thinking / typing indicator */}
        {isStreaming && messages[messages.length - 1]?.content === '' && (
          <div className="thinking-status">
            <div className="typing-indicator">
              <span></span><span></span><span></span>
            </div>
            {thinkingStatus && <p className="thinking-text">{thinkingStatus}</p>}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          disabled={isStreaming}
        />
        <button onClick={handleSend} disabled={isStreaming || !input.trim()}>
          {isStreaming ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
