import crypto from "crypto";
import fetch from 'node-fetch';

const base = process.env.LAVA_API_BASE || 'https://api.lava.ru';
const shopId = process.env.LAVA_SHOP_ID!;
const secret = process.env.LAVA_SECRET_KEY!;

function hmacSignature(rawJson: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(rawJson, "utf8").digest("hex");
}

async function postSigned<T>(path: string, payload: Record<string, any>) {
  // важен порядок ключей — формируй явный объект в нужной последовательности
  const body = JSON.stringify(payload);
  const sig = hmacSignature(body, secret);
  
  console.log('🔍 LAVA API Request:', {
    url: `${base}${path}`,
    payload,
    signature: sig
  });
  
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Signature': sig,
    },
    body,
  });

  const responseText = await response.text();
  console.log('🔍 LAVA API Response:', {
    status: response.status,
    responseText
  });

  let data: T;
  try {
    data = JSON.parse(responseText) as T;
  } catch (e) {
    throw new Error(`Invalid JSON response: ${responseText}`);
  }

  if (!response.ok) {
    throw new Error(`LAVA API Error ${response.status}: ${responseText}`);
  }

  return data;
}

export const Lava = {
  // 1) продукты/периоды
  listProducts() {
    const payload = { shopId };
    return postSigned("/business/recurrent/products", payload);
  },

  // 2) подписчик
  createConsumer({ consumerId, email, phone }: {consumerId: string; email: string; phone?: string;}) {
    const payload = { shopId, consumerId, email, phone };
    return postSigned("/business/recurrent/create-consumer", payload);
  },

  // 3) оформить подписку
  createSubscription({ productId, consumerId, orderId }: 
    { productId: string; consumerId: string; orderId: string; }) {
    const payload = { shopId, productId, consumerId, orderId };
    return postSigned("/business/recurrent/create-subscription", payload);
  },

  // 4) статус
  getStatusBy({ subscriptionId, orderId }: 
    { subscriptionId?: string; orderId?: string; }) {
    const payload = { shopId, ...(subscriptionId ? {subscriptionId} : {orderId}) };
    return postSigned("/business/recurrent/subscription-status", payload);
  },

  // 5) перенести дату следующего платежа
  offsetNextPay({ subscriptionId, orderId, days }: 
    { subscriptionId?: string; orderId?: string; days: number; }) {
    const payload = { shopId, days: String(days), ...(subscriptionId ? {subscriptionId} : {orderId}) };
    return postSigned("/business/recurrent/offset-paytime", payload);
  },

  // 6) деактивировать
  unsubscribe({ subscriptionId, orderId }: 
    { subscriptionId?: string; orderId?: string; }) {
    const payload = { shopId, ...(subscriptionId ? {subscriptionId} : {orderId}) };
    return postSigned("/business/recurrent/unsubscribe", payload);
  },
};
