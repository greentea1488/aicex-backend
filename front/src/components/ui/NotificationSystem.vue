<template>
  <teleport to="body">
    <div class="fixed top-4 right-4 z-50 space-y-3">
      <transition-group
        name="notification"
        tag="div"
        class="space-y-3"
      >
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 min-w-80 max-w-md shadow-2xl"
          :class="getNotificationClass(notification.type)"
        >
          <div class="flex items-start space-x-3">
            <!-- Icon -->
            <div class="flex-shrink-0">
              <div 
                class="w-8 h-8 rounded-full flex items-center justify-center"
                :class="getIconClass(notification.type)"
              >
                <component :is="getIcon(notification.type)" class="w-4 h-4" />
              </div>
            </div>
            
            <!-- Content -->
            <div class="flex-1 min-w-0">
              <h4 v-if="notification.title" class="text-white font-semibold text-sm mb-1">
                {{ notification.title }}
              </h4>
              <p class="text-gray-200 text-sm leading-relaxed">
                {{ notification.message }}
              </p>
              
              <!-- Actions -->
              <div v-if="notification.actions" class="flex space-x-2 mt-3">
                <button
                  v-for="action in notification.actions"
                  :key="action.label"
                  @click="handleAction(action, notification)"
                  class="text-xs font-medium px-3 py-1 rounded-lg transition-colors"
                  :class="action.primary 
                    ? 'bg-cyan-500 hover:bg-cyan-600 text-white' 
                    : 'bg-white/10 hover:bg-white/20 text-gray-200'"
                >
                  {{ action.label }}
                </button>
              </div>
            </div>
            
            <!-- Close button -->
            <button
              @click="removeNotification(notification.id)"
              class="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      </transition-group>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface NotificationAction {
  label: string
  action: () => void
  primary?: boolean
}

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
  actions?: NotificationAction[]
}

const notifications = ref<Notification[]>([])

const getNotificationClass = (type: string) => {
  const classes = {
    success: 'border-emerald-500/30',
    error: 'border-red-500/30',
    warning: 'border-amber-500/30',
    info: 'border-cyan-500/30'
  }
  return classes[type as keyof typeof classes] || classes.info
}

const getIconClass = (type: string) => {
  const classes = {
    success: 'bg-emerald-500/20 text-emerald-400',
    error: 'bg-red-500/20 text-red-400',
    warning: 'bg-amber-500/20 text-amber-400',
    info: 'bg-cyan-500/20 text-cyan-400'
  }
  return classes[type as keyof typeof classes] || classes.info
}

const getIcon = (type: string) => {
  const icons = {
    success: 'CheckIcon',
    error: 'XMarkIcon', 
    warning: 'ExclamationTriangleIcon',
    info: 'InformationCircleIcon'
  }
  return icons[type as keyof typeof icons] || icons.info
}

const addNotification = (notification: Omit<Notification, 'id'>) => {
  const id = Date.now().toString()
  const newNotification = { ...notification, id }
  
  notifications.value.push(newNotification)
  
  // Auto remove after duration
  if (notification.duration !== 0) {
    setTimeout(() => {
      removeNotification(id)
    }, notification.duration || 5000)
  }
  
  return id
}

const removeNotification = (id: string) => {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index > -1) {
    notifications.value.splice(index, 1)
  }
}

const handleAction = (action: NotificationAction, notification: Notification) => {
  action.action()
  removeNotification(notification.id)
}

// Global notification methods
const showSuccess = (message: string, options?: Partial<Notification>) => {
  return addNotification({ type: 'success', message, ...options })
}

const showError = (message: string, options?: Partial<Notification>) => {
  return addNotification({ type: 'error', message, ...options })
}

const showWarning = (message: string, options?: Partial<Notification>) => {
  return addNotification({ type: 'warning', message, ...options })
}

const showInfo = (message: string, options?: Partial<Notification>) => {
  return addNotification({ type: 'info', message, ...options })
}

// Expose methods globally
if (typeof window !== 'undefined') {
  (window as any).$notify = {
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo,
    remove: removeNotification
  }
}

defineExpose({
  addNotification,
  removeNotification,
  showSuccess,
  showError,
  showWarning,
  showInfo
})
</script>

<style scoped>
.notification-enter-active {
  transition: all 0.3s ease-out;
}

.notification-leave-active {
  transition: all 0.3s ease-in;
}

.notification-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.notification-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.notification-move {
  transition: transform 0.3s ease;
}

/* Icons as inline SVG components */
</style>

<script lang="ts">
// Icon components
const CheckIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
    </svg>
  `
}

const XMarkIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
    </svg>
  `
}

const ExclamationTriangleIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
    </svg>
  `
}

const InformationCircleIcon = {
  template: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
  `
}

export { CheckIcon, XMarkIcon, ExclamationTriangleIcon, InformationCircleIcon }
</script>
