import { NextRequest, NextResponse } from 'next/server';

// In-memory store for rate limiting
// In production, consider using Redis or another persistent store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string; // Function to generate rate limit key
  skipSuccessfulRequests?: boolean; // Skip rate limiting for successful requests
  skipFailedRequests?: boolean; // Skip rate limiting for failed requests
}

export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req) => {
      // Default key: IP address with fallback
      const forwarded = req.headers.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || 'unknown';
      return ip;
    },
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return async function rateLimitMiddleware(
    request: NextRequest,
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    const key = keyGenerator(request);
    const now = Date.now();

    // Get current rate limit data
    let rateLimitData = rateLimitStore.get(key);

    if (!rateLimitData || rateLimitData.resetTime < now) {
      // Reset or initialize rate limit data
      rateLimitData = { count: 0, resetTime: now + windowMs };
    }

    // Check if limit exceeded
    if (rateLimitData.count >= maxRequests) {
      const resetTime = new Date(rateLimitData.resetTime);
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again after ${resetTime.toISOString()}`,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toISOString(),
            'Retry-After': Math.ceil((rateLimitData.resetTime - now) / 1000).toString(),
          },
        }
      );
    }

    // Increment counter BEFORE executing handler
    rateLimitData.count++;
    rateLimitStore.set(key, rateLimitData);

    try {
      // Execute the handler
      const response = await handler();

      // Clean up old entries periodically (simple cleanup)
      if (Math.random() < 0.01) { // 1% chance to clean up
        cleanupOldEntries();
      }

      // Only count failed requests if skipFailedRequests is true
      if (skipFailedRequests && response.status >= 400) {
        rateLimitData.count--;
        rateLimitStore.set(key, rateLimitData);
      }

      const resetTime = new Date(rateLimitData.resetTime);
      const remaining = Math.max(0, maxRequests - rateLimitData.count);

      // Return response with rate limit headers
      const headers = new Headers(response.headers);
      headers.set('X-RateLimit-Limit', maxRequests.toString());
      headers.set('X-RateLimit-Remaining', remaining.toString());
      headers.set('X-RateLimit-Reset', resetTime.toISOString());

      return new NextResponse(response.body, {
        status: response.status,
        headers: headers,
      });
    } catch (error) {
      // For errors, we might still want to track them depending on configuration
      throw error;
    }
  };
}

function cleanupOldEntries() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Pre-configured rate limiters for common use cases
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 50, // 50 attempts per 15 minutes (increased for testing)
  skipFailedRequests: true, // Don't count failed auth attempts against the limit
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 120, // 120 requests per minute for general API
});

export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute for sensitive operations
});