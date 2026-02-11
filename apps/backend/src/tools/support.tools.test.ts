import { describe, it, expect } from 'vitest'
import { answerFAQ } from '../tools/support.tools.js'

describe('answerFAQ', () => {
  it('returns password reset answer for "password" keyword', () => {
    const result = answerFAQ('How do I change my password?')
    expect(result).toContain('reset your password')
    expect(result).toContain('Settings')
  })

  it('returns password reset answer for "reset" keyword', () => {
    const result = answerFAQ('I need to reset my credentials')
    expect(result).toContain('reset your password')
  })

  it('returns shipping info for "shipping" keyword', () => {
    const result = answerFAQ('What are the shipping options?')
    expect(result).toContain('5-7 business days')
    expect(result).toContain('Express')
  })

  it('returns return policy for "returns" keyword', () => {
    const result = answerFAQ('How do returns work?')
    expect(result).toContain('30 days')
  })

  it('returns refund info for "refund" keyword', () => {
    const result = answerFAQ('Where is my refund?')
    expect(result).toContain('5-10 business days')
  })

  it('returns payment methods for "payment" keyword', () => {
    const result = answerFAQ('What payment methods do you accept?')
    expect(result).toContain('Visa')
    expect(result).toContain('PayPal')
  })

  it('returns contact info for "contact" keyword', () => {
    const result = answerFAQ('How do I contact support?')
    expect(result).toContain('support@example.com')
  })

  it('returns cancel info for "cancel" keyword', () => {
    const result = answerFAQ('Can I cancel my order?')
    expect(result).toContain('24 hours')
  })

  it('returns exchange info for "exchange" keyword', () => {
    const result = answerFAQ('I want to exchange an item')
    expect(result).toContain('30 days')
  })

  it('returns account info for "account" keyword', () => {
    const result = answerFAQ('I have an account issue')
    expect(result).toContain('Settings')
  })

  it('returns fallback for unrecognized questions', () => {
    const result = answerFAQ('What is the meaning of life?')
    expect(result).toContain("don't have an answer")
  })

  it('is case-insensitive', () => {
    const result = answerFAQ('SHIPPING information please')
    expect(result).toContain('business days')
  })
})
