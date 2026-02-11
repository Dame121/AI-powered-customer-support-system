import prisma from '../db/index.js'

// Simple FAQ answers
const faqs: Record<string, string> = {
  password: 'To reset your password, go to Settings > Account > Change Password. You can also click "Forgot Password" on the login page to receive a reset link via email.',
  reset: 'To reset your password, go to Settings > Account > Change Password. You can also click "Forgot Password" on the login page to receive a reset link via email.',
  account: 'For account-related issues, go to Settings > Account. If your account is locked, use the "Forgot Password" link on the login page or contact us at support@example.com.',
  shipping: 'Standard shipping takes 5-7 business days. Express shipping takes 2-3 business days.',
  returns: 'You can return items within 30 days of delivery. Items must be in original condition with tags attached.',
  refund: 'Refunds are processed within 5-10 business days after we receive your returned item.',
  payment: 'We accept Visa, MasterCard, American Express, PayPal, and Apple Pay.',
  contact: 'Email us at support@example.com or call 1-800-SUPPORT (Mon-Fri 9am-6pm EST).',
  cancel: 'To cancel an order, contact us within 24 hours of placing it. After that, you may need to return the item once delivered.',
  exchange: 'You can exchange items within 30 days of delivery. Visit your order page and select "Exchange Item".',
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
