// MongoDB initialization script
db = db.getSiblingDB('ai-telegram-bot');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['telegramId', 'username', 'tokens'],
      properties: {
        telegramId: {
          bsonType: 'int',
          description: 'Telegram user ID must be an integer'
        },
        username: {
          bsonType: 'string',
          description: 'Username must be a string'
        },
        tokens: {
          bsonType: 'int',
          minimum: 0,
          description: 'Tokens must be a non-negative integer'
        }
      }
    }
  }
});

// Create indexes for better performance
db.users.createIndex({ telegramId: 1 }, { unique: true });
db.users.createIndex({ username: 1 });
db.users.createIndex({ createdAt: 1 });

// Create other collections
db.createCollection('payments');
db.createCollection('tokenHistory');
db.createCollection('chatHistory');
db.createCollection('botChatSessions');

// Create indexes for other collections
db.payments.createIndex({ userId: 1 });
db.payments.createIndex({ createdAt: -1 });
db.payments.createIndex({ status: 1 });

db.tokenHistory.createIndex({ userId: 1 });
db.tokenHistory.createIndex({ createdAt: -1 });
db.tokenHistory.createIndex({ type: 1 });

db.chatHistory.createIndex({ userId: 1 });
db.chatHistory.createIndex({ createdAt: -1 });
db.chatHistory.createIndex({ updatedAt: -1 });

db.botChatSessions.createIndex({ telegramId: 1 });
db.botChatSessions.createIndex({ telegramId: 1, isActive: 1 });
db.botChatSessions.createIndex({ telegramId: 1, aiProvider: 1 }, { unique: true });

print('Database initialized successfully!');
