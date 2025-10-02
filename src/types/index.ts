// 🤖 AI Service Types
export interface AIServiceConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

export interface GenerationRequest {
  prompt: string;
  model?: string;
  options?: Record<string, unknown>;
}

export interface GenerationResponse {
  success: boolean;
  result?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

// 🎯 Router Types
export interface RouterHandler {
  (ctx: any): Promise<boolean>;
}

export interface RouterConfig {
  prefix: string;
  handlers: Map<string, RouterHandler>;
}

// 🔒 Security Types
// Базовые типы
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// AI Service Types
export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

// Freepik Types
export interface FreepikGenerationRequest {
  prompt: string;
  model: 'realism' | 'artistic' | 'fantasy' | 'photography' | 'portrait' | 'landscape' | 'architecture';
  aspect_ratio: 'square_1_1' | 'widescreen_16_9' | 'social_story_9_16' | 'traditional_3_4' | 'classic_4_3';
  resolution: '1k' | '2k' | '4k';
  type: 'image' | 'video';
  userId: number;
  creative_detailing?: number;
  filter_nsfw?: boolean;
}

export interface FreepikGenerationResponse {
  success: boolean;
  taskId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  imageUrl?: string;
  videoUrl?: string;
  cost?: number;
}

// Midjourney Types
export interface MidjourneyGenerationRequest {
  prompt: string;
  version: '5.0' | '6.0' | '7.0';
  style: 'photorealistic' | 'artistic' | 'anime' | 'cartoon';
  aspect_ratio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  quality: 'low' | 'medium' | 'high';
  userId: number;
}

export interface MidjourneyGenerationResponse {
  success: boolean;
  taskId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  imageUrl?: string;
  cost?: number;
}

// Runway Types
export interface RunwayGenerationRequest {
  prompt: string;
  model: 'gen3' | 'gen3a_turbo' | 'gen2' | 'gen4_turbo';
  type: 'text_to_video' | 'image_to_video' | 'video_to_video';
  duration?: number;
  resolution?: '720p' | '1080p' | '4k';
  userId: number;
}

export interface RunwayGenerationResponse {
  success: boolean;
  taskId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  videoUrl?: string;
  cost?: number;
}

// ChatGPT Types
export interface ChatGPTGenerationRequest {
  messages: AIMessage[];
  model: 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4' | 'gpt-3.5-turbo';
  temperature?: number;
  max_tokens?: number;
  userId: number;
}

export interface ChatGPTImageRequest {
  prompt: string;
  model: 'dall-e-3' | 'dall-e-2';
  size: '1024x1024' | '1792x1024' | '1024x1792';
  quality: 'standard' | 'hd';
  userId: number;
}

// User Types
export interface UserSettings {
  gpt?: {
    model: string;
    temperature: number;
    max_tokens: number;
    system_prompt?: string;
  };
  midjourney?: {
    model: string;
    style: string;
    aspect_ratio: string;
    quality: string;
  };
  runway?: {
    length: number;
    seed: number;
  };
  app?: {
    notifications: boolean;
  };
  tokens: number;
  subscription?: 'base' | 'pro' | 'premium';
}

// Task Types
export interface TaskStatus {
  id: string;
  taskId: string;
  userId: string;
  service: 'freepik' | 'midjourney' | 'runway' | 'chatgpt';
  type: 'image' | 'video' | 'text';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  prompt: string;
  model: string;
  cost: number;
  result?: {
    imageUrl?: string;
    videoUrl?: string;
    content?: string;
  };
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Token Types
export interface TokenTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'deduction' | 'addition' | 'refund';
  service?: string;
  reason?: string;
  metadata?: any;
  createdAt: Date;
}

// Security Types
export interface SecurityCheck {
  valid: boolean;
  blocked?: boolean;
  suspicious?: boolean;
  reason?: string;
  action?: 'allow' | 'block' | 'warn';
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// Cache Types
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  ttl: number;
  createdAt: Date;
  expiresAt: Date;
}

// Queue Types
export interface QueueJob {
  id: string;
  name: string;
  data: any;
  priority: number;
  attempts: number;
  delay: number;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  createdAt: Date;
  processedAt?: Date;
  finishedAt?: Date;
  error?: string;
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T = any> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Webhook Types
export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: Date;
  signature?: string;
}

export interface FreepikWebhookPayload extends WebhookPayload {
  event: 'task.completed' | 'task.failed' | 'task.processing';
  data: {
    task_id: string;
    status: string;
    result?: {
      images?: Array<{
        url: string;
        width: number;
        height: number;
      }>;
      videos?: Array<{
        url: string;
        duration: number;
        resolution: string;
      }>;
    };
    error?: string;
  };
}

// Configuration Types
export interface AppConfig {
  app: {
    baseUrl: string;
    frontendUrl: string;
    environment: string;
  };
  server: {
    port: number;
    host: string;
    cors: {
      origin: string[];
      credentials: boolean;
    };
  };
  database: {
    url: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  ai: {
    openai: {
      apiKey: string;
      baseUrl?: string;
    };
    freepik: {
      apiKey: string;
      baseUrl: string;
    };
    midjourney: {
      apiKey: string;
      baseUrl: string;
    };
    runway: {
      apiKey: string;
      baseUrl: string;
    };
  };
  telegram: {
    botToken: string;
    webhookUrl?: string;
  };
  security: {
    jwtSecret: string;
    rateLimits: {
      [key: string]: RateLimitConfig;
    };
  };
}

// Error Types
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, details?: any) {
    super(`${service} service error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', details);
    this.name = 'ExternalServiceError';
  }
}

// Type Guards
export function isValidAIMessage(obj: any): obj is AIMessage {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.role === 'string' &&
    ['user', 'assistant', 'system'].includes(obj.role) &&
    typeof obj.content === 'string'
  );
}

export function isValidFreepikRequest(obj: any): obj is FreepikGenerationRequest {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.prompt === 'string' &&
    typeof obj.model === 'string' &&
    typeof obj.userId === 'number'
  );
}

export function isValidMidjourneyRequest(obj: any): obj is MidjourneyGenerationRequest {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.prompt === 'string' &&
    ['5.0', '6.0', '7.0'].includes(obj.version) &&
    typeof obj.userId === 'number'
  );
}

// Utility Types
export type ServiceType = 'freepik' | 'midjourney' | 'runway' | 'chatgpt';
export type TaskType = 'image' | 'video' | 'text';
export type TaskStatusType = 'pending' | 'processing' | 'completed' | 'failed';
export type SubscriptionType = 'base' | 'pro' | 'premium';
export type UserRole = 'user' | 'admin' | 'moderator';

// Environment Types
export interface Environment {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: string;
  DATABASE_URL: string;
  REDIS_HOST: string;
  REDIS_PORT: string;
  REDIS_PASSWORD?: string;
  BOT_TOKEN: string;
  JWT_SECRET: string;
  OPENAI_API_KEY: string;
  FREEPIK_API_KEY: string;
  MIDJOURNEY_API_KEY: string;
  RUNWAY_API_KEY: string;
  FRONTEND_URL: string;
}

// Configuration for cache
export interface CacheConfig {
  ttl: number;
  maxSize?: number;
  cleanupInterval?: number;
}

// 📊 Session Types
export interface SessionData {
  userId: string;
  provider: string;
  state: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface SessionConfig {
  timeout: number;
  maxSessions: number;
  cleanupInterval: number;
}

// 🎨 Handler Types
export interface HandlerContext {
  userId: string;
  action: string;
  data?: Record<string, unknown>;
}

export interface HandlerResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: Record<string, unknown>;
}

// 🔧 Utility Types
export type CallbackAction = string;
export type UserId = string;
export type SessionId = string;

export interface BotConfig {
  token: string;
  webhookUrl?: string;
  port?: number;
  host?: string;
}

export interface DatabaseConfig {
  url: string;
  maxConnections?: number;
  timeout?: number;
}

// Удалены дублирующиеся типы - используем определения выше
