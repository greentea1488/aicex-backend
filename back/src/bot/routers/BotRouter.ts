import { Context } from "grammy";

export type HandlerFunction = (ctx: Context) => Promise<void>;

export class BotRouter {
  private handlers: Map<string, HandlerFunction> = new Map();
  
  /**
   * Регистрирует обработчик для паттерна
   */
  register(pattern: string, handler: HandlerFunction): void {
    this.handlers.set(pattern, handler);
  }
  
  /**
   * Маршрутизирует callback query к нужному обработчику
   */
  async route(ctx: Context): Promise<boolean> {
    const data = ctx.callbackQuery?.data;
    if (!data) return false;
    
    const handler = this.findHandler(data);
    if (handler) {
      await handler(ctx);
      return true;
    }
    
    return false;
  }
  
  /**
   * Находит подходящий обработчик для данных
   */
  private findHandler(data: string): HandlerFunction | undefined {
    // Точное совпадение
    if (this.handlers.has(data)) {
      return this.handlers.get(data);
    }
    
    // Поиск по префиксу
    for (const [pattern, handler] of this.handlers.entries()) {
      if (data.startsWith(pattern + '_')) {
        return handler;
      }
    }
    
    return undefined;
  }
  
  /**
   * Возвращает количество зарегистрированных обработчиков
   */
  getHandlerCount(): number {
    return this.handlers.size;
  }
}
