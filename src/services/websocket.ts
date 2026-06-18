import type { WSMessage, Notification, AggregateNotification } from '../types/notification'
import { sendSystemNotification } from './notification'

type MessageHandler = (notification: Notification | AggregateNotification) => void
type ConnectionHandler = (connected: boolean) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private messageHandlers: MessageHandler[] = []
  private connectionHandlers: ConnectionHandler[] = []
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private manualDisconnect = false

  connect(serverUrl: string, authCode: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.manualDisconnect = false
        this.clearReconnectTimeout()

        if (this.ws) {
          this.ws.close()
          this.ws = null
        }

        const wsUrl = this.buildWsUrl(serverUrl, authCode)
        this.ws = new WebSocket(wsUrl)
        let settled = false

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.reconnectAttempts = 0
          this.notifyConnectionHandlers(true)
          if (!settled) {
            settled = true
            resolve(true)
          }
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WSMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason)
          this.ws = null
          this.notifyConnectionHandlers(false)
          if (!settled) {
            settled = true
            resolve(false)
          }

          if (!this.manualDisconnect && event.code !== 4001) {
            this.attemptReconnect(serverUrl, authCode)
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          // onerror 后一定会触发 onclose，由 onclose 负责 resolve
        }
      } catch (error) {
        console.error('Failed to connect WebSocket:', error)
        resolve(false)
      }
    })
  }

  private buildWsUrl(serverUrl: string, authCode: string): string {
    const url = new URL(serverUrl)
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${url.host}/ws?code=${encodeURIComponent(authCode)}`
    return wsUrl
  }

  // 后端实时推送（response）与历史拉取（history）现在共用同一份 DB 行结构
  // （{id, digest, title, content, level_name, created_at, updated_at}）。
  // 抽出统一映射，保证两条路径产出的 Notification 字段一致，前端可凭真实 id 去重。
  private rowToNotification(item: any): Notification {
    return {
      id: Number(item.id ?? Date.now()),
      digest: String(item.digest ?? ''),
      title: String(item.title ?? item.message ?? 'Notification'),
      content: typeof item.content === 'string' ? item.content : JSON.stringify(item.content ?? item),
      level_name: String(item.level_name ?? 'NOTIFY'),
      created_at: String(item.created_at ?? new Date().toISOString()),
      updated_at: String(item.updated_at ?? item.created_at ?? new Date().toISOString())
    }
  }

  private handleMessage(message: WSMessage) {
    if (message.type === 'response') {
      // 后端 respond 现在推送插入后的完整 DB 行（data 即该行）。
      const notification = this.rowToNotification(message.data || {})
      this.notifyMessageHandlers(notification)
      // 系统通知正文用 content（原始文本），title 用 DB 的 title。
      sendSystemNotification(notification.title, notification.content)
    } else if (message.type === 'aggregate') {
      // 服务端当前把 aggregate 字段放在顶层，兼容旧文档里的 data 结构。
      const agg = (message.data && typeof message.data === 'object') ? message.data : message as any
      const aggregate: AggregateNotification = {
        type: 'aggregate',
        title: agg.title || '聚合通知',
        content: agg.content || '',
        count: agg.count || 1
      }
      this.notifyMessageHandlers(aggregate)
      sendSystemNotification(aggregate.title, aggregate.content)
    } else if (message.type === 'history') {
      const items = Array.isArray(message.data) ? message.data : []
      items.forEach((item) => {
        this.notifyMessageHandlers(this.rowToNotification(item))
      })
    }
  }

  private attemptReconnect(serverUrl: string, authCode: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`)

      this.reconnectTimeout = setTimeout(() => {
        this.connect(serverUrl, authCode)
      }, delay)
    }
  }

  private clearReconnectTimeout() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }

  disconnect() {
    this.manualDisconnect = true
    this.clearReconnectTimeout()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.notifyConnectionHandlers(false)
  }

  requestMore(lastId: number, pageSize: number = 20) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'last',
        data: { last_id: lastId, page_size: pageSize }
      }))
    }
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.push(handler)
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler)
    }
  }

  onConnectionChange(handler: ConnectionHandler) {
    this.connectionHandlers.push(handler)
    return () => {
      this.connectionHandlers = this.connectionHandlers.filter(h => h !== handler)
    }
  }

  private notifyMessageHandlers(notification: Notification | AggregateNotification) {
    this.messageHandlers.forEach(handler => handler(notification))
  }

  private notifyConnectionHandlers(connected: boolean) {
    this.connectionHandlers.forEach(handler => handler(connected))
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export const websocketService = new WebSocketService()
