/**
 * useWebSocket Hook 單元測試
 *
 * 測試 WebSocket hook 的核心功能：
 * - 連線建立
 * - 訊息接收與解析
 * - 自動重連機制
 * - 心跳檢測
 * - 手動重連
 * - 錯誤處理
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useWebSocket } from '@/hooks/useWebSocket'

describe('useWebSocket', () => {
  let mockWs: any
  let onOpenHandler: any
  let onMessageHandler: any
  let onErrorHandler: any
  let onCloseHandler: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock WebSocket
    mockWs = {
      readyState: WebSocket.OPEN,
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }

    global.WebSocket = vi.fn(() => {
      setTimeout(() => {
        if (onOpenHandler) onOpenHandler()
      }, 10)

      return mockWs
    }) as any

    // 捕獲事件處理器
    mockWs.addEventListener = vi.fn((event: string, handler: any) => {
      if (event === 'open') onOpenHandler = handler
      if (event === 'message') onMessageHandler = handler
      if (event === 'error') onErrorHandler = handler
      if (event === 'close') onCloseHandler = handler
    })

    // Mock onopen, onmessage, onerror, onclose setters
    Object.defineProperty(mockWs, 'onopen', {
      set: (handler) => {
        onOpenHandler = handler
      },
    })
    Object.defineProperty(mockWs, 'onmessage', {
      set: (handler) => {
        onMessageHandler = handler
      },
    })
    Object.defineProperty(mockWs, 'onerror', {
      set: (handler) => {
        onErrorHandler = handler
      },
    })
    Object.defineProperty(mockWs, 'onclose', {
      set: (handler) => {
        onCloseHandler = handler
      },
    })
  })

  afterEach(() => {
    onOpenHandler = null
    onMessageHandler = null
    onErrorHandler = null
    onCloseHandler = null
  })

  it('應該成功建立 WebSocket 連線', async () => {
    const onMessage = vi.fn()

    const { result } = renderHook(() =>
      useWebSocket('test-project-123', {
        onMessage,
      })
    )

    // 初始狀態應該是未連線
    expect(result.current.isConnected).toBe(false)

    // 觸發 onopen
    await act(async () => {
      if (onOpenHandler) {
        onOpenHandler()
      }
    })

    // 連線後應該設為已連線
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
    })
  })

  it('應該正確接收並解析 WebSocket 訊息', async () => {
    const onMessage = vi.fn()

    renderHook(() =>
      useWebSocket('test-project-123', {
        onMessage,
      })
    )

    // 觸發 onopen
    await act(async () => {
      if (onOpenHandler) onOpenHandler()
    })

    // 模擬收到訊息
    const testMessage = {
      type: 'progress',
      data: {
        overall: 50,
        stage: 'assets',
        message: '素材生成中...',
      },
    }

    await act(async () => {
      if (onMessageHandler) {
        onMessageHandler({
          data: JSON.stringify(testMessage),
        })
      }
    })

    // 驗證 onMessage 被調用
    expect(onMessage).toHaveBeenCalledWith(testMessage)
  })

  it('應該忽略心跳 pong 訊息', async () => {
    const onMessage = vi.fn()

    renderHook(() =>
      useWebSocket('test-project-123', {
        onMessage,
      })
    )

    await act(async () => {
      if (onOpenHandler) onOpenHandler()
    })

    // 收到 pong 訊息
    await act(async () => {
      if (onMessageHandler) {
        onMessageHandler({
          data: JSON.stringify({ type: 'pong' }),
        })
      }
    })

    // onMessage 不應該被調用（pong 訊息被過濾）
    expect(onMessage).not.toHaveBeenCalled()
  })

  it('應該處理訊息解析錯誤', async () => {
    const onMessage = vi.fn()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    renderHook(() =>
      useWebSocket('test-project-123', {
        onMessage,
      })
    )

    await act(async () => {
      if (onOpenHandler) onOpenHandler()
    })

    // 發送無效 JSON
    await act(async () => {
      if (onMessageHandler) {
        onMessageHandler({
          data: 'invalid json',
        })
      }
    })

    // 應該記錄錯誤，但不崩潰
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'WebSocket 訊息解析錯誤:',
      expect.any(Error)
    )
    expect(onMessage).not.toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it('應該在連線開啟後啟動心跳', async () => {
    vi.useFakeTimers()

    const onMessage = vi.fn()

    renderHook(() =>
      useWebSocket('test-project-123', {
        onMessage,
        heartbeatInterval: 1000, // 1 秒心跳
      })
    )

    // 觸發 onopen
    await act(async () => {
      if (onOpenHandler) onOpenHandler()
    })

    // 快進 1 秒
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    // 應該發送 ping
    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }))

    vi.useRealTimers()
  })

  it('應該在連線關閉後自動重連', async () => {
    vi.useFakeTimers()

    const onMessage = vi.fn()
    const onReconnect = vi.fn()

    const { result } = renderHook(() =>
      useWebSocket('test-project-123', {
        onMessage,
        onReconnect,
        reconnectInterval: 2000, // 2 秒後重連
      })
    )

    // 觸發 onopen
    await act(async () => {
      if (onOpenHandler) onOpenHandler()
    })

    expect(result.current.isConnected).toBe(true)

    // 觸發 onclose
    await act(async () => {
      if (onCloseHandler) onCloseHandler()
    })

    expect(result.current.isConnected).toBe(false)

    // 快進 2 秒
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    // 應該調用 onReconnect
    expect(onReconnect).toHaveBeenCalled()

    // 應該嘗試重新建立連線
    expect(global.WebSocket).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })

  it('應該支援手動重連', async () => {
    const onMessage = vi.fn()

    const { result } = renderHook(() =>
      useWebSocket('test-project-123', {
        onMessage,
      })
    )

    // 初始連線
    await act(async () => {
      if (onOpenHandler) onOpenHandler()
    })

    expect(global.WebSocket).toHaveBeenCalledTimes(1)

    // 手動重連
    await act(async () => {
      result.current.reconnect()
    })

    // 應該關閉舊連線並建立新連線
    expect(mockWs.close).toHaveBeenCalled()
    expect(global.WebSocket).toHaveBeenCalledTimes(2)
  })

  it('應該支援發送訊息', async () => {
    const onMessage = vi.fn()

    const { result } = renderHook(() =>
      useWebSocket('test-project-123', {
        onMessage,
      })
    )

    // 觸發 onopen
    await act(async () => {
      if (onOpenHandler) onOpenHandler()
    })

    // 發送訊息
    await act(async () => {
      result.current.send({ type: 'test', data: 'hello' })
    })

    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'test', data: 'hello' })
    )
  })

  it('應該在未連線時拒絕發送訊息', async () => {
    const onMessage = vi.fn()
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    mockWs.readyState = WebSocket.CLOSED

    const { result } = renderHook(() =>
      useWebSocket('test-project-123', {
        onMessage,
      })
    )

    // 嘗試發送訊息
    await act(async () => {
      result.current.send({ type: 'test' })
    })

    // 不應該發送
    expect(mockWs.send).not.toHaveBeenCalled()

    // 應該記錄警告
    expect(consoleWarnSpy).toHaveBeenCalledWith('WebSocket 未連線,無法發送訊息')

    consoleWarnSpy.mockRestore()
  })

  it('應該在錯誤發生時調用 onError', async () => {
    const onMessage = vi.fn()
    const onError = vi.fn()

    renderHook(() =>
      useWebSocket('test-project-123', {
        onMessage,
        onError,
      })
    )

    const errorEvent = new Event('error')

    // 觸發 onerror
    await act(async () => {
      if (onErrorHandler) onErrorHandler(errorEvent)
    })

    expect(onError).toHaveBeenCalledWith(errorEvent)
  })

  it('應該在 unmount 時清理資源', async () => {
    vi.useFakeTimers()

    const onMessage = vi.fn()

    const { unmount } = renderHook(() =>
      useWebSocket('test-project-123', {
        onMessage,
      })
    )

    // 觸發 onopen
    await act(async () => {
      if (onOpenHandler) onOpenHandler()
    })

    // Unmount
    unmount()

    // 應該關閉連線
    expect(mockWs.close).toHaveBeenCalled()

    vi.useRealTimers()
  })
})
