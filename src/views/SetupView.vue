<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '../stores/notification'

const router = useRouter()
const store = useNotificationStore()

const serverUrl = ref('http://localhost:3002')
const authCode = ref('')
const isConnecting = ref(false)
const errorMessage = ref('')

async function handleConnect() {
  if (!serverUrl.value) {
    errorMessage.value = '请输入服务器地址'
    return
  }

  isConnecting.value = true
  errorMessage.value = ''

  store.setConnectionConfig({
    serverUrl: serverUrl.value,
    authCode: authCode.value
  })

  const success = await store.connect()

  if (success) {
    router.push('/dashboard')
  } else {
    errorMessage.value = '连接失败，请检查服务器地址和认证码'
  }

  isConnecting.value = false
}
</script>

<template>
  <div class="setup-container">
    <div class="setup-card">
      <h1 class="setup-title">通知告警系统</h1>
      <p class="setup-subtitle">连接到后端服务器以接收实时通知</p>

      <form @submit.prevent="handleConnect" class="setup-form">
        <div class="form-group">
          <label for="serverUrl">服务器地址</label>
          <input
            id="serverUrl"
            v-model="serverUrl"
            type="text"
            placeholder="http://localhost:3002"
            :disabled="isConnecting"
          />
        </div>

        <div class="form-group">
          <label for="authCode">认证码</label>
          <input
            id="authCode"
            v-model="authCode"
            type="password"
            placeholder="请输入认证码"
            :disabled="isConnecting"
          />
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <button type="submit" class="connect-button" :disabled="isConnecting">
          <span v-if="isConnecting">连接中...</span>
          <span v-else>连接</span>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.setup-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.setup-card {
  background: white;
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.setup-title {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  color: #1a1a2e;
  text-align: center;
}

.setup-subtitle {
  margin: 0 0 32px 0;
  font-size: 14px;
  color: #666;
  text-align: center;
}

.setup-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.form-group input {
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.form-group input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.error-message {
  color: #e74c3c;
  font-size: 14px;
  text-align: center;
  padding: 8px;
  background: #fdf2f2;
  border-radius: 6px;
}

.connect-button {
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.connect-button:hover:not(:disabled) {
  opacity: 0.9;
}

.connect-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
