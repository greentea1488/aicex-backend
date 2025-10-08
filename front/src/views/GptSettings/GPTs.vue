<script setup lang="ts">
import SearchIcon from "@/assets/img/search.svg";
import HeartIcon from "@/assets/img/heart.svg";
import { ref } from "vue";

const gpts = ref([]);
</script>

<template>
  <div class="overflow-y-auto">
    <div class="bg-[#202021] w-full h-[64px] rounded-2xl flex flex-col mb-4">
      <div class="flex flex-row justify-between p-3">
        <span class="text-white text-sm">Выберите категорию</span>
        <div class="text-white rounded-3xl border p-2">
          <select
            name="all_model"
            id="all_model"
            class="rounded-2xl text-sm"
            placeholder="Категория">
            <option value="default">Категория</option>
          </select>
        </div>
      </div>
    </div>
    <div class="w-full h-[49px] border border-gray-500 rounded-2xl p-3 flex flex-row justify-between">
      <input
        type="text"
        placeholder="Поиск GPT's"
        class="text-white flex-1" />
      <SearchIcon />
    </div>
    <template v-if="gpts.length">
      <div class="w-full bg-[#202021] rounded-2xl p-2 gap-2 relative mt-4">
        <div>
          <div class="absolute right-3">
            <HeartIcon />
          </div>
          <div class="flex gap-2">
            <img
              src="@/assets/img/logo.png"
              alt="Аватарка"
              class="w-12 h-12" />
            <div class="flex flex-col content-start items-start justify-start text-white p-1">
              <div class="text-sm">Prompt Professor</div>
              <p class="text-xs text-gray-500">Образование</p>
            </div>
          </div>
        </div>
        <div class="w-full h-[65px] p-1">
          <span class="text-[11px] text-white"
            >Помощник в области составления запросов, помогает формулировать и улучшать запросы к ИИ чтобы получать точные и полезные ответы. Объясняет принципы, оценивает другие промпты рекомендует
            улучшения.</span
          >
        </div>
        <div class="bg-white rounded-3xl mt-10 flex justify-center w-full h-[36px]">
          <button class="text-center text-blue-900 font-medium">Включить</button>
        </div>
      </div>
      <div class="w-full bg-[#202021] rounded-2xl p-2 gap-2 relative mt-4">
        <div>
          <div class="absolute right-3">
            <HeartIcon />
          </div>
          <div class="flex gap-2">
            <img
              src="@/assets/img/logo2.png"
              alt="Аватарка"
              class="w-12 h-12" />
            <div class="flex flex-col content-start items-start justify-start text-white p-1">
              <div class="text-sm">Logo Creator</div>
              <p class="text-xs text-gray-500">DALL·E</p>
            </div>
          </div>
        </div>
        <div class="w-full h-[65px] p-1">
          <span class="text-[11px] text-white"></span>
        </div>
        <div class="bg-white rounded-3xl mt-10 flex justify-center w-full h-[36px]">
          <button class="text-center text-blue-900 font-medium">Включить</button>
        </div>
      </div>
    </template>

    <div
      class="flex justify-center mt-4"
      v-else>
      <span class="text-white text-center text-sm">Поиск не дал результатов</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
input::placeholder {
  color: white;
}
</style>
