import { Router } from "express";
import { prisma } from "../utils/prismaClient";
import { Bot } from "grammy";
import { logger } from "../utils/logger";
import crypto from "crypto";

const router = Router();

// Создаем бота только если токен доступен
let bot: Bot | null = null;
if (process.env.BOT_TOKEN) {
  bot = new Bot(process.env.BOT_TOKEN);
} else {
  logger.warn("BOT_TOKEN not provided, Freepik webhook bot functionality will be disabled");
}

// 🧪 TEST ENDPOINT - симуляция готового изображения для тестирования
router.get("/test-webhook/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    console.log(`🧪 TEST: Симулируем получение готового изображения для task ${taskId}`);
    
    // Найти задачу в базе данных
    const task = await prisma.freepikTask.findUnique({
      where: { taskId: taskId }
    });
    
    if (!task) {
      return res.status(404).json({ error: `Task ${taskId} not found` });
    }
    
    console.log(`📦 Found task for user ${task.userId}`);
    
    // Проверяем тип задачи и отправляем соответствующий контент
    if (task.type === "video") {
      // Симулируем тестовое видео (очень простой MP4 base64)
      const testVideoBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
      
      // Отправляем видео пользователю  
      await sendVideoToUser(task.userId, task.prompt, testVideoBase64, taskId, task.model);
    } else {
      // Симулируем простое тестовое изображение (красный квадрат 100x100)
      const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
      
      // Отправляем изображение пользователю
      await sendImageToUser(task.userId, task.prompt, testImageBase64, taskId);
    }
    
    // Обновляем статус в базе
    await prisma.freepikTask.update({
      where: { taskId: taskId },
      data: {
        status: "COMPLETED",
        response: JSON.stringify({ test: true, completed_at: new Date().toISOString() })
      }
    });
    
    res.json({ 
      message: "✅ Test webhook processed successfully", 
      taskId,
      userId: task.userId,
      action: "Image sent to Telegram"
    });
  } catch (error) {
    console.error("❌ Test webhook error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// Freepik webhook secret
const FREEPIK_WEBHOOK_SECRET = "32ee5e783f53d4fbb76c1b830c08b285";

// Функция для проверки подписи webhook согласно документации Freepik
function verifyWebhookSignature(headers: any, body: string): boolean {
  const webhookId = headers['webhook-id'];
  const webhookTimestamp = headers['webhook-timestamp'];
  const webhookSignature = headers['webhook-signature'];

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    console.log("❌ Missing webhook headers");
    return false;
  }

  // Генерируем строку для подписи: webhook-id.webhook-timestamp.body
  const contentToSign = `${webhookId}.${webhookTimestamp}.${body}`;
  
  // Генерируем подпись с помощью HMAC-SHA256
  const secretKeyBytes = Buffer.from(FREEPIK_WEBHOOK_SECRET, 'utf-8');
  const hmacBytes = crypto.createHmac('sha256', secretKeyBytes).update(contentToSign, 'utf-8').digest();
  const generatedSignature = Buffer.from(hmacBytes).toString('base64');

  // Проверяем подпись (может быть несколько версий через пробел)
  const signatures = webhookSignature.split(' ');
  for (const signature of signatures) {
    const [version, expectedSignature] = signature.split(',');
    if (expectedSignature === generatedSignature) {
      console.log("✅ Webhook signature verified");
      return true;
    }
  }

  console.log("❌ Webhook signature verification failed");
  console.log("Expected signatures:", signatures);
  console.log("Generated signature:", generatedSignature);
  return false;
}

// Webhook endpoint для получения готовых изображений от Freepik
router.post("/webhook", async (req, res) => {
  try {
    console.log("🔔 Freepik webhook received");
    console.log("Headers:", req.headers);
    
    const body = JSON.stringify(req.body);
    
    // Проверяем подпись webhook для безопасности
    if (!verifyWebhookSignature(req.headers, body)) {
      logger.error("Webhook signature verification failed");
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    console.log("📋 Webhook body:", body);
    const { task_id, status, data } = req.body;
    
    if (!task_id) {
      logger.error("Webhook missing task_id");
      return res.status(400).json({ error: "Missing task_id" });
    }

    // Находим задачу в базе данных
    const freepikTask = await prisma.freepikTask.findUnique({
      where: { taskId: task_id }
    });

    if (!freepikTask) {
      logger.error(`Task not found: ${task_id}`);
      return res.status(404).json({ error: "Task not found" });
    }

    // Обновляем статус задачи
    await prisma.freepikTask.update({
      where: { taskId: task_id },
      data: { 
        status: status,
        response: JSON.stringify(req.body)
      }
    });

    // Если задача завершена успешно
    if (status === "COMPLETED" && data?.generated && data.generated.length > 0) {
      const generatedData = data.generated[0];
      
      // Проверяем тип задачи - изображение или видео
      if (freepikTask.type === "video") {
        // Обработка видео
        if (generatedData.video_url) {
          await sendVideoUrlToUser(freepikTask.userId, freepikTask.prompt, generatedData.video_url, task_id, freepikTask.model);
        } else if (generatedData.base64) {
          await sendVideoToUser(freepikTask.userId, freepikTask.prompt, generatedData.base64, task_id, freepikTask.model);
        } else {
          logger.warn(`Video task ${task_id} completed but no video data found`);
        }
      } else {
        // Обработка изображения (по умолчанию)
        if (generatedData.base64) {
          // Отправляем изображение пользователю
          await sendImageToUser(freepikTask.userId, freepikTask.prompt, generatedData.base64, task_id);
        } else if (generatedData.url) {
          // Отправляем ссылку на изображение
          await sendImageUrlToUser(freepikTask.userId, freepikTask.prompt, generatedData.url, task_id);
        } else {
          logger.warn(`Image task ${task_id} completed but no image data found`);
        }
      }
    } else if (status === "FAILED") {
      // Уведомляем пользователя об ошибке
      await sendErrorToUser(freepikTask.userId, freepikTask.prompt, task_id, data?.error || "Unknown error");
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Freepik webhook error:", error);
    logger.error("Freepik webhook error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Отправка изображения (base64) пользователю
async function sendImageToUser(userId: string, prompt: string, base64Data: string, taskId: string) {
  try {
    if (!bot) {
      logger.error("Bot not initialized, cannot send image");
      return;
    }
    
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    await bot.api.sendPhoto(
      parseInt(userId),
      new (await import("grammy/types")).InputFile(imageBuffer, "freepik_generated.jpg"),
      {
        caption: 
          `🎨 Изображение готово!\n\n` +
          `📝 Промпт: ${prompt}\n` +
          `🤖 Сгенерировано через Freepik API\n` +
          `📊 Task ID: ${taskId}\n\n` +
          `✨ Ваше изображение создано успешно!`,
      }
    );
    
    logger.info(`✅ Image sent to user ${userId} for task ${taskId}`);
  } catch (error) {
    logger.error(`Failed to send image to user ${userId}:`, error);
  }
}

// Отправка ссылки на изображение пользователю
async function sendImageUrlToUser(userId: string, prompt: string, imageUrl: string, taskId: string) {
  try {
    if (!bot) {
      logger.error("Bot not initialized, cannot send image URL");
      return;
    }
    
    await bot.api.sendMessage(
      parseInt(userId),
      `🎨 Изображение готово!\n\n` +
      `📝 Промпт: ${prompt}\n` +
      `🤖 Сгенерировано через Freepik API\n` +
      `📊 Task ID: ${taskId}\n\n` +
      `🖼️ [Открыть изображение](${imageUrl})\n\n` +
      `✨ Ваше изображение создано успешно!`,
      { parse_mode: "Markdown" }
    );
    
    logger.info(`✅ Image URL sent to user ${userId} for task ${taskId}`);
  } catch (error) {
    logger.error(`Failed to send image URL to user ${userId}:`, error);
  }
}

// Отправка ошибки пользователю
async function sendErrorToUser(userId: string, prompt: string, taskId: string, errorMessage: string) {
  try {
    if (!bot) {
      logger.error("Bot not initialized, cannot send error message");
      return;
    }
    
    await bot.api.sendMessage(
      parseInt(userId),
      `❌ Ошибка генерации изображения\n\n` +
      `📝 Промпт: ${prompt}\n` +
      `📊 Task ID: ${taskId}\n` +
      `🚫 Ошибка: ${errorMessage}\n\n` +
      `💡 Попробуйте:\n` +
      `• Изменить промпт\n` +
      `• Использовать другую модель\n` +
      `• Создать новое изображение`,
    );
    
    logger.info(`📧 Error notification sent to user ${userId} for task ${taskId}`);
  } catch (error) {
    logger.error(`Failed to send error to user ${userId}:`, error);
  }
}

// 🎬 NEW: Отправка видео (base64) пользователю
async function sendVideoToUser(userId: string, prompt: string, base64Data: string, taskId: string, model: string) {
  try {
    if (!bot) {
      logger.error("Bot not initialized, cannot send video");
      return;
    }
    
    const videoBuffer = Buffer.from(base64Data, 'base64');
    
    await bot.api.sendVideo(
      parseInt(userId),
      new (await import("grammy/types")).InputFile(videoBuffer, "freepik_generated.mp4"),
      {
        caption: 
          `🎬 Видео готово!\n\n` +
          `📝 Промпт: ${prompt}\n` +
          `🎭 Модель: ${model}\n` +
          `🤖 Сгенерировано через Freepik API\n` +
          `📊 Task ID: ${taskId}\n\n` +
          `✨ Ваше видео создано успешно!`,
        reply_markup: new (await import("grammy")).InlineKeyboard()
          .text("🔄 Создать еще видео", "freepik_video_gen")
          .row()
          .text("🏠 Главное меню", "start")
      }
    );
    
    logger.info(`✅ Video sent to user ${userId} for task ${taskId}`);
  } catch (error) {
    logger.error(`Failed to send video to user ${userId}:`, error);
  }
}

// 🎬 NEW: Отправка ссылки на видео пользователю
async function sendVideoUrlToUser(userId: string, prompt: string, videoUrl: string, taskId: string, model: string) {
  try {
    if (!bot) {
      logger.error("Bot not initialized, cannot send video URL");
      return;
    }
    
    await bot.api.sendMessage(
      parseInt(userId),
      `🎬 Видео готово!\n\n` +
      `📝 Промпт: ${prompt}\n` +
      `🎭 Модель: ${model}\n` +
      `🤖 Сгенерировано через Freepik API\n` +
      `📊 Task ID: ${taskId}\n\n` +
      `🎥 [Открыть видео](${videoUrl})\n\n` +
      `✨ Ваше видео создано успешно!`,
      { 
        parse_mode: "Markdown",
        reply_markup: new (await import("grammy")).InlineKeyboard()
          .text("🔄 Создать еще видео", "freepik_video_gen")
          .row()
          .text("🏠 Главное меню", "start")
      }
    );
    
    logger.info(`✅ Video URL sent to user ${userId} for task ${taskId}`);
  } catch (error) {
    logger.error(`Failed to send video URL to user ${userId}:`, error);
  }
}

export default router;
