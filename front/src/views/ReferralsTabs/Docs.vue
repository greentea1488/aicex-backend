<script setup lang="ts">
import { ref } from "vue";

const openedAccordion = ref(-1);

const faqItems = ref([
  {
    id: 0,
    title: "Как работает партнерская программа AICEX ONE?",
    content: "Партнерская программа позволяет вам зарабатывать комиссию с каждого пользователя, которого вы пригласили. Вы получаете процент от всех покупок ваших рефералов. Чем больше активных пользователей вы привлечете, тем больше будет ваш доход.",
    icon: "💰"
  },
  {
    id: 1,
    title: "Какой процент комиссии я получаю?",
    content: "Размер комиссии зависит от вашего уровня в партнерской программе. Базовый уровень: 10%, Про уровень: 15%, Премиум уровень: 20%. Уровень определяется количеством активных рефералов и общей суммой продаж.",
    icon: "📊"
  },
  {
    id: 2,
    title: "Как пригласить друзей?",
    content: "Используйте вашу уникальную партнерскую ссылку из раздела 'Баланс'. Поделитесь ею с друзьями через социальные сети, мессенджеры или личные сообщения. Когда друг перейдет по ссылке и зарегистрируется, он станет вашим рефералом.",
    icon: "🔗"
  },
  {
    id: 3,
    title: "Когда я получу выплату?",
    content: "Выплаты производятся еженедельно по пятницам на ваш указанный счет. Минимальная сумма для вывода составляет 1000 рублей. Все выплаты проходят автоматически при достижении минимальной суммы.",
    icon: "💳"
  },
  {
    id: 4,
    title: "Что считается активным рефералом?",
    content: "Активным рефералом считается пользователь, который зарегистрировался по вашей ссылке и совершил хотя бы одну покупку в течение последних 30 дней. Только от активных рефералов вы получаете комиссию.",
    icon: "✅"
  },
  {
    id: 5,
    title: "Могу ли я отслеживать статистику?",
    content: "Да, в разделе 'Рефералы' вы можете отслеживать количество приглашенных пользователей, их активность, общую сумму продаж и ваш заработок. Статистика обновляется в реальном времени.",
    icon: "📈"
  },
  {
    id: 6,
    title: "Политика конфиденциальности",
    content: "Мы строго соблюдаем конфиденциальность ваших данных. Ваша партнерская информация не передается третьим лицам. Все финансовые операции защищены современными методами шифрования.",
    icon: "🔒"
  },
  {
    id: 7,
    title: "Условия и ограничения",
    content: "Запрещается использование спама, накрутка рефералов, создание фейковых аккаунтов. Нарушение правил может привести к блокировке партнерского аккаунта. Мы оставляем за собой право изменять условия программы с уведомлением за 30 дней.",
    icon: "⚠️"
  }
]);

const handleAccordionClick = (index: number) => {
  openedAccordion.value = openedAccordion.value === index ? -1 : index;
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="text-center">
      <div class="w-16 h-16 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      </div>
      <h3 class="text-white font-bold text-xl mb-2">Документация партнерской программы</h3>
      <p class="text-gray-300 text-sm">Все что нужно знать о заработке с AICEX ONE</p>
    </div>

    <!-- FAQ Items -->
    <div class="space-y-4">
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
              <h4 class="text-white font-semibold text-lg leading-relaxed">
                {{ item.title }}
              </h4>
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

    <!-- Contact Support -->
    <div class="relative group">
      <div class="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
      <div class="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 hover:bg-white/15 transition-all duration-500">
        <div class="text-center">
          <div class="w-16 h-16 bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
            </svg>
          </div>
          <h3 class="text-white font-bold text-xl mb-3">Нужна помощь?</h3>
          <p class="text-gray-300 mb-6">
            Если у вас остались вопросы по партнерской программе, свяжитесь с нашей поддержкой
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
            <button class="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center space-x-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
              <span>Написать на email</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop-blur-xl {
  backdrop-filter: blur(24px);
}

* {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>