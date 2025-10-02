import { AIMessage } from "./ai/BaseAIService";
import { prisma } from "../../utils/prismaClient";

export interface UserSession {
  userId: string;
  aiProvider: string;
  isActive: boolean;
  messages: AIMessage[];
  createdAt: Date;
  lastActivity: Date;
}

export class SessionManager {
  private sessions = new Map<string, UserSession>();
  private cache = new Map<string, { data: any; expires: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 минут

  createSession(userId: string, aiProvider: string): UserSession {
    // End any existing session for this user
    this.endSession(userId);

    const session: UserSession = {
      userId,
      aiProvider,
      isActive: true,
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.sessions.set(userId, session);
    return session;
  }

  getSession(userId: string): UserSession | undefined {
    const session = this.sessions.get(userId);
    if (session) {
      session.lastActivity = new Date();
    }
    return session;
  }

  // Кэширование пользовательских данных
  setCache(key: string, data: any, ttl?: number): void {
    const expires = Date.now() + (ttl || this.CACHE_TTL);
    this.cache.set(key, { data, expires });
  }

  getCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Очистка устаревшего кэша
  cleanupCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expires) {
        this.cache.delete(key);
      }
    }
  }

  endSession(userId: string): void {
    const session = this.sessions.get(userId);
    if (session) {
      session.isActive = false;
      this.sessions.delete(userId);
    }
  }

  async saveChatSession(session: UserSession): Promise<void> {
    try {
      // Save or update the session in the database
      await prisma.botChatSession.upsert({
        where: {
          telegramId_aiProvider: {
            telegramId: parseInt(session.userId),
            aiProvider: session.aiProvider,
          },
        },
        update: {
          messages: session.messages as any,
          isActive: session.isActive,
          updatedAt: new Date(),
        },
        create: {
          telegramId: parseInt(session.userId),
          aiProvider: session.aiProvider,
          messages: session.messages as any,
          isActive: session.isActive,
        },
      });
    } catch (error) {
      console.error("Error saving chat session:", error);
    }
  }

  async loadChatSession(userId: string, aiProvider: string): Promise<UserSession | null> {
    try {
      const dbSession = await prisma.botChatSession.findFirst({
        where: {
          telegramId: parseInt(userId),
          aiProvider,
          isActive: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      if (dbSession) {
        const session: UserSession = {
          userId,
          aiProvider,
          isActive: true,
          messages: dbSession.messages as unknown as AIMessage[],
          createdAt: dbSession.createdAt,
          lastActivity: new Date(),
        };

        this.sessions.set(userId, session);
        return session;
      }
    } catch (error) {
      console.error("Error loading chat session:", error);
    }

    return null;
  }

  // Clean up inactive sessions (can be called periodically)
  cleanupInactiveSessions(maxInactiveMinutes: number = 30): void {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - maxInactiveMinutes * 60 * 1000);

    for (const [userId, session] of this.sessions.entries()) {
      if (session.lastActivity < cutoffTime) {
        this.endSession(userId);
      }
    }
  }
}
