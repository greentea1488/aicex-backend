import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Simple in-memory rate limiter
 * For production with multiple instances, use Redis-based solution
 */
class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Cleanup old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.requests.entries()) {
      if (now > value.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  private getKey(req: Request): string {
    // Use user ID if authenticated, otherwise IP
    const userId = (req as any).user?.id;
    return userId || req.ip || req.socket.remoteAddress || 'unknown';
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const key = this.getKey(req);
      const now = Date.now();
      
      let record = this.requests.get(key);
      
      if (!record || now > record.resetTime) {
        // Create new record
        record = {
          count: 1,
          resetTime: now + this.windowMs
        };
        this.requests.set(key, record);
        next();
        return;
      }

      if (record.count >= this.maxRequests) {
        logger.warn('Rate limit exceeded', {
          key,
          count: record.count,
          maxRequests: this.maxRequests,
          path: req.path
        });

        res.status(429).json({
          error: 'Too many requests',
          message: 'Please slow down and try again later',
          retryAfter: Math.ceil((record.resetTime - now) / 1000)
        });
        return;
      }

      // Increment counter
      record.count++;
      this.requests.set(key, record);
      
      // Add rate limit info to response headers
      res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (this.maxRequests - record.count).toString());
      res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());
      
      next();
    };
  }
}

// Rate limiters for different endpoints
export const globalLimiter = new RateLimiter(60000, 100); // 100 req/min
export const authLimiter = new RateLimiter(900000, 5); // 5 req/15min - строгий для auth
export const paymentLimiter = new RateLimiter(60000, 10); // 10 req/min
export const aiGenerationLimiter = new RateLimiter(60000, 5); // 5 req/min
export const webhookLimiter = new RateLimiter(60000, 100); // 100 req/min для webhooks

export default RateLimiter;
