<script setup lang="ts">
import { ref } from "vue";

const openedAccordion = ref(-1);

const faqItems = ref([
  {
    id: 0,
    title: "Где я могу посмотреть, как пользоваться всеми функциями чат бота AICEX ONE?",
    content: "Все функции доступны через команду /start в боте. Выберите нужный AI-сервис из меню и следуйте инструкциям. Для получения помощи используйте команду /help.",
    icon: "🤖"
  },
  {
    id: 1,
    title: "Чат-бот бесплатный?",
    content: "AICEX ONE предоставляет бесплатный уровень с ограниченными возможностями. Для полного доступа ко всем AI-сервисам доступны платные подписки с различными тарифами.",
    icon: "💰"
  },
  {
    id: 2,
    title: "Что такое токены?",
    content: "Токены - это внутренняя валюта для использования AI-сервисов. 1 токен ≈ 1-2 слова в текстовом ответе, 10-50 токенов за изображение, 100-500 токенов за видео. Токены не сгорают и накапливаются на вашем балансе.",
    icon: "🪙"
  },
  {
    id: 3,
    title: "Как происходит начисление токенов, если я покупаю подписку?",
    content: "При покупке подписки токены начисляются автоматически каждый месяц согласно выбранному тарифу. Базовый план: 100 токенов, Про: 300 токенов, Премиум: 600 токенов в месяц.",
    icon: "📈"
  },
  {
    id: 4,
    title: "Токены на моем балансе сгорают?",
    content: "Нет, токены не сгорают! Они накапливаются на вашем балансе и могут использоваться в любое время. Купленные токены остаются с вами до полного использования.",
    icon: "⏰"
  },
  {
    id: 5,
    title: "Какие AI-сервисы доступны?",
    content: "AICEX ONE поддерживает: ChatGPT (текстовые запросы), Midjourney (генерация изображений), Kling (создание видео), Freepik + Lora (изображения с кастомными стилями), Runway (видео и изображения).",
    icon: "🎨"
  },
  {
    id: 6,
    title: "Как работает реферальная система?",
    content: "Приглашайте друзей по реферальной ссылке и получайте бонусы за каждого приглашенного пользователя. Подробности доступны в разделе 'Партнерство'.",
    icon: "👥"
  },
  {
    id: 7,
    title: "Есть ли ограничения по скорости запросов?",
    content: "Бесплатный уровень: 1 запрос в минуту. Платные подписки: без ограничений по скорости с приоритетной обработкой запросов.",
    icon: "⚡"
  }
]);

const handleAccordionClick = (index: number) => {
  openedAccordion.value = openedAccordion.value === index ? -1 : index;
};
</script>

<template>
  <!-- Animated background elements -->
  <div class="absolute inset-0 overflow-hidden">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
    </div>

    <!-- Main content -->
    <div class="relative z-10 px-6">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
          Часто задаваемые вопросы
        </h1>
        <p class="text-gray-300 text-lg">Найдите ответы на популярные вопросы о AICEX ONE</p>
      </div>

      <!-- FAQ Items -->
      <div class="max-w-4xl mx-auto space-y-4">
        <div
          v-for="(item, index) in faqItems"
          :key="item.id"
          class="group relative"
          @click="handleAccordionClick(index)"
        >
          <!-- Glow effect -->
          <div 
            class="absolute inset-0 rounded-3xl blur-xl transition-all duration-500"
            :class="[
              openedAccordion === index 
                ? 'bg-gradient-to-r from-cyan-500/30 to-purple-500/30 opacity-100 blur-2xl' 
                : 'bg-gradient-to-r from-cyan-500/10 to-purple-500/10 opacity-50 blur-xl'
            ]"
          ></div>
          
          <!-- Card -->
          <div 
            class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 cursor-pointer transition-all duration-500 hover:bg-white/15 hover:scale-[1.02]"
            :class="[
              openedAccordion === index ? 'bg-white/20 border-white/40' : ''
            ]"
          >
            <!-- Question -->
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4 flex-1">
                <div class="text-2xl">{{ item.icon }}</div>
                <h3 class="text-white font-semibold text-lg leading-relaxed">
                  {{ item.title }}
                </h3>
              </div>
              <div class="flex-shrink-0 ml-4">
                <div 
                  class="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center transition-all duration-300"
                  :class="[
                    openedAccordion === index ? 'rotate-180 bg-white/20' : ''
                  ]"
                >
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>

            <!-- Answer -->
            <div 
              class="overflow-hidden transition-all duration-500 ease-in-out"
              :class="[
                openedAccordion === index ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'
              ]"
            >
              <div class="text-gray-300 leading-relaxed border-t border-white/10 pt-4">
                {{ item.content }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Contact section -->
      <div class="mt-12 max-w-2xl mx-auto">
        <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center">
          <div class="text-4xl mb-4">💬</div>
          <h3 class="text-white font-semibold text-xl mb-3">Не нашли ответ?</h3>
          <p class="text-gray-300 mb-6">
            Если у вас остались вопросы, свяжитесь с нашей поддержкой через Telegram бота
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://t.me/AicexOne"
              target="_blank"
              class="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 flex items-center justify-center space-x-2"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              <span>Написать в поддержку</span>
            </a>
            <router-link
              to="/home"
              class="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
              </svg>
              <span>На главную</span>
            </router-link>
          </div>
        </div>
      </div>
    </div>
</template>

<style scoped>
@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}

.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}

.backdrop-blur-xl {
  backdrop-filter: blur(24px);
}

* {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>