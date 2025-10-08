<script setup lang="ts">
import Dialogs from "@/views/GptSettings/Dialogs.vue";
import GPTs from "@/views/GptSettings/GPTs.vue";
import Models from "@/views/GptSettings/Models.vue";
import Settings from "@/views/GptSettings/Settings.vue";
import ModelIcon from "@/assets/img/model.svg";
import RobotIcon from "@/assets/img/robot.svg";
import SettingsIcon from "@/assets/img/settings.svg";
import DialogIcon from "@/assets/img/dialog.svg";
import { ref } from "vue";

const gptSettingsComps = [Models, Dialogs, GPTs, Settings];

const activeTab = ref(0);
</script>

<template>
  <div class="overflow-y-auto">
    <div class="w-full">
      <div class="flex gap-3 mb-4">
        <button
          class="group bg-[#202021] hover:bg-[#181819] w-1/4 h-[75px] rounded-2xl flex flex-col p-[12px] gap-3 transition-all duration-300 ease-in-out"
          :class="{ gray: activeTab === 0 }"
          @click="activeTab = 0">
          <div class="mb-1">
            <ModelIcon class="w-4 h-4 transition-all" />
          </div>
          <span class="text-[9px] text-white mt-2 text-start transition-colors"> Все модели </span>
        </button>

        <button
          class="group bg-[#202021] hover:bg-[#181819] w-1/4 h-[75px] rounded-2xl flex flex-col p-[12px] gap-3 transition-all duration-300 ease-in-out"
          :class="{ gray: activeTab === 1 }"
          @click="activeTab = 1">
          <div class="mb-1">
            <RobotIcon class="w-4 h-4 transition-all" />
          </div>
          <span class="text-[9px] text-white mt-2 text-start transition-colors"> GPT's </span>
        </button>

        <button
          class="group bg-[#202021] hover:bg-[#181819] w-1/4 h-[75px] rounded-2xl flex flex-col p-[12px] gap-3 transition-all duration-300 ease-in-out"
          :class="{ gray: activeTab === 2 }"
          @click="activeTab = 2">
          <div class="mb-1">
            <SettingsIcon class="w-4 h-4 transition-all" />
          </div>
          <span class="text-[9px] text-white mt-2 text-start transition-colors"> Настройки </span>
        </button>

        <button
          class="group bg-[#202021] hover:bg-[#181819] w-1/4 h-[75px] rounded-2xl flex flex-col p-[12px] gap-3 transition-all duration-300 ease-in-out"
          :class="{ gray: activeTab === 3 }"
          @click="activeTab = 3">
          <div class="mb-1">
            <DialogIcon class="w-4 h-4 transition-all" />
          </div>
          <span class="text-[9px] text-white mt-2 text-start transition-colors"> Диалоги </span>
        </button>
      </div>

      <transition
        name="fade-fast"
        mode="out-in">
        <keep-alive>
          <component :is="gptSettingsComps[activeTab]" />
        </keep-alive>
      </transition>
    </div>
  </div>
</template>

<style scoped lang="scss">
.gray {
  background: radial-gradient(circle at 30% 30%, #8a8a8a, #5f5f5f 40%, #2e2e2e 100%) !important;
  backdrop-filter: blur(80px);
  transition: background 0.4s ease-in-out, transform 0.3s ease;
}

button {
  transition: background-color 0.4s ease-in-out, transform 0.3s ease, box-shadow 0.3s ease;
  background-color: #202021;

  &:hover {
    background-color: #181819;
    transform: scale(1.03);
  }

  &.gray {
    background-color: transparent;
    transform: scale(0.98) translateY(0);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
}
</style>
