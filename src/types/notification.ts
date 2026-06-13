export interface Notification {
  id: number
  digest: string
  title: string
  content: string
  level_name: string
  created_at: string
  updated_at: string
}

export interface LogData {
  channel: string
  message: string
  level_name: string
  [key: string]: any
}

export interface WSMessage {
  type: 'response' | 'aggregate' | 'history' | 'error'
  data: any
  error?: string
}

export interface AggregateNotification {
  type: 'aggregate'
  title: string
  content: string
  count: number
}

export interface ConnectionConfig {
  serverUrl: string
  authCode: string
}
