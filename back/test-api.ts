import { config } from "dotenv";
config();

import express from 'express';
import { getSubscriptionPlans } from './src/controllers/paymentController';

// Тестируем API endpoint напрямую
async function testAPI() {
  console.log('🧪 Testing API endpoints...\n');

  // Мокаем req и res
  const mockReq = {} as any;
  const mockRes = {
    json: (data: any) => {
      console.log('✅ API Response:', JSON.stringify(data, null, 2));
    },
    status: (code: number) => ({
      json: (data: any) => {
        console.log(`❌ API Error ${code}:`, JSON.stringify(data, null, 2));
      }
    })
  } as any;

  try {
    console.log('📋 Testing getSubscriptionPlans...');
    await getSubscriptionPlans(mockReq, mockRes);
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

testAPI();
