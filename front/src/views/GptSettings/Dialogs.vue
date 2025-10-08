<script setup lang="ts">
// Icons removed - not used in template
import SearchIcon from "@/assets/img/search.svg";
import EditIcon from "@/assets/img/edit.svg";
import GreenTickIcon from "@/assets/img/green_tick.svg";
import RedCrossIcon from "@/assets/img/red_cross.svg";
</script>

<template>
  <div class="overflow-y-auto">
    <div class="w-full h-[49px] border border-gray-500 rounded-2xl p-3 flex flex-row justify-between">
      <input
        type="text"
        placeholder="Поиск диалога"
        class="text-white flex-1" />
      <SearchIcon />
    </div>
    <div class="flex flex-col gap-2 mt-2">
      <div class="w-full bg-[#202021] rounded-2xl p-4">
        <div class="flex flex-col gap-2">
          <div class="flex flex-row justify-between items-center">
            <div class="flex flex-row gap-2 items-center">
              <span class="text-white text-sm">Название диалога</span>
              <EditIcon class="w-3 h-3" />
            </div>
            <span class="text-gray-500 text-xs">17.06.2025</span>
          </div>
          <div class="flex flex-row justify-between">
            <div class="bg-white rounded-3xl text-blue-900 px-10">
              <button>Перейти</button>
            </div>
            <div class="border border-rose-400 rounded-3xl text-rose-400 px-10">
              <button>Удалить</button>
            </div>
          </div>
        </div>
      </div>
      <div class="w-full bg-[#202021] rounded-2xl p-4">
        <div class="flex flex-col gap-2">
          <div class="flex flex-row justify-between items-center">
            <div class="flex flex-row gap-1 items-center">
              <div class="bg-black/20 px-2 rounded-2xl">
                <span class="text-white text-sm">Меняем название</span>
              </div>
              <GreenTickIcon class="w-3 h-3" />
              <RedCrossIcon class="w-3 h-3" />
            </div>
            <span class="text-gray-500 text-xs">17.06.2025</span>
          </div>
          <div class="flex flex-row justify-between">
            <div class="bg-white rounded-3xl text-blue-900 px-10">
              <button>Перейти</button>
            </div>
            <div class="border border-rose-400 rounded-3xl text-rose-400 px-10">
              <button>Удалить</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
input::placeholder {
  color: white;
}
</style>
