<template>
  <div class="fixed inset-0 overflow-hidden pointer-events-none">
    <!-- Floating Particles -->
    <div class="absolute inset-0">
      <div 
        v-for="i in particleCount" 
        :key="i"
        class="absolute w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full opacity-20"
        :style="getParticleStyle(i)"
      ></div>
    </div>

    <!-- Gradient Orbs -->
    <div class="absolute inset-0">
      <div 
        class="absolute w-96 h-96 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-full blur-3xl animate-float-slow"
        style="top: 10%; left: -10%; animation-delay: 0s;"
      ></div>
      <div 
        class="absolute w-80 h-80 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-float-slow"
        style="top: 60%; right: -10%; animation-delay: 2s;"
      ></div>
      <div 
        class="absolute w-64 h-64 bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-full blur-3xl animate-float-slow"
        style="top: 30%; left: 50%; animation-delay: 4s;"
      ></div>
    </div>

    <!-- Animated Grid -->
    <div class="absolute inset-0 opacity-5">
      <div class="grid-pattern animate-grid-move"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const particleCount = 20
const particles = ref<Array<{x: number, y: number, delay: number, duration: number}>>([])

const getParticleStyle = (index: number) => {
  const particle = particles.value[index - 1]
  if (!particle) return {}
  
  return {
    left: `${particle.x}%`,
    top: `${particle.y}%`,
    animationDelay: `${particle.delay}s`,
    animationDuration: `${particle.duration}s`,
  }
}

onMounted(() => {
  // Generate random particles
  for (let i = 0; i < particleCount; i++) {
    particles.value.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 10 + Math.random() * 20,
    })
  }
})
</script>

<style scoped>
@keyframes float-slow {
  0%, 100% {
    transform: translateY(0px) translateX(0px) rotate(0deg);
  }
  25% {
    transform: translateY(-20px) translateX(10px) rotate(1deg);
  }
  50% {
    transform: translateY(-10px) translateX(-10px) rotate(-1deg);
  }
  75% {
    transform: translateY(-30px) translateX(5px) rotate(0.5deg);
  }
}

@keyframes particle-float {
  0%, 100% {
    transform: translateY(0px) translateX(0px);
    opacity: 0.2;
  }
  50% {
    transform: translateY(-100px) translateX(50px);
    opacity: 0.8;
  }
}

@keyframes grid-move {
  0% {
    transform: translateX(0) translateY(0);
  }
  100% {
    transform: translateX(50px) translateY(50px);
  }
}

.animate-float-slow {
  animation: float-slow 15s ease-in-out infinite;
}

.animate-grid-move {
  animation: grid-move 20s linear infinite;
}

.grid-pattern {
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
  background-size: 50px 50px;
}

.absolute:nth-child(odd) {
  animation: particle-float 15s ease-in-out infinite;
}

.absolute:nth-child(even) {
  animation: particle-float 20s ease-in-out infinite reverse;
}
</style>
