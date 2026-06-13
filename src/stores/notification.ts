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
        notifications.value.unshift(notification)
        if (notifications.value.length > 1000) {
          notifications.value = notifications.value.slice(0, 1000)
        }
      })

      unsubscribeConnection = websocketService.onConnectionChange((connected) => {
        isConnected.value = connected
      })
    }

    return success
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
