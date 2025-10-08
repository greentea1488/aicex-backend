<script setup lang="ts">
// Icons removed - not used in template
import ToggleOnIcon from "@/assets/img/toggle_on.svg";
</script>

<template>
  <div class="overflow-y-auto">
    <div class="bg-[#202021] w-full rounded-2xl flex flex-col mb-4">
      <div class="flex flex-row justify-between p-3">
        <span class="text-white text-sm font-medium">Аудио ответы:</span>
        <div class="text-white rounded-3xl border p-1">
          <select
            name="all_model"
            id="all_model"
            class="rounded-2xl text-sm"
            placeholder="Категория">
            <option value="default">Только на голос</option>
          </select>
        </div>
      </div>
      <div class="flex flex-row justify-between p-3">
        <span class="text-white text-sm font-medium">Выбор голоса:</span>
        <div class="text-white rounded-3xl border p-1">
          <select
            name="all_model"
            id="all_model"
            class="rounded-2xl text-sm"
            placeholder="Категория">
            <option value="default">Syntx (F)</option>
          </select>
        </div>
      </div>
    </div>
    <div class="bg-[#202021] w-full rounded-lg p-4 mb-2">
      <div class="flex justify-between items-start w-full">
        <div class="flex-1">
          <div class="text-white text-sm font-medium">Индивидуальные указания</div>
          <div class="text-white text-xs opacity-80">Переключатель позволяет отключать вывод названия языковой модели в ответе...</div>
        </div>
        <ToggleOnIcon class="w-8 h-4 ml-4" />
      </div>
    </div>
    <div class="bg-[#202021] w-full h-[160px] rounded-lg p-4 mb-2">
      <div class="flex justify-between items-start w-full">
        <div class="flex-1">
          <div class="text-white text-sm font-medium mb-2">Выводить название модели</div>
        </div>
        <ToggleOnIcon class="w-8 h-4 ml-4" />
      </div>
      <div class="bg-black/20 w-full rounded-lg text-white text-xs relative">
        <textarea
          name="textarea"
          id="area"
          class="w-full h-[100px] opacity-40 p-2"
          placeholder="Пользовательские инструкции позволяют указать все, что вы хотели бы, чтобы ChatGPT учел в своем ответе. Введите пожелания и ваши установки будут добавляться в новые разговоры в дальнейшем.">
        </textarea>
        <span class="absolute text-white opacity-40 top-20 right-2">0/3000</span>
      </div>
    </div>
    <div class="bg-white rounded-3xl flex justify-center w-full h-[36px]">
      <button class="text-center text-blue-900 font-medium">Сохранить</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
input::placeholder {
  color: white;
}

textarea::placeholder {
  color: white;
}
</style>
