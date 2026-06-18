<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '../stores/notification'
import { openExternalUrl } from '../services/notification'

const router = useRouter()
const store = useNotificationStore()

const currentTime = ref(new Date().toLocaleTimeString())

// 顶部消息分类过滤：null 表示显示全部。
const selectedLevel = ref<string | null>(null)

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
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  // 前缀补上 MM-DD，保留原有的 toLocaleTimeString()（带秒）作为时间部分。
  return `${mm}-${dd} ${date.toLocaleTimeString()}`
}

// 匹配 http(s)://、mailto:、tel: 开头的 URL，遇到空白或引号/尖括号结尾。
// 在原始（未转义）文本上运行，因此排除集用原始引号字符。
const URL_RE = /(https?:\/\/[^\s"'<>]+|mailto:[^\s"'<>]+|tel:[^\s"'<>]+)/g

// Kibana discover 视图模板，TRACE_ID 处用实际 trace_id（已 encodeURIComponent）填充。
function buildKibanaTraceUrl(traceId: string): string {
  return `http://kibana.ustk-devops.com/app/discover#/?_a=(columns:!(),filters:!(),index:'122b1c30-dfc2-11f0-8d50-dd7e944d1e9e',interval:auto,query:(language:kuery,query:'trace_id:${encodeURIComponent(traceId)}'),sort:!(!('@timestamp',desc)))&_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:now%2Fd,to:now%2Fd))`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatJsonHighlight(raw: string): string {
  let pretty: string
  let isJson = true
  try {
    pretty = JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    pretty = raw
    isJson = false
  }

  // 统一收集所有需要链接化的片段（普通 URL + 非 "-" 的 trace_id）。
  // 每个占位符用 Unicode 私用区单字符（\uE000 起），着色/转义正则都匹配不到，
  // 不会被当成数字/字符串误处理。还原时按字符查回 link。
  const links: { text: string; url: string }[] = []
  const mkPlaceholder = (link: { text: string; url: string }) => {
    const i = links.length
    links.push(link)
    return String.fromCharCode(0xe000 + i)
  }

  // 1) 提取普通 URL，替换为占位符，避免后续着色正则误伤 URL 内的数字/冒号。
  let tokenized = pretty.replace(URL_RE, (url) =>
    mkPlaceholder({ text: url, url })
  )

  // 2) 提取 trace_id：值非 "-" 且非空时生成 Kibana 链接。仅在 JSON 模式下处理，
  //    匹配 JSON 文本里的 "trace_id": "value" 字段。
  if (isJson) {
    tokenized = tokenized.replace(
      /"trace_id"\s*:\s*"([^"\\]*)"/g,
      (full, value) => {
        if (value === '-' || value === '') return full
        // 去掉值的引号，直接用占位符替换，链接本身不需要引号包围，更美观。
        return `"trace_id": ${mkPlaceholder({ text: value, url: buildKibanaTraceUrl(value) })}`
      }
    )
  }

  let result: string
  if (isJson) {
    // 3) 在占位符化的文本上做 JSON 着色，token 与间隙文本都需转义。
    let out = ''
    let last = 0
    const jsonTokenRe = /("(\\u[\da-fA-F]{4}|\\[^u]|[^"\\])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g
    let m: RegExpExecArray | null
    while ((m = jsonTokenRe.exec(tokenized)) !== null) {
      out += escapeHtml(tokenized.slice(last, m.index))
      const match = m[0]
      let cls = 'json-number'
      let inner = escapeHtml(match)
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'json-key'
        } else {
          cls = 'json-string'
          // 字符串值里的 \n / \t 是字面两字符（escapeHtml 不碰反斜杠），
          // 转成 <br> / 缩进以保留多行文本的可读换行。仅作用于字符串值，
          // 不影响 JSON 结构性缩进换行（那些是真实 \u000A，不在 token 内）。
          inner = inner.replace(/\\n/g, '<br>').replace(/\\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
        }
      } else if (/true|false/.test(match)) {
        cls = 'json-boolean'
      } else if (/null/.test(match)) {
        cls = 'json-null'
      }
      out += `<span class="${cls}">${inner}</span>`
      last = m.index + match.length
    }
    out += escapeHtml(tokenized.slice(last))
    result = out
  } else {
    // 非 JSON 纯文本：转义后把字面 \n 转成 <br>，链接化交给占位符还原。
    result = escapeHtml(tokenized).replace(/\\n/g, '<br>')
  }

  // 4) 还原所有占位符为可点击 <a>。私用区字符不被 escapeHtml 改动，
  //    也不会被着色正则吞掉，按字符码点减 0xe000 取回 links 索引。
  result = result.replace(/[\uE000-\uF8FF]/g, (ch) => {
    const i = ch.charCodeAt(0) - 0xe000
    const link = links[i]
    if (!link) return ch
    const text = escapeHtml(link.text)
    const url = escapeHtml(link.url)
    return `<a class="notif-link" href="#" data-url="${url}">${text}</a>`
  })
  return result
}


function handleContentClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.tagName === 'A' && target.classList.contains('notif-link')) {
    event.preventDefault()
    const url = target.getAttribute('data-url')
    if (url) {
      openExternalUrl(url)
    }
  }
}


// 当前过滤后展示的通知列表：selectedLevel 为 null 时显示全部。
const displayedNotifications = computed(() => {
  if (selectedLevel.value === null) {
    return store.sortedNotifications
  }
  return store.sortedNotifications.filter(n => {
    const level = 'level_name' in n ? n.level_name : 'NOTIFY'
    return level === selectedLevel.value
  })
})

function toggleLevel(level: string | null) {
  // 再次点击当前选中的分类 → 取消过滤。
  selectedLevel.value = selectedLevel.value === level ? null : level
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
        <div
          class="stat-card"
          :class="{ active: selectedLevel === null }"
          @click="toggleLevel(null)"
        >
          <div class="stat-value">{{ store.unreadCount }}</div>
          <div class="stat-label">全部</div>
        </div>
        <div
          v-for="(count, level) in store.notificationsByLevel"
          :key="level"
          class="stat-card"
          :class="{ active: selectedLevel === level }"
          @click="toggleLevel(level as string)"
        >
          <div class="stat-value" :style="{ color: getLevelColor(level) }">{{ count }}</div>
          <div class="stat-label">{{ level }}</div>
        </div>
      </div>

      <div class="notifications-section">
        <div class="notifications-header">
          <h2>实时通知</h2>
          <button class="clear-button" @click="store.clearNotifications()">清空</button>
        </div>
        <div class="notifications-list">
          <div
            v-for="(notification, index) in displayedNotifications"
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
              <pre
                class="notification-body json-viewer"
                v-html="formatJsonHighlight(notification.content)"
                @click="handleContentClick"
              ></pre>
              <div v-if="'count' in notification" class="notification-count">
                出现 {{ notification.count }} 次
              </div>
            </div>
          </div>

          <div v-if="displayedNotifications.length === 0" class="empty-state">
            <div class="empty-icon">📭</div>
            <p>暂无通知</p>
            <p class="empty-hint">等待接收新的告警通知...</p>
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
  position: sticky;
  top: 0;
  z-index: 100;
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
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.1s;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-card:active {
  transform: scale(0.98);
}

.stat-card.active {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.25);
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
  max-height: calc(100vh - 280px);
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
  /* 背景为 Catppuccin Mocha base（深色），默认文字需用同调色板的 text 色 #cdd6f4，
     否则纯文本内容与深色背景对比度过低而看不见；JSON 高亮各色同样基于此调色板。 */
  color: #cdd6f4;
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

.notification-body :deep(.notif-link) {
  color: #89dceb;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
  font-weight: 600;
}

.notification-body :deep(.notif-link:hover) {
  color: #c5f6ff;
  background: rgba(137, 220, 235, 0.15);
  border-radius: 2px;
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
