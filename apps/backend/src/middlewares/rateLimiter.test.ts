import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Context, Next } from 'hono'
import { rateLimiter } from '../middlewares/rateLimiter.js'

// Helper to create a mock Hono context
function createMockContext(ip = '127.0.0.1'): Context {
  return {
    req: {
      header(name: string) {
        if (name === 'x-forwarded-for') return ip
        return undefined
      },
    },
    header: vi.fn(),
    json: vi.fn((body, status) => ({ body, status })),
  } as unknown as Context
}

describe('rateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests under the limit', async () => {
    const middleware = rateLimiter({ windowMs: 60_000, max: 3 })
    const next: Next = vi.fn()
    const c = createMockContext('10.0.0.1')

    // First 3 requests should pass
    await middleware(c, next)
    await middleware(c, next)
    await middleware(c, next)

    expect(next).toHaveBeenCalledTimes(3)
  })

  it('blocks requests over the limit with 429', async () => {
    const middleware = rateLimiter({ windowMs: 60_000, max: 2 })
    const next: Next = vi.fn()
    const c = createMockContext('10.0.0.2')

    await middleware(c, next)
    await middleware(c, next)
    const result = await middleware(c, next)

    expect(next).toHaveBeenCalledTimes(2)
    expect(c.json).toHaveBeenCalledWith(
      { error: 'Too many requests. Please try again later.' },
      429
    )
    expect(c.header).toHaveBeenCalledWith('Retry-After', expect.any(String))
  })

  it('tracks different IPs independently', async () => {
    const middleware = rateLimiter({ windowMs: 60_000, max: 1 })
    const next: Next = vi.fn()
    const c1 = createMockContext('1.1.1.1')
    const c2 = createMockContext('2.2.2.2')

    await middleware(c1, next)
    await middleware(c2, next)

    // Both should pass — different IPs
    expect(next).toHaveBeenCalledTimes(2)
  })

  it('resets after the time window expires', async () => {
    const middleware = rateLimiter({ windowMs: 10_000, max: 1 })
    const next: Next = vi.fn()
    const c = createMockContext('10.0.0.3')

    await middleware(c, next) // uses 1/1
    await middleware(c, next) // blocked (should call c.json with 429)

    expect(next).toHaveBeenCalledTimes(1)

    // Advance time past the window
    vi.advanceTimersByTime(11_000)

    await middleware(c, next) // should pass again
    expect(next).toHaveBeenCalledTimes(2)
  })

  it('sets Retry-After header with correct seconds', async () => {
    const middleware = rateLimiter({ windowMs: 30_000, max: 1 })
    const next: Next = vi.fn()
    const c = createMockContext('10.0.0.4')

    await middleware(c, next) // pass
    await middleware(c, next) // blocked

    expect(c.header).toHaveBeenCalledWith('Retry-After', expect.any(String))
    const retryAfter = parseInt((c.header as ReturnType<typeof vi.fn>).mock.calls[0][1], 10)
    expect(retryAfter).toBeGreaterThan(0)
    expect(retryAfter).toBeLessThanOrEqual(30)
  })

  it('uses "unknown" when no IP headers are present', async () => {
    const c = {
      req: {
        header: () => undefined,
      },
      header: vi.fn(),
      json: vi.fn(),
    } as unknown as Context

    const middleware = rateLimiter({ windowMs: 60_000, max: 1 })
    const next: Next = vi.fn()

    await middleware(c, next)
    expect(next).toHaveBeenCalledTimes(1)
  })
})
