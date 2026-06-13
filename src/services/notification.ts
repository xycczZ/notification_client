import { invoke } from '@tauri-apps/api/core'

async function sendTauriNotification(title: string, body: string) {
  await invoke('plugin:notification|notify', {
    options: {
      title,
      body
    }
  })
}

async function isTauriPermissionGranted() {
  try {
    const granted = await invoke<boolean | null>('plugin:notification|is_permission_granted')
    if (granted !== null) {
      return granted
    }

    const permission = await invoke<NotificationPermission>('plugin:notification|request_permission')
    return permission === 'granted'
  } catch (error) {
    console.warn('Failed to check Tauri notification permission:', error)
    return null
  }
}

function sendBrowserNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body })
    return true
  }

  return false
}

export async function sendSystemNotification(title: string, body: string) {
  const notificationTitle = title || '通知告警系统'
  const notificationBody = body || ''

  try {
    await sendTauriNotification(notificationTitle, notificationBody)
    return true
  } catch (error) {
    console.error('Failed to send Tauri system notification:', error)

    if (sendBrowserNotification(notificationTitle, notificationBody)) {
      return true
    }
  }

  return false
}

export async function requestNotificationPermission() {
  const tauriGranted = await isTauriPermissionGranted()
  if (tauriGranted !== null) {
    return tauriGranted
  }

  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission === 'denied') {
      return false
    }

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}
