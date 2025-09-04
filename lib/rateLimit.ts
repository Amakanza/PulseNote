// lib/rateLimit.ts
interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

class InMemoryRateLimit {
  private requests = new Map<string, { count: number; resetTime: number }>();

  limit(identifier: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const reset = windowStart + windowMs;

    const key = `${identifier}:${windowStart}`;
    const current = this.requests.get(key) || { count: 0, resetTime: reset };

    // Clean up old entries
    if (now > current.resetTime) {
      this.requests.delete(key);
      current.count = 0;
      current.resetTime = reset;
    }

    current.count++;
    this.requests.set(key, current);

    const remaining = Math.max(0, limit - current.count);
    const success = current.count <= limit;

    return {
      success,
      limit,
      remaining,
      reset: current.resetTime
    };
  }

  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.requests.entries()) {
      if (now > value.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Global rate limiter instances
const rateLimiters = {
  auth: new InMemoryRateLimit(),
  upload: new InMemoryRateLimit(),
  ocr: new InMemoryRateLimit(),
  invite: new InMemoryRateLimit(),
};

// Clean up old entries every minute
setInterval(() => {
  Object.values(rateLimiters).forEach(limiter => limiter.cleanup());
}, 60000);

export const rateLimit = {
  auth: (identifier: string) => rateLimiters.auth.limit(identifier, 5, 60000), // 5 per minute
  upload: (identifier: string) => rateLimiters.upload.limit(identifier, 10, 60000), // 10 per minute  
  ocr: (identifier: string) => rateLimiters.ocr.limit(identifier, 20, 3600000), // 20 per hour
  invite: (identifier: string) => rateLimiters.invite.limit(identifier, 5, 3600000), // 5 per hour
};

// Middleware helper
export async function withRateLimit(
  req: Request,
  type: keyof typeof rateLimit,
  handler: () => Promise<Response>
): Promise<Response> {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const identifier = `${type}:${ip}`;
  
  const result = rateLimit[type](identifier);

  if (!result.success) {
    return new Response(
      JSON.stringify({ 
        error: 'Rate limit exceeded',
        retryAfter: Math.round((result.reset - Date.now()) / 1000)
      }),
      {
        status: 429,
        headers: {
          'Retry-After': Math.round((result.reset - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.reset.toString(),
          'Content-Type': 'application/json'
        },
      }
    );
  }

  return handler();
}
