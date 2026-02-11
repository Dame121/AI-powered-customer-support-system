import { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import './App.css'

function App() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null)
  }, [])

  const handleConversationCreated = useCallback((id: string) => {
    setActiveConversationId(id)
    setRefreshKey((k) => k + 1)
  }, [])

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id)
  }, [])

  return (
    <div className="app">
      <Sidebar
        activeId={activeConversationId}
        onSelect={handleSelectConversation}
        onNew={handleNewChat}
        refreshKey={refreshKey}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
      />
      <ChatArea
        conversationId={activeConversationId}
        onConversationCreated={handleConversationCreated}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
      />
    </div>
  )
}

export default App
