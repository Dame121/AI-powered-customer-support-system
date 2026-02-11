import type { Context, Next } from 'hono'

interface RateLimitOptions {
  windowMs: number  // Time window in milliseconds
  max: number       // Max requests per window per IP
}

// In-memory store for rate limiting
const store = new Map<string, { count: number; resetTime: number }>()

/**
 * Simple in-memory rate limiter middleware.
 * Limits requests per IP address within a sliding time window.
 */
export function rateLimiter({ windowMs, max }: RateLimitOptions) {
  // Clean up expired entries periodically
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now > entry.resetTime) store.delete(key)
    }
  }, windowMs)

  return async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
    const now = Date.now()
    const entry = store.get(ip)

    if (!entry || now > entry.resetTime) {
      // First request or window expired — start fresh
      store.set(ip, { count: 1, resetTime: now + windowMs })
    } else {
      entry.count++
      if (entry.count > max) {
        c.header('Retry-After', String(Math.ceil((entry.resetTime - now) / 1000)))
        return c.json(
          { error: 'Too many requests. Please try again later.' },
          429
        )
      }
    }

    await next()
  }
}
