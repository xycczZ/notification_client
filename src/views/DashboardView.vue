<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '../stores/notification'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { Bar } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const router = useRouter()
const store = useNotificationStore()

const currentTime = ref(new Date().toLocaleTimeString())

let timeInterval: ReturnType<typeof setInterval>

onMounted(() => {
  if (!store.isConnected) {
    router.push('/')
    return
  }

  timeInterval = setInterval(() => {
    currentTime.value = new Date().toLocaleTimeString()
  }, 1000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})

function handleDisconnect() {
  store.disconnect()
  router.push('/')
}

function getLevelColor(level: string): string {
  const colors: Record<string, string> = {
    'ERROR': '#e74c3c',
    'CRITICAL': '#c0392b',
    'ALERT': '#e67e22',
    'EMERGENCY': '#d35400',
    'WARNING': '#f39c12',
    'NOTIFY': '#3498db'
  }
  return colors[level] || '#95a5a6'
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString()
}

function formatJsonHighlight(raw: string): string {
  try {
    const obj = JSON.parse(raw)
    const json = JSON.stringify(obj, null, 2)
    return json.replace(
      /("(\\u[\da-fA-F]{4}|\\[^u]|[^"\\])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'json-number'
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'json-key'
          } else {
            cls = 'json-string'
          }
        } else if (/true|false/.test(match)) {
          cls = 'json-boolean'
        } else if (/null/.test(match)) {
          cls = 'json-null'
        }
        return `<span class="${cls}">${match}</span>`
      }
    )
  } catch {
    return raw
  }
}

const chartData = computed(() => {
  const levels = store.notificationsByLevel
  return {
    labels: Object.keys(levels),
    datasets: [{
      label: '通知数量',
      data: Object.values(levels),
      backgroundColor: Object.keys(levels).map(level => getLevelColor(level)),
      borderWidth: 0,
      borderRadius: 4
    }]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 1
      }
    }
  }
}
</script>

<template>
  <div class="dashboard">
    <header class="dashboard-header">
      <div class="header-left">
        <h1>通知告警系统</h1>
        <span class="connection-status" :class="{ connected: store.isConnected }">
          {{ store.isConnected ? '已连接' : '未连接' }}
        </span>
      </div>
      <div class="header-right">
        <span class="current-time">{{ currentTime }}</span>
        <button class="disconnect-button" @click="handleDisconnect">断开连接</button>
      </div>
    </header>

    <main class="dashboard-content">
      <div class="stats-section">
        <div class="stat-card">
          <div class="stat-value">{{ store.unreadCount }}</div>
          <div class="stat-label">总通知数</div>
        </div>
        <div class="stat-card" v-for="(count, level) in store.notificationsByLevel" :key="level">
          <div class="stat-value" :style="{ color: getLevelColor(level) }">{{ count }}</div>
          <div class="stat-label">{{ level }}</div>
        </div>
      </div>

      <div class="main-section">
        <div class="chart-section">
          <h2>通知统计</h2>
          <div class="chart-container">
            <Bar :data="chartData" :options="chartOptions" />
          </div>
        </div>

        <div class="notifications-section">
          <div class="notifications-header">
            <h2>实时通知</h2>
            <button class="clear-button" @click="store.clearNotifications()">清空</button>
          </div>
          <div class="notifications-list">
            <div
              v-for="(notification, index) in store.sortedNotifications"
              :key="index"
              class="notification-item"
            >
              <div class="notification-avatar" :style="{ backgroundColor: getLevelColor('level_name' in notification ? notification.level_name : 'NOTIFY') }">
                {{ 'level_name' in notification ? notification.level_name.charAt(0) : 'A' }}
              </div>
              <div class="notification-content">
                <div class="notification-header">
                  <span class="notification-title">{{ notification.title }}</span>
                  <span class="notification-time">
                    {{ 'created_at' in notification ? formatTime(notification.created_at) : '刚刚' }}
                  </span>
                </div>
                <pre class="notification-body json-viewer" v-html="formatJsonHighlight(notification.content)"></pre>
                <div v-if="'count' in notification" class="notification-count">
                  出现 {{ notification.count }} 次
                </div>
              </div>
            </div>

            <div v-if="store.notifications.length === 0" class="empty-state">
              <div class="empty-icon">📭</div>
              <p>暂无通知</p>
              <p class="empty-hint">等待接收新的告警通知...</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard {
  min-height: 100vh;
  background: #f5f7fa;
}

.dashboard-header {
  background: white;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-left h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
}

.connection-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  background: #fee2e2;
  color: #dc2626;
}

.connection-status.connected {
  background: #dcfce7;
  color: #16a34a;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.current-time {
  font-size: 14px;
  color: #666;
}

.disconnect-button {
  padding: 8px 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.disconnect-button:hover {
  background: #dc2626;
}

.dashboard-content {
  padding: 24px;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.main-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 1024px) {
  .main-section {
    grid-template-columns: 1fr;
  }
}

.chart-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.chart-section h2 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
}

.chart-container {
  height: 300px;
}

.notifications-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
}

.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.notifications-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
}

.clear-button {
  padding: 6px 12px;
  background: #f3f4f6;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: background 0.2s;
}

.clear-button:hover {
  background: #e5e7eb;
}

.notifications-list {
  flex: 1;
  overflow-y: auto;
  max-height: 500px;
}

.notification-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}

.notification-item:hover {
  background: #f9fafb;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.notification-title {
  font-weight: 600;
  color: #1a1a2e;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-time {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}

.notification-body {
  font-size: 12px;
  color: #444;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
  margin-top: 6px;
  padding: 10px 12px;
  background: #1e1e2e;
  border-radius: 6px;
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  overflow-x: auto;
}

.notification-body :deep(.json-key) {
  color: #89b4fa;
}

.notification-body :deep(.json-string) {
  color: #a6e3a1;
}

.notification-body :deep(.json-number) {
  color: #fab387;
}

.notification-body :deep(.json-boolean) {
  color: #cba6f7;
}

.notification-body :deep(.json-null) {
  color: #f38ba8;
}

.notification-count {
  margin-top: 4px;
  font-size: 12px;
  color: #e67e22;
  font-weight: 500;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state p {
  margin: 0 0 8px 0;
}

.empty-hint {
  font-size: 13px;
  color: #bbb;
}
</style>
