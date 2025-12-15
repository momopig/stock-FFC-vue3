/**
 * WebSocket 工具函数
 * 用于管理 WebSocket 连接的生命周期
 */

/**
 * 创建 WebSocket 连接
 * @param {string} url - WebSocket URL
 * @param {Object} options - 配置选项
 * @param {Function} options.onMessage - 消息接收回调
 * @param {Function} options.onOpen - 连接打开回调
 * @param {Function} options.onClose - 连接关闭回调
 * @param {Function} options.onError - 错误回调
 * @param {number} options.reconnectInterval - 重连间隔（毫秒），默认 3000
 * @param {number} options.maxReconnectAttempts - 最大重连次数，默认 5，-1 表示无限重连
 * @returns {Object} WebSocket 连接管理器对象
 */
export function createWebSocket(url, options = {}) {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5
  } = options

  let ws = null
  let reconnectTimer = null
  let reconnectAttempts = 0
  let isManualClose = false // 标记是否为手动关闭

  /**
   * 连接 WebSocket
   */
  const connect = () => {
    try {
      ws = new WebSocket(url)

      ws.onopen = (event) => {
        console.log('WebSocket 连接已建立:', url)
        reconnectAttempts = 0 // 重置重连次数
        onOpen?.(event)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessage?.(data, event)
        } catch (error) {
          console.error('解析 WebSocket 消息失败:', error, event.data)
          // 如果解析失败，仍然传递原始数据
          onMessage?.(event.data, event)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket 错误:', error)
        onError?.(error)
      }

      ws.onclose = (event) => {
        console.log('WebSocket 连接已关闭:', event.code, event.reason)
        onClose?.(event)

        // 如果不是手动关闭，则尝试重连
        if (!isManualClose) {
          attemptReconnect()
        }
      }
    } catch (error) {
      console.error('创建 WebSocket 连接失败:', error)
      onError?.(error)
      if (!isManualClose) {
        attemptReconnect()
      }
    }
  }

  /**
   * 尝试重连
   */
  const attemptReconnect = () => {
    // 如果达到最大重连次数，停止重连
    if (maxReconnectAttempts !== -1 && reconnectAttempts >= maxReconnectAttempts) {
      console.error(`WebSocket 重连失败，已达到最大重连次数: ${maxReconnectAttempts}`)
      return
    }

    reconnectAttempts++
    console.log(`WebSocket 准备重连 (${reconnectAttempts}/${maxReconnectAttempts === -1 ? '∞' : maxReconnectAttempts})...`)

    reconnectTimer = setTimeout(() => {
      connect()
    }, reconnectInterval)
  }

  /**
   * 关闭 WebSocket 连接
   */
  const close = () => {
    isManualClose = true
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (ws) {
      ws.close()
      ws = null
    }
  }

  /**
   * 发送消息
   */
  const send = (data) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(typeof data === 'string' ? data : JSON.stringify(data))
    } else {
      console.warn('WebSocket 未连接，无法发送消息')
    }
  }

  /**
   * 获取连接状态
   */
  const getReadyState = () => {
    if (!ws) return WebSocket.CLOSED
    return ws.readyState
  }

  // 初始化连接
  connect()

  return {
    connect,
    close,
    send,
    getReadyState,
    get ws() {
      return ws
    }
  }
}

