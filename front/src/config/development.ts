// Конфигурация для разработки
export const developmentConfig = {
  // URL бэкенда
  API_URL: import.meta.env.VITE_APP_HOST_URL || 'https://aicexaibot-production.up.railway.app',
  
  // Мок данные для разработки вне Telegram
  MOCK_TELEGRAM_USER: {
    id: 123456789,
    first_name: 'Тест',
    last_name: 'Пользователь',
    username: 'testuser',
    language_code: 'ru',
    is_premium: false
  },
  
  // Мок initData для разработки
  MOCK_INIT_DATA: 'query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22%D0%A2%D0%B5%D1%81%D1%82%22%2C%22last_name%22%3A%22%D0%9F%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D1%82%D0%B5%D0%BB%D1%8C%22%2C%22username%22%3A%22testuser%22%2C%22language_code%22%3A%22ru%22%7D&auth_date=1640995200&hash=6adc09e8e85b667b670dcdb4652b2e78467f7c7873cb3c0a5a92af55570e24fd'
};

// Проверяем, запущено ли приложение в Telegram WebApp
export const isTelegramWebApp = () => {
  return typeof window !== 'undefined' && 
         window.Telegram?.WebApp && 
         window.Telegram.WebApp.initData;
};

// Получаем данные пользователя (из Telegram или мок)
export const getTelegramUser = () => {
  if (isTelegramWebApp()) {
    return window.Telegram.WebApp.initDataUnsafe.user;
  }
  
  // Возвращаем мок данные для разработки
  return developmentConfig.MOCK_TELEGRAM_USER;
};

// Получаем initData (из Telegram или мок)
export const getInitData = () => {
  if (isTelegramWebApp()) {
    return window.Telegram.WebApp.initData;
  }
  
  // Возвращаем мок данные для разработки
  return developmentConfig.MOCK_INIT_DATA;
};
