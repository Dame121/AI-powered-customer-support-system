import type { Context, Next } from 'hono'

/**
 * Global error handling middleware.
 * Catches any unhandled errors in route handlers and returns a consistent JSON response.
 */
export const errorHandler = async (c: Context, next: Next) => {
  try {
    await next()
  } catch (err) {
    console.error('[Error]', err)

    const message = err instanceof Error ? err.message : 'Internal server error'

    const status =
      err instanceof Error && 'status' in err
        ? (err as Error & { status: number }).status
        : 500

    return c.json({ error: message }, status as 400)
  }
}
