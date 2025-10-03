import { Context as GrammyContext, SessionFlavor } from 'grammy';

/**
 * Типы для сессии Freepik
 */
export interface FreepikSession {
  selectedModel?: string;
  modelType?: 'image' | 'video';
  settings?: {
    resolution?: string;
    style?: string;
    aspectRatio?: string;
    duration?: string;
    quality?: string;
  };
  waitingForPrompt?: boolean;
  waitingForImage?: boolean;
  currentImageUrl?: string;
}

/**
 * Общая сессия бота
 */
export interface SessionData {
  freepik?: FreepikSession;
  currentService?: string;
  userId?: number;
  username?: string;
}

/**
 * Расширенный контекст с сессией
 */
export type Context = GrammyContext & SessionFlavor<SessionData>;
