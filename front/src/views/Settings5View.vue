<script setup lang="ts">
import InfoQIcon from "@/assets/img/infoq.svg";
import ToggleOnIcon from "@/assets/img/toggle_on.svg";
</script>

<template>
  <div class="overflow-y-auto">
    <div class="w-full bg-[#202021] h-[60px] mt-6 rounded-xl">
      <input
        type="text"
        name="prompt"
        id="prompt"
        placeholder="Введите промпт"
        class="p-2 text-white text-sm w-full h-[60px] rounded-2xl" />
    </div>
    <div class="flex flex-wrap p-4 gap-2 mx-auto w-full">
      <button class="text-xs text-blue-900 bg-white rounded-3xl p-2 px-4">--v 7</button>
      <button class="text-xs text-blue-900 bg-white rounded-3xl p-2 px-4">--quality 1</button>
      <button class="text-xs text-blue-900 bg-white rounded-3xl p-2 px-4">-- ar 4:5</button>
      <button class="text-xs text-blue-900 bg-white rounded-3xl p-2 px-4">--exp 1</button>
      <button class="text-xs text-blue-900 bg-white rounded-3xl p-2 px-4">--chaos 0</button>
      <button class="text-xs text-blue-900 bg-white rounded-3xl p-2 px-4">--stylize 100</button>
      <button class="text-xs text-blue-900 bg-white rounded-3xl p-2 px-4">--weird 0</button>
    </div>
    <div class="flex flex-col bg-[#202021] rounded-xl p-2 h-[120px] w-full">
      <div class="flex flex-row gap-2 mb-4">
        <InfoQIcon />
        <span class="text-white text-sm">Исключения</span>
      </div>
      <div class="bg-black/20 rounded-lg h-[60px]">
        <input
          type="text"
          class="w-full text-white p-2 text-sm h-full"
          placeholder="Введите исключения" />
      </div>
    </div>
    <div class="flex flex-row bg-[#202021] rounded-xl p-2 w-full justify-between mt-2">
      <div class="flex flex-row gap-2">
        <InfoQIcon />
        <span class="text-white">Бесшовный режим (--tile)</span>
      </div>
      <ToggleOnIcon />
    </div>
    <div class="bg-[#202021] w-full flex flex-row mt-2 rounded-xl justify-around">
      <div class="flex flex-col gap-4 p-2">
        <span class="text-white">Версия</span>
        <select
          name="version"
          id="version"
          class="rounded-2xl border border-white text-white px-2">
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
          <option value="6">6</option>
          <option value="7">7</option>
          <option value="8">8</option>
          <option value="9">9</option>
          <option value="10">10</option>
        </select>
      </div>
      <div class="flex flex-col gap-4 p-2">
        <div class="flex flex-row gap-2">
          <InfoQIcon />
          <span class="text-white">Стиль</span>
        </div>
        <select
          name="style"
          id="style"
          class="rounded-2xl border border-white text-white px-2">
          <option value="-">-</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
          <option value="6">6</option>
          <option value="7">7</option>
          <option value="8">8</option>
          <option value="9">9</option>
          <option value="10">10</option>
        </select>
      </div>
      <div class="flex flex-col gap-4 p-2">
        <div class="flex flex-row gap-2">
          <InfoQIcon />
          <span class="text-white">Качество</span>
        </div>
        <select
          name="quality"
          id="quality"
          class="rounded-2xl border border-white text-white px-2">
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
          <option value="6">6</option>
          <option value="7">7</option>
          <option value="8">8</option>
          <option value="9">9</option>
          <option value="10">10</option>
        </select>
      </div>
    </div>
    <div class="bg-[#202021] w-full h-[377px] rounded-xl mt-2">
      <div class="flex flex-row p-4 justify-between">
        <span class="text-white text-sm">Соотношение сторон (--ar)</span>
        <div class="border border-white rounded-lg text-black">
          <select
            name="ar"
            id="ar"
            class="text-white rounded-lg px-2">
            <option value="1:2">1:2</option>
            <option value="2:3">2:3</option>
            <option value="4:5">4:5</option>
            <option value="2:1">2:1</option>
            <option value="3:2">3:2</option>
            <option value="5:4">5:4</option>
            <option value="9:16">9:16</option>
            <option value="3:4">3:4</option>
            <option value="1:1">1:1</option>
            <option value="16:9">16:9</option>
            <option value="4:3">4:3</option>
          </select>
        </div>
      </div>
      <!-- Aspect ratio visualizations remain hidden as in original -->
      <div class="relative mt-2 hidden">
        <!-- Aspect ratio boxes -->
      </div>
    </div>
    <div class="w-full bg-[#202021] rounded-xl mt-2 p-2">
      <div class="flex flex-row justify-between mb-2">
        <div class="flex flex-row gap-2 items-center">
          <InfoQIcon class="w-4 h-4" />
          <span class="text-white">Хаос (--chaos)</span>
        </div>
        <input
          type="text"
          class="rounded-3xl border border-white w-[100px] px-2 text-white text-center"
          value="121" />
      </div>
      <input
        type="range"
        class="simple-range"
        min="0"
        max="1000"
        value="500" />
    </div>
    <!-- Additional parameter sections follow same pattern -->
    <div class="w-full bg-[#202021] rounded-xl mt-2 p-2">
      <div class="flex flex-row justify-between mb-2">
        <div class="flex flex-row gap-2 items-center">
          <InfoQIcon class="w-4 h-4" />
          <span class="text-white">Стилизация (--stylize)</span>
        </div>
        <input
          type="text"
          class="rounded-3xl border border-white w-[100px] px-2 text-white text-center"
          value="121" />
      </div>
      <input
        type="range"
        class="simple-range"
        min="0"
        max="1000"
        value="500" />
    </div>
    <div class="w-full bg-[#202021] rounded-xl mt-2 p-2">
      <div class="flex flex-row justify-between mb-2">
        <div class="flex flex-row gap-2 items-center">
          <InfoQIcon class="w-4 h-4" />
          <span class="text-white">Необычность (--weird)</span>
        </div>
        <input
          type="text"
          class="rounded-3xl border border-white w-[100px] px-2 text-white text-center"
          value="121" />
      </div>
      <input
        type="range"
        class="simple-range"
        min="0"
        max="1000"
        value="500" />
    </div>
    <div class="w-full bg-[#202021] rounded-xl mt-2 p-2">
      <div class="flex flex-row justify-between mb-2">
        <div class="flex flex-row gap-2 items-center">
          <InfoQIcon class="w-4 h-4" />
          <span class="text-white">Эстетика (--exp)</span>
        </div>
        <input
          type="text"
          class="rounded-3xl border border-white w-[100px] px-2 text-white text-center"
          value="121" />
      </div>
      <input
        type="range"
        class="simple-range"
        min="0"
        max="1000"
        value="500" />
    </div>
    <div class="flex flex-col bg-[#202021] rounded-xl p-2 h-[120px] w-full mt-2">
      <div class="flex flex-row justify-between mb-2 items-center">
        <div class="flex flex-row gap-2 mb-4">
          <InfoQIcon />
          <span class="text-white text-sm">Референс персонажа (--cref)</span>
        </div>
        <input
          type="text"
          class="rounded-3xl border border-white w-[80px] text-white text-center"
          value="121" />
      </div>
      <div class="bg-black/20 rounded-lg h-[60px]">
        <input
          type="text"
          class="w-full text-white p-2 text-sm h-full"
          placeholder="Вставьте ссылку(и)" />
      </div>
    </div>
    <div class="w-full bg-[#202021] rounded-xl mt-2 p-2">
      <div class="flex flex-row justify-between mb-2">
        <div class="flex flex-row gap-2 items-center">
          <InfoQIcon class="w-4 h-4" />
          <span class="text-white">Опорная сила (--cw)</span>
        </div>
        <input
          type="text"
          class="rounded-3xl border border-white w-[100px] px-2 text-white text-center"
          value="121" />
      </div>
      <input
        type="range"
        class="simple-range"
        min="0"
        max="1000"
        value="500" />
    </div>
    <div class="w-full flex flex-col mt-2 gap-2">
      <div class="bg-white rounded-3xl flex justify-center w-full h-[36px]">
        <button class="text-center text-blue-900 font-medium">Сохранить параметры</button>
      </div>
      <div class="bg-white rounded-3xl flex justify-center w-full h-[36px]">
        <button class="text-center text-blue-900 font-medium">Показать промпт</button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
select option {
  color: black;
  background: white;
}

.simple-range {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  background: #ddd;
  border-radius: 2px;
  outline: none;
}

.simple-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #000000;
  border-radius: 50%;
  cursor: pointer;
}

.simple-range::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #000000;
  border-radius: 50%;
  cursor: pointer;
}

.simple-range::-ms-thumb {
  width: 16px;
  height: 16px;
  background: #000000;
  border-radius: 50%;
  cursor: pointer;
}
</style>
