import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
  persistent?: boolean
}

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<Notification[]>([])

  /**
   * Добавляет уведомление
   */
  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const newNotification: Notification = {
      id,
      duration: 5000,
      ...notification
    }

    notifications.value.push(newNotification)

    // Автоматически удаляем уведомление через указанное время
    if (!newNotification.persistent && newNotification.duration) {
      setTimeout(() => {
        removeNotification(id)
      }, newNotification.duration)
    }

    return id
  }

  /**
   * Удаляет уведомление
   */
  const removeNotification = (id: string) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  /**
   * Очищает все уведомления
   */
  const clearAll = () => {
    notifications.value = []
  }

  /**
   * Показывает уведомление об успехе
   */
  const showSuccess = (message: string, title?: string, duration?: number) => {
    return addNotification({
      type: 'success',
      title,
      message,
      duration
    })
  }

  /**
   * Показывает уведомление об ошибке
   */
  const showError = (message: string, title?: string, persistent = false) => {
    return addNotification({
      type: 'error',
      title: title || 'Ошибка',
      message,
      persistent,
      duration: persistent ? undefined : 7000
    })
  }

  /**
   * Показывает предупреждение
   */
  const showWarning = (message: string, title?: string, duration?: number) => {
    return addNotification({
      type: 'warning',
      title: title || 'Предупреждение',
      message,
      duration: duration || 6000
    })
  }

  /**
   * Показывает информационное уведомление
   */
  const showInfo = (message: string, title?: string, duration?: number) => {
    return addNotification({
      type: 'info',
      title,
      message,
      duration
    })
  }

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
})
