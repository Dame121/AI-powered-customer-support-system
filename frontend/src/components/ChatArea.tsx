import { useState, useRef, useEffect } from 'react'
import { sendMessage } from '../api/client'

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  conversationId: string | null
  onConversationCreated: (id: string) => void
}

export default function ChatArea({ conversationId, onConversationCreated }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [agentType, setAgentType] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load messages when conversation switches
  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      setAgentType(null)
      return
    }
    // Fetch existing messages
    fetch(`http://localhost:3000/api/chat/conversations/${conversationId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.conversation?.messages) {
          setMessages(
            data.conversation.messages.map((m: any) => ({
              role: m.role,
              content: m.content,
            }))
          )
        }
      })
      .catch(console.error)
  }, [conversationId])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || isStreaming) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setIsStreaming(true)

    // Add empty assistant message to stream into
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const { conversationId: convId, agentType: agent, reader } =
        await sendMessage(text, conversationId ?? undefined)

      if (!conversationId) {
        onConversationCreated(convId)
      }
      setAgentType(agent)

      // Read stream
      const decoder = new TextDecoder()
      let done = false

      while (!done) {
        const { value, done: streamDone } = await reader.read()
        done = streamDone
        if (value) {
          const chunk = decoder.decode(value, { stream: true })
          setMessages((prev) => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last && last.role === 'assistant') {
              updated[updated.length - 1] = {
                ...last,
                content: last.content + chunk,
              }
            }
            return updated
          })
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
        {messages.length === 0 && (
          <div className="empty-state">
            <h3>AI Customer Support</h3>
            <p>Ask about orders, billing, or general support.</p>
            <div className="examples">
              <button onClick={() => setInput('What is the status of order ORD-001?')}>
                📦 Order status
              </button>
              <button onClick={() => setInput('Show me invoice INV-001')}>
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
                {msg.role === 'user' ? 'You' : `Assistant${agentType ? ` (${agentType})` : ''}`}
              </div>
              <div className="message-text">{msg.content}</div>
            </div>
          </div>
        ))}

        {isStreaming && messages[messages.length - 1]?.content === '' && (
          <div className="typing-indicator">
            <span></span><span></span><span></span>
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
