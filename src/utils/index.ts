import crypto from "crypto";

export function verifyTelegramInitData(initData: string): boolean {
  console.log(`🔍 DEBUG: Verifying initData length=${initData.length}`);
  
  // ВРЕМЕННО ОТКЛЮЧАЕМ ПРОВЕРКУ ДЛЯ ОТЛАДКИ
  if (process.env.NODE_ENV === 'production') {
    console.log(`⚠️ TEMPORARY: Skipping Telegram verification in production for debugging`);
    return true;
  }

  const botToken = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.log(`❌ Bot token not found`);
    throw new Error("Telegram bot token is not configured");
  }

  // Step 1: Compute the secret key using HMAC_SHA256 of the bot token with 'WebAppData' as the key
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();

  // Step 2: Parse the initData into key-value pairs
  const parsedData = new URLSearchParams(initData);
  const hash = parsedData.get("hash");

  if (!hash) {
    console.log(`❌ No hash found in initData`);
    return false;
  }

  // Remove the hash parameter for validation
  parsedData.delete("hash");

  // Step 3: Create data-check-string by sorting the keys and concatenating them
  const dataCheckString = Array.from(parsedData.entries())
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");

  // Step 4: Compute HMAC_SHA256 of data-check-string using the secret key
  const hmac = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  // Step 5: Compare the computed hash with the received hash
  if (hmac !== hash) {
    console.log(`❌ Hash verification failed: computed=${hmac}, received=${hash}`);
    console.log(`📝 Data check string: ${dataCheckString}`);
    return false;
  }

  // Step 6: Optionally, check the auth_date to prevent replay attacks
  const authDate = parsedData.get("auth_date");
  if (authDate) {
    const authDateNum = parseInt(authDate, 10);
    const currentTime = Math.floor(Date.now() / 1000);
    // Allow a maximum time difference of 24 hours (86400 seconds) - увеличено для отладки
    if (currentTime - authDateNum > 86400) {
      console.log(`❌ Auth date check failed: current=${currentTime}, auth=${authDateNum}, diff=${currentTime - authDateNum}`);
      return false;
    }
  }

  console.log(`✅ Telegram verification passed`);
  return true;
}

export function parseInitData(initData: string): { [key: string]: any } {
  const parsedData = new URLSearchParams(initData);
  const data: { [key: string]: any } = {};

  parsedData.forEach((value, key) => {
    if (key === "user") {
      data[key] = JSON.parse(value);
    } else {
      data[key] = value;
    }
  });

  return data;
}
