import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Notification, AggregateNotification, ConnectionConfig } from '../types/notification'
import { websocketService } from '../services/websocket'

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<(Notification | AggregateNotification)[]>([])
  const isConnected = ref(false)
  const connectionConfig = ref<ConnectionConfig>({
    serverUrl: 'http://localhost:3002',
    authCode: ''
  })
  let unsubscribeMessage: (() => void) | null = null
  let unsubscribeConnection: (() => void) | null = null

  const unreadCount = computed(() => notifications.value.length)

  const sortedNotifications = computed(() => {
    return [...notifications.value].sort((a, b) => {
      const dateA = 'created_at' in a ? new Date(a.created_at).getTime() : Date.now()
      const dateB = 'created_at' in b ? new Date(b.created_at).getTime() : Date.now()
      return dateB - dateA
    })
  })

  const notificationsByLevel = computed(() => {
    const levels: Record<string, number> = {}
    notifications.value.forEach(n => {
      if ('level_name' in n) {
        levels[n.level_name] = (levels[n.level_name] || 0) + 1
      }
    })
    return levels
  })

  async function connect(): Promise<boolean> {
    const success = await websocketService.connect(
      connectionConfig.value.serverUrl,
      connectionConfig.value.authCode
    )
    isConnected.value = success

    if (success) {
      unsubscribeMessage?.()
      unsubscribeConnection?.()

      unsubscribeMessage = websocketService.onMessage((notification) => {
        // 带 id 的 Notification（实时 response 与历史 history 共用同一 DB 行结构）
        // 可能重复到达，用真实 DB id 去重；aggregate 无 id，不参与去重，直接展示。
        if ('id' in notification) {
          if (notifications.value.some(n => 'id' in n && n.id === notification.id)) {
            return
          }
        }
        notifications.value.unshift(notification)
        if (notifications.value.length > 1000) {
          notifications.value = notifications.value.slice(0, 1000)
        }
      })

      unsubscribeConnection = websocketService.onConnectionChange((connected) => {
        isConnected.value = connected
        // 自动重连成功后补拉离线期间漏掉的通知。首次连接不经过这里
        // （回调在 await 成功后才注册），由下方 requestLatest 兜住。
        if (connected) {
          requestLatest()
        }
      })

      // 首次连接：拉取最近一页作为初始数据。
      requestLatest()
    }

    return success
  }

  function requestLatest() {
    // last_id=0 即取最新一页；page_size 后端 clamp 到 [15,50]，传 20。
    websocketService.requestMore(0, 20)
  }

  function disconnect() {
    websocketService.disconnect()
    unsubscribeMessage?.()
    unsubscribeConnection?.()
    unsubscribeMessage = null
    unsubscribeConnection = null
    isConnected.value = false
  }

  function clearNotifications() {
    notifications.value = []
  }

  function setConnectionConfig(config: ConnectionConfig) {
    connectionConfig.value = config
  }

  return {
    notifications,
    isConnected,
    connectionConfig,
    unreadCount,
    sortedNotifications,
    notificationsByLevel,
    connect,
    disconnect,
    clearNotifications,
    setConnectionConfig
  }
})
