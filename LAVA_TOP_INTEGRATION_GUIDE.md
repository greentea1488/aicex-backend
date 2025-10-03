# 🔥 Полная инструкция по интеграции Lava.top

## 📋 Содержание
1. [Настройка аккаунта Lava.top](#настройка-аккаунта-lava-top)
2. [Конфигурация переменных окружения](#конфигурация-переменных-окружения)
3. [Настройка webhook'ов](#настройка-webhooks)
4. [Логика подписок и токенов](#логика-подписок-и-токенов)
5. [API endpoints](#api-endpoints)
6. [Тестирование](#тестирование)

## 🚀 1. Настройка аккаунта Lava.top

### Шаг 1: Регистрация и верификация
1. Зарегистрируйтесь на [lava.top](https://lava.top)
2. Пройдите верификацию (загрузите документы)
3. Дождитесь одобрения аккаунта

### Шаг 2: Создание проекта
1. Войдите в личный кабинет
2. Перейдите в раздел "Проекты"
3. Создайте новый проект "AICEX AI Bot"
4. Укажите описание: "AI-сервис для генерации изображений и видео"

### Шаг 3: Получение API ключей
В настройках проекта найдите:
- **API Key** - для создания платежей
- **Secret Key** - для валидации webhook'ов
- **Project ID** - идентификатор проекта

## 🔧 2. Конфигурация переменных окружения

Добавьте в Railway Variables:

```env
# Lava.top API Configuration
LAVA_TOP_API_KEY=your_api_key_here
LAVA_TOP_SECRET_KEY=your_secret_key_here
LAVA_TOP_PROJECT_ID=your_project_id_here
LAVA_TOP_API_URL=https://api.lava.top/business/invoice

# Webhook URLs (замените на ваш домен)
LAVA_TOP_WEBHOOK_URL=https://your-domain.railway.app/api/webhooks/lava-top
LAVA_TOP_SUCCESS_URL=https://your-frontend-domain.com/payment/success
LAVA_TOP_FAIL_URL=https://your-frontend-domain.com/payment/fail
```

## 🔗 3. Настройка webhook'ов

### В личном кабинете Lava.top:
1. Перейдите в настройки проекта
2. Найдите раздел "Webhook'и"
3. Добавьте URL: `https://your-domain.railway.app/api/webhooks/lava-top`
4. Выберите события:
   - `invoice.paid` - успешная оплата
   - `invoice.expired` - истечение срока
   - `invoice.cancelled` - отмена платежа

### Формат webhook'а от Lava.top:
```json
{
  "id": "invoice_id",
  "status": "paid|expired|cancelled",
  "amount": 1000.00,
  "currency": "RUB",
  "order_id": "sub_pro_123456789_1728000000000",
  "created_at": "2024-01-01T12:00:00Z",
  "paid_at": "2024-01-01T12:05:00Z",
  "signature": "sha256_hash"
}
```

## 💰 4. Логика подписок и токенов

### 4.1 Структура Order ID

Для правильной обработки платежей используем следующий формат:

```typescript
// Подписки: sub_{plan}_{telegramId}_{timestamp}
// Примеры:
"sub_basic_123456789_1728000000000"   // Basic подписка
"sub_pro_123456789_1728000000000"     // Pro подписка  
"sub_premium_123456789_1728000000000" // Premium подписка

// Токены: tokens_{amount}_{telegramId}_{timestamp}
// Примеры:
"tokens_1000_123456789_1728000000000"  // 1000 токенов
"tokens_5000_123456789_1728000000000"  // 5000 токенов
```

### 4.2 Тарифные планы

```typescript
const SUBSCRIPTION_PLANS = {
  basic: {
    name: 'Basic',
    price: 920,        // рублей в месяц
    tokensPerMonth: 1000,
    features: ['Базовые модели AI', 'Стандартная поддержка']
  },
  pro: {
    name: 'Pro', 
    price: 2760,       // рублей в месяц
    tokensPerMonth: 5000,
    features: ['Все модели AI', 'Приоритетная поддержка', 'Расширенные настройки']
  },
  premium: {
    name: 'Premium',
    price: 4600,       // рублей в месяц  
    tokensPerMonth: 10000,
    features: ['Безлимитные модели', 'VIP поддержка', 'API доступ', 'Кастомные модели']
  }
};

const TOKEN_PACKAGES = {
  small: { tokens: 1000, price: 143 },   // 1000 токенов = 143 рубля
  medium: { tokens: 5000, price: 715 },  // 5000 токенов = 715 рублей  
  large: { tokens: 10000, price: 1430 }, // 10000 токенов = 1430 рублей
  xl: { tokens: 25000, price: 3575 }     // 25000 токенов = 3575 рублей
};
```

### 4.3 Логика начисления токенов

```typescript
// При успешной оплате подписки:
1. Создать/обновить запись в таблице subscriptions
2. Начислить месячные токены согласно тарифу
3. Установить дату окончания подписки (+30 дней)
4. Отправить уведомление пользователю

// При успешной покупке токенов:
1. Добавить токены к текущему балансу
2. Создать запись в token_history
3. Отправить уведомление пользователю
```

## 🛠 5. API Endpoints

### 5.1 Создание платежа за подписку

```http
POST /api/lava-top/subscription
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "plan": "pro",           // basic|pro|premium
  "duration": 1            // месяцев (пока только 1)
}
```

**Ответ:**
```json
{
  "success": true,
  "paymentId": "lava_1728000000000",
  "paymentUrl": "https://pay.lava.top/invoice/abc123",
  "orderId": "sub_pro_123456789_1728000000000",
  "amount": 2760,
  "currency": "RUB"
}
```

### 5.2 Создание платежа за токены

```http
POST /api/lava-top/tokens
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "amount": 5000          // количество токенов
}
```

**Ответ:**
```json
{
  "success": true,
  "paymentId": "lava_1728000000001", 
  "paymentUrl": "https://pay.lava.top/invoice/def456",
  "orderId": "tokens_5000_123456789_1728000000001",
  "amount": 715,
  "currency": "RUB"
}
```

### 5.3 Webhook endpoint

```http
POST /api/webhooks/lava-top
Content-Type: application/json
X-Lava-Signature: sha256_hash

{
  "id": "invoice_123",
  "status": "paid",
  "amount": 2760,
  "currency": "RUB", 
  "order_id": "sub_pro_123456789_1728000000000",
  "signature": "calculated_signature"
}
```

## 🧪 6. Тестирование

### 6.1 Локальное тестирование

1. **Установите ngrok** для тестирования webhook'ов:
```bash
npm install -g ngrok
ngrok http 8080
```

2. **Используйте тестовый URL** в настройках Lava.top:
```
https://abc123.ngrok.io/api/webhooks/lava-top
```

### 6.2 Тестовые платежи

Lava.top предоставляет тестовую среду:
- Используйте тестовые API ключи
- Тестовые платежи не списывают реальные деньги
- Webhook'и приходят как в продакшене

### 6.3 Проверка интеграции

```bash
# 1. Создание тестового платежа
curl -X POST https://your-domain.railway.app/api/lava-top/subscription \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{"plan": "pro", "duration": 1}'

# 2. Проверка webhook'а (имитация от Lava.top)
curl -X POST https://your-domain.railway.app/api/webhooks/lava-top \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test_invoice",
    "status": "paid", 
    "amount": 2760,
    "currency": "RUB",
    "order_id": "sub_pro_123456789_1728000000000",
    "signature": "test_signature"
  }'
```

## ⚠️ Важные моменты

### Безопасность
1. **Всегда проверяйте подпись** webhook'а
2. **Используйте HTTPS** для всех endpoints
3. **Логируйте все операции** для аудита
4. **Проверяйте суммы** перед начислением

### Обработка ошибок
1. **Повторные попытки** для неуспешных webhook'ов
2. **Уведомления администратора** при критических ошибках
3. **Откат операций** при ошибках в БД
4. **Мониторинг платежей** в реальном времени

### Пользовательский опыт
1. **Уведомления в Telegram** о статусе платежей
2. **Редирект на фронтенд** после оплаты
3. **История платежей** в личном кабинете
4. **Автоматическое продление** подписок

---

## 🎯 Следующие шаги

1. ✅ Настроить аккаунт Lava.top
2. ✅ Добавить переменные окружения в Railway
3. ✅ Протестировать создание платежей
4. ✅ Настроить webhook'и
5. ✅ Протестировать полный цикл оплаты
6. ✅ Запустить в продакшен

**После настройки у вас будет полноценная система подписок и покупки токенов через Lava.top!** 🚀
