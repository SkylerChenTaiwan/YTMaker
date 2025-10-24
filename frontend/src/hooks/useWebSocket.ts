/**
 * useWebSocket Hook
 *
 * 功能:
 * - 管理 WebSocket 連線
 * - 自動重連機制
 * - 心跳檢測
 * - 訊息處理
 */

import { useEffect, useRef, useState, useCallback } from 'react'

interface UseWebSocketOptions {
  onMessage: (message: any) => void
  onError?: (error: Event) => void
  onReconnect?: () => void
  reconnectInterval?: number
  heartbeatInterval?: number
}

export function useWebSocket(projectId: string, options: UseWebSocketOptions) {
  const {
    onMessage,
    onError,
    onReconnect,
    reconnectInterval = 3000,
    heartbeatInterval = 30000,
  } = options

  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const reconnectTimerRef = useRef<NodeJS.Timeout>()

  // 使用 ref 儲存回調函數，避免依賴變化導致重新連線
  const onMessageRef = useRef(onMessage)
  const onErrorRef = useRef(onError)
  const onReconnectRef = useRef(onReconnect)

  // 更新 refs
  useEffect(() => {
    onMessageRef.current = onMessage
    onErrorRef.current = onError
    onReconnectRef.current = onReconnect
  }, [onMessage, onError, onReconnect])

  const connect = useCallback(() => {
    // 關閉現有連線
    if (wsRef.current) {
      wsRef.current.close()
    }

    // 建立 WebSocket 連線
    // 從 NEXT_PUBLIC_API_URL 推導 WebSocket URL
    // http://localhost:8000 -> ws://localhost:8000
    // https://example.com -> wss://example.com
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const wsBaseUrl = apiUrl.replace(/^http/, 'ws')
    const wsUrl = `${wsBaseUrl}/api/v1/projects/${projectId}/progress`

    console.log('[WebSocket] 連線 URL:', wsUrl)
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket 連線成功')
      setIsConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)

        // 處理 ping 訊息 (心跳檢測) - backend 會發送 ping，我們回應 pong
        if (message.event === 'ping') {
          ws.send(JSON.stringify({ event: 'pong' }))
          return
        }

        // 處理 connected 訊息
        if (message.event === 'connected') {
          console.log('WebSocket 已連線:', message.data)
          return
        }

        onMessageRef.current(message)
      } catch (error) {
        console.error('WebSocket 訊息解析錯誤:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket 錯誤:', error)
      setIsConnected(false)
      onErrorRef.current?.(error)
    }

    ws.onclose = () => {
      console.log('WebSocket 連線關閉')
      setIsConnected(false)

      // 自動重連
      reconnectTimerRef.current = setTimeout(() => {
        console.log('嘗試重新連線...')
        onReconnectRef.current?.()
        connect()
      }, reconnectInterval)
    }

    wsRef.current = ws
  }, [projectId, reconnectInterval])

  // 手動重連
  const reconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
    }
    connect()
  }, [connect])

  // 發送訊息
  const send = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket 未連線,無法發送訊息')
    }
  }, [])

  // 初始化連線
  useEffect(() => {
    connect()

    // 清理函數
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
    }
  }, [connect])

  return {
    isConnected,
    reconnect,
    send,
  }
}
