/**
 * Утилиты для безопасной работы с датами
 */

/**
 * Безопасное форматирование даты
 * @param dateInput - дата в любом формате
 * @param locale - локаль (по умолчанию 'ru-RU')
 * @param options - опции форматирования
 * @returns отформатированная дата или 'Неизвестно'
 */
export function formatDate(
  dateInput: string | number | Date | null | undefined,
  locale: string = 'ru-RU',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
): string {
  if (!dateInput) {
    return 'Неизвестно';
  }

  try {
    const date = new Date(dateInput);
    
    // Проверяем, является ли дата валидной
    if (isNaN(date.getTime())) {
      return 'Неизвестно';
    }

    return date.toLocaleDateString(locale, options);
  } catch (error) {
    console.warn('Error formatting date:', error);
    return 'Неизвестно';
  }
}

/**
 * Форматирование даты и времени
 * @param dateInput - дата в любом формате
 * @param locale - локаль (по умолчанию 'ru-RU')
 * @returns отформатированная дата и время или 'Неизвестно'
 */
export function formatDateTime(
  dateInput: string | number | Date | null | undefined,
  locale: string = 'ru-RU'
): string {
  return formatDate(dateInput, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Относительное время (например, "2 часа назад")
 * @param dateInput - дата в любом формате
 * @returns относительное время или 'Неизвестно'
 */
export function formatRelativeTime(
  dateInput: string | number | Date | null | undefined
): string {
  if (!dateInput) {
    return 'Неизвестно';
  }

  try {
    const date = new Date(dateInput);
    
    if (isNaN(date.getTime())) {
      return 'Неизвестно';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'Только что';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} мин. назад`;
    } else if (diffHours < 24) {
      return `${diffHours} ч. назад`;
    } else if (diffDays < 7) {
      return `${diffDays} дн. назад`;
    } else {
      return formatDate(date);
    }
  } catch (error) {
    console.warn('Error formatting relative time:', error);
    return 'Неизвестно';
  }
}

/**
 * Проверка валидности даты
 * @param dateInput - дата в любом формате
 * @returns true если дата валидна
 */
export function isValidDate(dateInput: any): boolean {
  if (!dateInput) return false;
  
  try {
    const date = new Date(dateInput);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}
