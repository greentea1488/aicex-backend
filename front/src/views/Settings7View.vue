<script setup lang="ts">
import ToggleOff from "@/assets/img/toggle_off.svg";
</script>

<template>
  <div class="overflow-y-auto">
    <div class="w-full bg-[#202021] mt-6 rounded-xl p-4">
      <span class="text-white font-medium text-sm">Меняйте настройки для более тонкой генерации видео в RunWay. Установки сохраняются на постоянной основе и применяются к каждой генерации</span>
    </div>
    <div class="w-full flex flex-row bg-[#202021] mt-2 rounded-xl p-4 justify-between items-center">
      <span class="text-white font-medium text-sm">Длительность видео</span>
      <select
        name="video"
        id="video"
        class="border border-white rounded-xl text-white px-2">
        <option value="5sec">5 секунд (14.00)</option>
      </select>
    </div>
    <div class="w-full flex flex-col bg-[#202021] rounded-xl mt-2 p-4 gap-2">
      <div class="flex flex-row justify-between items-center">
        <span class="text-white">Seed</span>
        <input
          type="text"
          class="bg-black/20 rounded-3xl text-start px-4 text-white w-[100px]"
          value="12" />
      </div>
      <div class="flex flex-row justify-between items-center">
        <span class="text-white opacity-60">Случайный Seed</span>
        <ToggleOff />
      </div>
    </div>
    <div class="bg-white rounded-3xl text-blue-900 text-center mt-2 py-2 font-medium w-full">
      <button class="w-full">Сохранить</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
select option {
  color: black;
  background: white;
}
</style>
