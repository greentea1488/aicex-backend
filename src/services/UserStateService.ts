/**
 * Сервис для отслеживания состояния пользователей в боте
 */

export interface UserState {
  userId: number;
  action: string; // 'freepik_photo', 'midjourney_photo', 'chatgpt', etc.
  step: string; // 'waiting_prompt', 'waiting_image', 'processing'
  data?: any; // дополнительные данные
  createdAt: Date;
}

class UserStateService {
  private states = new Map<number, UserState>();

  // Установить состояние пользователя
  setState(userId: number, action: string, step: string = 'waiting_prompt', data?: any): void {
    this.states.set(userId, {
      userId,
      action,
      step,
      data,
      createdAt: new Date()
    });
  }

  // Получить состояние пользователя
  getState(userId: number): UserState | null {
    return this.states.get(userId) || null;
  }

  // Обновить шаг в текущем состоянии
  updateStep(userId: number, step: string, data?: any): void {
    const currentState = this.states.get(userId);
    if (currentState) {
      currentState.step = step;
      if (data !== undefined) {
        currentState.data = { ...currentState.data, ...data };
      }
    }
  }

  // Очистить состояние пользователя
  clearState(userId: number): void {
    this.states.delete(userId);
  }

  // Проверить, ожидает ли пользователь ввода
  isWaitingForInput(userId: number): boolean {
    const state = this.states.get(userId);
    return state ? state.step.includes('waiting') : false;
  }

  // Получить действие пользователя
  getUserAction(userId: number): string | null {
    const state = this.states.get(userId);
    return state ? state.action : null;
  }

  // Очистка старых состояний (старше 1 часа)
  cleanupOldStates(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const [userId, state] of this.states.entries()) {
      if (state.createdAt < oneHourAgo) {
        this.states.delete(userId);
      }
    }
  }

  // Получить все активные состояния (для отладки)
  getAllStates(): UserState[] {
    return Array.from(this.states.values());
  }
}

// Экспортируем единственный экземпляр
export const userStateService = new UserStateService();

// Запускаем очистку каждые 30 минут
setInterval(() => {
  userStateService.cleanupOldStates();
}, 30 * 60 * 1000);
