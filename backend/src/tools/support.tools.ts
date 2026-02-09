import prisma from '../db/index.js'

// Simple FAQ answers
const faqs: Record<string, string> = {
  shipping: 'Standard shipping takes 5-7 business days.',
  returns: 'You can return items within 30 days of delivery.',
  refund: 'Refunds are processed within 5-10 business days.',
  payment: 'We accept Visa, MasterCard, PayPal, and Apple Pay.',
  contact: 'Email us at support@example.com or call 1-800-SUPPORT.',
}

// Answer a FAQ by keyword match
export const answerFAQ = (question: string) => {
  const q = question.toLowerCase()
  for (const [key, answer] of Object.entries(faqs)) {
    if (q.includes(key)) return answer
  }
  return 'Sorry, I don\'t have an answer for that. Let me connect you with a human agent.'
}

// Get conversation history
export const getConversationHistory = async (conversationId: string) => {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
}

// Save a response to a conversation
export const saveResponse = async (conversationId: string, role: string, content: string) => {
  return prisma.message.create({
    data: { conversationId, role, content },
  })
}
