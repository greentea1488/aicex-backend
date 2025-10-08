<template>
  <div class="midjourney-generator">
    <div class="generator-header">
      <h2>Midjourney AI</h2>
      <p>Создавайте потрясающие изображения с помощью нейросети</p>
    </div>

    <div class="generator-form">
      <!-- Поле ввода промпта -->
      <div class="form-group">
        <label for="prompt">Описание изображения</label>
        <textarea
          id="prompt"
          v-model="form.prompt"
          placeholder="Опишите что вы хотите создать..."
          rows="4"
          :disabled="generating"
        ></textarea>
        <div class="prompt-counter">
          {{ form.prompt.length }}/500
        </div>
      </div>

      <!-- Настройки -->
      <div class="settings-grid">
        <!-- Модель -->
        <div class="form-group">
          <label>Модель</label>
          <select v-model="form.model" :disabled="generating">
            <option v-for="model in options.models" :key="model.id" :value="model.id">
              {{ model.name }} ({{ model.cost }}₽)
            </option>
          </select>
        </div>

        <!-- Стиль -->
        <div class="form-group">
          <label>Стиль</label>
          <select v-model="form.style" :disabled="generating">
            <option v-for="style in options.styles" :key="style.id" :value="style.id">
              {{ style.name }}
            </option>
          </select>
        </div>

        <!-- Соотношение сторон -->
        <div class="form-group">
          <label>Соотношение сторон</label>
          <select v-model="form.aspect_ratio" :disabled="generating">
            <option v-for="ratio in options.aspectRatios" :key="ratio.id" :value="ratio.id">
              {{ ratio.name }}
            </option>
          </select>
        </div>

        <!-- Качество -->
        <div class="form-group">
          <label>Качество</label>
          <select v-model="form.quality" :disabled="generating">
            <option v-for="quality in options.quality" :key="quality.id" :value="quality.id">
              {{ quality.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Стоимость и кнопка генерации -->
      <div class="generation-footer">
        <div class="cost-info">
          <span class="cost-label">Стоимость:</span>
          <span class="cost-amount">{{ estimatedCost }}₽</span>
          <span class="balance-info">Баланс: {{ tokenBalance }} токенов</span>
        </div>

        <button 
          @click="generateImage"
          :disabled="!canGenerate"
          class="generate-btn"
          :class="{ generating }"
        >
          <span v-if="generating" class="spinner"></span>
          {{ generating ? 'Генерация...' : 'Создать изображение' }}
        </button>
      </div>
    </div>

    <!-- Примеры промптов -->
    <div class="examples-section">
      <h3>Примеры промптов</h3>
      <div class="examples-grid">
        <div 
          v-for="example in examples" 
          :key="example"
          class="example-card"
          @click="useExample(example)"
        >
          {{ example }}
        </div>
      </div>
    </div>

    <!-- История генераций -->
    <div class="history-section">
      <div class="history-header">
        <h3>Ваши генерации</h3>
        <button @click="loadHistory" class="refresh-btn">
          <i class="icon-refresh"></i>
        </button>
      </div>

      <div v-if="historyLoading" class="loading">
        Загрузка истории...
      </div>

      <div v-else-if="history.length === 0" class="empty-history">
        У вас пока нет генераций
      </div>

      <div v-else class="history-grid">
        <div 
          v-for="task in history" 
          :key="task.id"
          class="history-item"
          :class="task.status"
        >
          <div v-if="task.imageUrl" class="task-image">
            <img :src="task.imageUrl" :alt="task.prompt" @click="openImage(task.imageUrl)" />
          </div>
          
          <div v-else class="task-placeholder">
            <div class="status-icon" :class="task.status">
              <i v-if="task.status === 'pending'" class="icon-clock"></i>
              <i v-else-if="task.status === 'processing'" class="icon-spinner spinning"></i>
              <i v-else-if="task.status === 'completed'" class="icon-check"></i>
              <i v-else-if="task.status === 'failed'" class="icon-error"></i>
            </div>
          </div>

          <div class="task-info">
            <div class="task-prompt">{{ task.prompt.substring(0, 60) }}...</div>
            <div class="task-meta">
              <span class="task-model">{{ task.model }}</span>
              <span class="task-cost">{{ task.cost }}₽</span>
              <span class="task-date">{{ formatDate(task.createdAt) }}</span>
            </div>
            <div class="task-status" :class="task.status">
              {{ getStatusText(task.status) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Модальное окно для просмотра изображения -->
    <div v-if="selectedImage" class="image-modal" @click="selectedImage = null">
      <div class="modal-content" @click.stop>
        <img :src="selectedImage" alt="Generated image" />
        <button @click="selectedImage = null" class="close-btn">&times;</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '../http/api'
import { useTokenStore } from '../stores/token'
import { useNotificationStore } from '../stores/notification'

// Типы для данных
interface MidjourneyModel {
  id: string
  name: string
  cost?: number
}

interface MidjourneyStyle {
  id: string
  name: string
}

interface MidjourneyAspectRatio {
  id: string
  name: string
}

interface MidjourneyQuality {
  id: string
  name: string
  costMultiplier?: number
}

interface MidjourneyOptions {
  models: MidjourneyModel[]
  styles: MidjourneyStyle[]
  aspectRatios: MidjourneyAspectRatio[]
  quality: MidjourneyQuality[]
}

interface MidjourneyHistoryItem {
  id: string
  prompt: string
  imageUrl: string
  createdAt: string
  status: string
  model?: string
  cost?: number
}

const tokenStore = useTokenStore()
const notificationStore = useNotificationStore()

// Форма генерации
const form = ref({
  prompt: '',
  model: '7.0',
  style: 'photorealistic',
  aspect_ratio: '1:1',
  quality: 'high'
})

// Состояние
const generating = ref(false)
const historyLoading = ref(false)
const selectedImage = ref<string | null>(null)

// Данные
const options = ref<MidjourneyOptions>({
  models: [],
  styles: [],
  aspectRatios: [],
  quality: []
})

const history = ref<MidjourneyHistoryItem[]>([])
const tokenBalance = ref(0)

// Примеры промптов
const examples = ref([
  'Красивый закат над океаном, фотореалистично',
  'Портрет молодой женщины в стиле ренессанс',
  'Футуристический город с неоновыми огнями',
  'Кот в космическом скафандре, цифровое искусство',
  'Горный пейзаж с водопадом, акварель',
  'Робот в стиле стимпанк, детализированно'
])

// Вычисляемые свойства
const estimatedCost = computed(() => {
  const model = options.value.models.find(m => m.id === form.value.model)
  const quality = options.value.quality.find(q => q.id === form.value.quality)
  
  if (!model || !quality) return 0
  
  return Math.ceil((model.cost || 0) * (quality.costMultiplier || 1))
})

const canGenerate = computed(() => {
  return form.value.prompt.trim().length >= 10 && 
         !generating.value && 
         tokenBalance.value >= estimatedCost.value
})

// Методы
onMounted(async () => {
  await loadOptions()
  await loadBalance()
  await loadHistory()
})

const loadOptions = async () => {
  try {
    const response = await api.services.getOptions('midjourney')
    options.value = (response as any).data || {
      models: [],
      styles: [],
      aspectRatios: [],
      quality: []
    }
  } catch (error) {
    notificationStore.showError('Ошибка загрузки настроек')
  }
}

const loadBalance = async () => {
  try {
    tokenBalance.value = await tokenStore.getBalance()
  } catch (error) {
    console.error('Failed to load balance:', error)
  }
}

const loadHistory = async () => {
  try {
    historyLoading.value = true
    const response = await api.generations.getHistory('midjourney', 10)
    history.value = (response as any).data?.tasks || []
  } catch (error) {
    notificationStore.showError('Ошибка загрузки истории')
  } finally {
    historyLoading.value = false
  }
}

const generateImage = async () => {
  if (!canGenerate.value) return

  try {
    generating.value = true

    const response = await api.generate.midjourney({
      prompt: form.value.prompt,
      model: form.value.model,
      style: form.value.style,
      aspect_ratio: form.value.aspect_ratio,
      quality: form.value.quality
    })

    if (response.data.success) {
      notificationStore.showSuccess(
        `Генерация запущена! Ожидаемое время: ${Math.ceil(((response as any).data?.estimatedTime || 300) / 60)} мин.`,
        'Успешно'
      )

      // Обновляем баланс
      tokenStore.deductTokens(estimatedCost.value)
      tokenBalance.value = tokenStore.balance

      // Очищаем форму
      form.value.prompt = ''

      // Обновляем историю
      await loadHistory()
    } else {
      throw new Error(response.data.error || 'Ошибка генерации')
    }

  } catch (error: any) {
    const message = error.response?.data?.error || error.message || 'Ошибка генерации'
    notificationStore.showError(message)
  } finally {
    generating.value = false
  }
}

const useExample = (example: string) => {
  form.value.prompt = example
}

const openImage = (imageUrl: string) => {
  selectedImage.value = imageUrl
}

const getStatusText = (status: string) => {
  const statusTexts: Record<string, string> = {
    'pending': 'Ожидание',
    'processing': 'Обработка',
    'completed': 'Готово',
    'failed': 'Ошибка'
  }
  return statusTexts[status] || status
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('ru-RU')
}
</script>

<style scoped>
.midjourney-generator {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.generator-header {
  text-align: center;
  margin-bottom: 2rem;
}

.generator-header h2 {
  color: #333;
  margin-bottom: 0.5rem;
}

.generator-header p {
  color: #666;
  font-size: 1.1rem;
}

.generator-form {
  background: white;
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #333;
}

.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e1e5e9;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
}

.prompt-counter {
  text-align: right;
  font-size: 0.9rem;
  color: #666;
  margin-top: 0.25rem;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 2rem 0;
}

.generation-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1.5rem;
  border-top: 1px solid #eee;
}

.cost-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.cost-label {
  font-size: 0.9rem;
  color: #666;
}

.cost-amount {
  font-size: 1.2rem;
  font-weight: 700;
  color: #333;
}

.balance-info {
  font-size: 0.9rem;
  color: #666;
}

.generate-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Примеры */
.examples-section {
  margin-bottom: 2rem;
}

.examples-section h3 {
  margin-bottom: 1rem;
  color: #333;
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.example-card {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.example-card:hover {
  background: #e9ecef;
  border-color: #667eea;
}

/* История */
.history-section h3 {
  margin-bottom: 1rem;
  color: #333;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.refresh-btn {
  background: none;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.refresh-btn:hover {
  background: #f8f9fa;
  border-color: #667eea;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.history-item {
  background: white;
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.history-item:hover {
  transform: translateY(-2px);
}

.task-image {
  aspect-ratio: 1;
  overflow: hidden;
}

.task-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
}

.task-placeholder {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
}

.status-icon {
  font-size: 2rem;
  color: #666;
}

.status-icon.processing {
  color: #007bff;
}

.status-icon.completed {
  color: #28a745;
}

.status-icon.failed {
  color: #dc3545;
}

.spinning {
  animation: spin 1s linear infinite;
}

.task-info {
  padding: 1rem;
}

.task-prompt {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #333;
}

.task-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.task-status {
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  display: inline-block;
}

.task-status.pending {
  background: #fff3cd;
  color: #856404;
}

.task-status.processing {
  background: #cce5ff;
  color: #004085;
}

.task-status.completed {
  background: #d4edda;
  color: #155724;
}

.task-status.failed {
  background: #f8d7da;
  color: #721c24;
}

.loading, .empty-history {
  text-align: center;
  padding: 2rem;
  color: #666;
}

/* Модальное окно изображения */
.image-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

.modal-content img {
  max-width: 100%;
  max-height: 100%;
  border-radius: 0.5rem;
}

.close-btn {
  position: absolute;
  top: -40px;
  right: 0;
  background: none;
  border: none;
  color: white;
  font-size: 2rem;
  cursor: pointer;
}
</style>
