<script setup lang="ts">
// Icons removed - not used in template
</script>

<template>
  <div class="overflow-y-auto">
    <div class="bg-[#202021] w-full h-[84px] rounded-2xl p-2 flex flex-col mb-4">
      <div class="flex flex-row justify-between p-2">
        <span class="text-white text-sm">Тарифный план</span>
        <span class="text-white text-xs">Бесплатный</span>
      </div>
      <div class="flex flex-row justify-between p-2">
        <span class="text-white text-sm">Доступно пробных запросов</span>
        <span class="text-white text-xs">5</span>
      </div>
    </div>
    <div class="bg-[#202021] w-full h-xs rounded-2xl p-4">
      <div class="flex flex-row justify-between items-center mb-6">
        <span class="text-white text-lg">Модель</span>
        <div class="text-white rounded-3xl border p-2">
          <select
            name="model"
            id="model"
            class="rounded-2xl text-sm">
            <option value="gpt_o1_mini">GPT o1-Mini</option>
          </select>
        </div>
      </div>
      <div class="flex flex-col mt-2">
        <p class="text-white text-xs">
          Компактная и быстрая версия, которая сохраняет мощные логические возможности, но при этом ориентирована на STEM-дисциплины (математика, технологии, инженерия, программирование). Если вам
          требуется скорость и высокая производительность для решения технических задач без необходимости в обширных мировых знаниях, o1-mini станет вашим лучшим помощником. Работает значительно
          быстрее благодаря своей оптимизированной структуре.
        </p>
        <p class="text-white text-sm font-medium mt-2">Дополнительные возможности:</p>
        <ul class="text-xs text-white">
          <li>• Голосовое управление</li>
          <li>• Выход в интернет</li>
          <li>• Генерация изображений</li>
          <li>• Обработка изображений</li>
          <li>• Обработка файлов</li>
          <li>• Преднастройки</li>
          <li>• Выдача файлов</li>
        </ul>
        <p class="text-white text-xs">в режиме beta тестирования (может не работать).</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss"></style>
