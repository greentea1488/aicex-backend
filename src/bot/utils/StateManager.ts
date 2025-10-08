import { Context } from "grammy";
import { prisma } from "../../utils/prismaClient";
import { logger } from "../../utils/logger";

// 🎯 Улучшенный менеджер состояний пользователя

export interface UserSession {
  userId: string;
  aiProvider: string;
  isActive: boolean;
  messages: any[];
  createdAt: Date;
  lastActivity: Date;
  currentAction?: string;
  actionData?: any;
  retryCount?: number;
}

export interface GenerationTask {
  id: string;
  userId: number;
  type: 'image' | 'video' | 'chat';
  service: string;
  prompt: string;
  model?: string;
  imageUrl?: string;
  taskId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export class StateManager {
  private sessions = new Map<string, UserSession>();
  private tasks = new Map<string, GenerationTask>();
  private retryTimers = new Map<string, NodeJS.Timeout>();
  private readonly SESSION_TIMEOUT = 15 * 60 * 1000; // 15 минут
  private readonly TASK_TIMEOUT = 10 * 60 * 1000; // 10 минут для задач
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor() {
    // Очистка устаревших состояний каждые 5 минут
    setInterval(() => {
      this.cleanupStaleSessions();
      this.cleanupStaleTasks();
    }, 5 * 60 * 1000);
  }

  /**
   * 🎯 Создание новой сессии
   */
  createSession(userId: string, aiProvider: string, action?: string, actionData?: any): UserSession {
    // Завершаем существующую сессию
    this.endSession(userId);

    const session: UserSession = {
      userId,
      aiProvider,
      isActive: true,
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date(),
      currentAction: action,
      actionData: actionData,
      retryCount: 0
    };

    this.sessions.set(userId, session);
    logger.info(`Session created for user ${userId} with provider ${aiProvider}`);
    return session;
  }

  /**
   * 📊 Получение сессии пользователя
   */
  getSession(userId: string): UserSession | undefined {
    const session = this.sessions.get(userId);
    if (session) {
      session.lastActivity = new Date();
      return session;
    }
    return undefined;
  }

  /**
   * 🔄 Обновление сессии
   */
  updateSession(userId: string, updates: Partial<UserSession>): boolean {
    const session = this.sessions.get(userId);
    if (session) {
      Object.assign(session, updates);
      session.lastActivity = new Date();
      return true;
    }
    return false;
  }

  /**
   * 🛑 Завершение сессии
   */
  endSession(userId: string): void {
    const session = this.sessions.get(userId);
    if (session) {
      session.isActive = false;
      this.sessions.delete(userId);
      
      // Очищаем связанные задачи
      this.cancelUserTasks(parseInt(userId));
      
      logger.info(`Session ended for user ${userId}`);
    }
  }

  /**
   * 🎯 Создание задачи генерации
   */
  createTask(
    userId: number,
    type: 'image' | 'video' | 'chat',
    service: string,
    prompt: string,
    data?: any
  ): GenerationTask {
    const taskId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const task: GenerationTask = {
      id: taskId,
      userId,
      type,
      service,
      prompt,
      status: 'pending',
      progress: 0,
      createdAt: new Date()
    };

    this.tasks.set(taskId, task);
    logger.info(`Task created: ${taskId} for user ${userId}`);
    return task;
  }

  /**
   * 📊 Обновление статуса задачи
   */
  updateTask(taskId: string, updates: Partial<GenerationTask>): boolean {
    const task = this.tasks.get(taskId);
    if (task) {
      Object.assign(task, updates);
      
      if (updates.status === 'processing' && !task.startedAt) {
        task.startedAt = new Date();
      } else if (updates.status === 'completed' || updates.status === 'failed') {
        task.completedAt = new Date();
      }
      
      return true;
    }
    return false;
  }

  /**
   * 📋 Получение задачи
   */
  getTask(taskId: string): GenerationTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 📋 Получение задач пользователя
   */
  getUserTasks(userId: number): GenerationTask[] {
    return Array.from(this.tasks.values()).filter(task => task.userId === userId);
  }

  /**
   * 🗑️ Удаление задачи
   */
  removeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (task) {
      this.tasks.delete(taskId);
      
      // Очищаем таймер повтора если есть
      const retryTimer = this.retryTimers.get(taskId);
      if (retryTimer) {
        clearTimeout(retryTimer);
        this.retryTimers.delete(taskId);
      }
      
      return true;
    }
    return false;
  }

  /**
   * 🚫 Отмена задач пользователя
   */
  cancelUserTasks(userId: number): void {
    const userTasks = this.getUserTasks(userId);
    for (const task of userTasks) {
      if (task.status === 'pending' || task.status === 'processing') {
        this.updateTask(task.id, { 
          status: 'failed', 
          error: 'Task cancelled by user',
          completedAt: new Date()
        });
      }
    }
  }

  /**
   * 🔄 Планирование повтора задачи
   */
  scheduleRetry(taskId: string, delay: number = 5000): void {
    const task = this.getTask(taskId);
    if (!task) return;

    const currentRetryCount = task.userId ? 
      this.getSession(task.userId.toString())?.retryCount || 0 : 0;

    if (currentRetryCount >= this.MAX_RETRY_ATTEMPTS) {
      this.updateTask(taskId, { 
        status: 'failed', 
        error: 'Max retry attempts exceeded',
        completedAt: new Date()
      });
      return;
    }

    // Отменяем предыдущий таймер если есть
    const existingTimer = this.retryTimers.get(taskId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.updateTask(taskId, { status: 'pending', progress: 0 });
      this.retryTimers.delete(taskId);
    }, delay);

    this.retryTimers.set(taskId, timer);
    
    // Увеличиваем счетчик повторов
    if (task.userId) {
      this.updateSession(task.userId.toString(), { 
        retryCount: currentRetryCount + 1 
      });
    }
  }

  /**
   * 🧹 Очистка устаревших сессий
   */
  private cleanupStaleSessions(): void {
    const now = Date.now();
    const cutoffTime = new Date(now - this.SESSION_TIMEOUT);

    for (const [userId, session] of this.sessions.entries()) {
      if (session.lastActivity < cutoffTime) {
        this.endSession(userId);
        logger.info(`Stale session cleaned up for user ${userId}`);
      }
    }
  }

  /**
   * 🧹 Очистка устаревших задач
   */
  private cleanupStaleTasks(): void {
    const now = Date.now();
    const cutoffTime = new Date(now - this.TASK_TIMEOUT);

    for (const [taskId, task] of this.tasks.entries()) {
      if (task.createdAt < cutoffTime && task.status !== 'completed') {
        this.updateTask(taskId, { 
          status: 'failed', 
          error: 'Task timeout',
          completedAt: new Date()
        });
        logger.info(`Stale task cleaned up: ${taskId}`);
      }
    }
  }

  /**
   * 💾 Сохранение сессии в БД
   */
  async saveSessionToDB(session: UserSession): Promise<void> {
    try {
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
      logger.error("Error saving session to DB:", error);
    }
  }

  /**
   * 📥 Загрузка сессии из БД
   */
  async loadSessionFromDB(userId: string, aiProvider: string): Promise<UserSession | null> {
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
          messages: dbSession.messages as any,
          createdAt: dbSession.createdAt,
          lastActivity: new Date(),
        };

        this.sessions.set(userId, session);
        return session;
      }
    } catch (error) {
      logger.error("Error loading session from DB:", error);
    }

    return null;
  }

  /**
   * 📊 Получение статистики состояний
   */
  getStats(): { sessions: number; tasks: number; activeTasks: number } {
    const activeTasks = Array.from(this.tasks.values()).filter(
      task => task.status === 'pending' || task.status === 'processing'
    ).length;

    return {
      sessions: this.sessions.size,
      tasks: this.tasks.size,
      activeTasks
    };
  }

  /**
   * 🎯 Проверка активности пользователя
   */
  isUserActive(userId: number): boolean {
    const session = this.getSession(userId.toString());
    return session?.isActive || false;
  }

  /**
   * 🔄 Сброс счетчика повторов
   */
  resetRetryCount(userId: string): void {
    this.updateSession(userId, { retryCount: 0 });
  }

  /**
   * 📋 Получение последней задачи пользователя
   */
  getLastUserTask(userId: number, type?: 'image' | 'video' | 'chat'): GenerationTask | undefined {
    const userTasks = this.getUserTasks(userId);
    const filteredTasks = type ? userTasks.filter(task => task.type === type) : userTasks;
    
    return filteredTasks.sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    )[0];
  }

  /**
   * 🎯 Получение контекста для повторения
   */
  getRepeatContext(userId: number): { task?: GenerationTask; session?: UserSession } {
    const lastTask = this.getLastUserTask(userId);
    const session = this.getSession(userId.toString());
    
    return {
      task: lastTask,
      session
    };
  }
}
