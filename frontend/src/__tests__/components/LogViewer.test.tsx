/**
 * LogViewer 組件單元測試
 *
 * 測試日誌查看器的核心功能：
 * - 日誌顯示
 * - 展開/收起功能
 * - 自動捲動到最新
 * - 用戶手動捲動控制
 * - 日誌級別顏色
 * - 時間格式化
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { LogViewer } from '@/components/feature/LogViewer/LogViewer'

describe('LogViewer', () => {
  const mockLogs = [
    {
      timestamp: '2025-10-21T10:00:00Z',
      level: 'info' as const,
      message: '開始生成腳本',
    },
    {
      timestamp: '2025-10-21T10:05:00Z',
      level: 'warning' as const,
      message: 'API 速率限制警告',
    },
    {
      timestamp: '2025-10-21T10:10:00Z',
      level: 'error' as const,
      message: 'Stability AI API 錯誤',
    },
  ]

  it('應該顯示標題「日誌」', () => {
    render(<LogViewer logs={[]} />)

    expect(screen.getByText('日誌')).toBeInTheDocument()
  })

  it('應該初始狀態為收起', () => {
    render(<LogViewer logs={mockLogs} />)

    // 初始狀態應該沒有日誌區域
    expect(screen.queryByTestId('log-viewer')).not.toBeInTheDocument()

    // 應該有展開按鈕
    expect(screen.getByRole('button', { name: '展開' })).toBeInTheDocument()
  })

  it('應該能夠展開日誌區域', () => {
    render(<LogViewer logs={mockLogs} />)

    // 點擊展開
    const expandButton = screen.getByRole('button', { name: '展開' })
    fireEvent.click(expandButton)

    // 應該顯示日誌區域
    expect(screen.getByTestId('log-viewer')).toBeInTheDocument()

    // 按鈕文字應該變為「收起」
    expect(screen.getByRole('button', { name: '收起' })).toBeInTheDocument()
  })

  it('應該能夠收起日誌區域', () => {
    render(<LogViewer logs={mockLogs} />)

    // 展開
    fireEvent.click(screen.getByRole('button', { name: '展開' }))
    expect(screen.getByTestId('log-viewer')).toBeInTheDocument()

    // 收起
    fireEvent.click(screen.getByRole('button', { name: '收起' }))
    expect(screen.queryByTestId('log-viewer')).not.toBeInTheDocument()
  })

  it('應該顯示所有日誌訊息', () => {
    render(<LogViewer logs={mockLogs} />)

    // 展開
    fireEvent.click(screen.getByRole('button', { name: '展開' }))

    // 應該顯示 3 條日誌
    const logEntries = screen.getAllByTestId('log-entry')
    expect(logEntries).toHaveLength(3)

    // 驗證日誌內容
    expect(screen.getByText('開始生成腳本')).toBeInTheDocument()
    expect(screen.getByText('API 速率限制警告')).toBeInTheDocument()
    expect(screen.getByText('Stability AI API 錯誤')).toBeInTheDocument()
  })

  it('應該為不同日誌級別使用不同顏色', () => {
    render(<LogViewer logs={mockLogs} />)

    fireEvent.click(screen.getByRole('button', { name: '展開' }))

    // INFO - 灰色
    const infoLabel = screen.getByText('[INFO]')
    expect(infoLabel).toHaveClass('text-gray-700')

    // WARNING - 黃色
    const warningLabel = screen.getByText('[WARNING]')
    expect(warningLabel).toHaveClass('text-yellow-500')

    // ERROR - 紅色
    const errorLabel = screen.getByText('[ERROR]')
    expect(errorLabel).toHaveClass('text-red-500')
  })

  it('應該顯示時間戳記', () => {
    render(<LogViewer logs={mockLogs} />)

    fireEvent.click(screen.getByRole('button', { name: '展開' }))

    // 應該有時間戳記（格式：[HH:MM:SS]）
    const timestampPattern = /\[\d{2}:\d{2}:\d{2}\]/
    const logContainer = screen.getByTestId('log-viewer')

    expect(logContainer.textContent).toMatch(timestampPattern)
  })

  it('應該在沒有日誌時顯示提示訊息', () => {
    render(<LogViewer logs={[]} />)

    fireEvent.click(screen.getByRole('button', { name: '展開' }))

    expect(screen.getByText('無日誌訊息')).toBeInTheDocument()
  })

  it('應該支援自動捲動到最新日誌', async () => {
    const { rerender } = render(<LogViewer logs={mockLogs} />)

    fireEvent.click(screen.getByRole('button', { name: '展開' }))

    const logContainer = screen.getByTestId('log-viewer')

    // Mock scrollHeight and scrollTop
    Object.defineProperty(logContainer, 'scrollHeight', {
      writable: true,
      value: 1000,
    })
    Object.defineProperty(logContainer, 'scrollTop', {
      writable: true,
      value: 0,
    })

    // 新增更多日誌
    const newLogs = [
      ...mockLogs,
      {
        timestamp: '2025-10-21T10:15:00Z',
        level: 'info' as const,
        message: '新的日誌訊息',
      },
    ]

    rerender(<LogViewer logs={newLogs} />)

    // 應該自動捲動到底部
    await waitFor(() => {
      expect(logContainer.scrollTop).toBe(1000)
    })
  })

  it('應該在用戶手動捲動時暫停自動捲動', () => {
    render(<LogViewer logs={mockLogs} />)

    fireEvent.click(screen.getByRole('button', { name: '展開' }))

    const logContainer = screen.getByTestId('log-viewer')

    // Mock scroll properties
    Object.defineProperty(logContainer, 'scrollHeight', { value: 1000 })
    Object.defineProperty(logContainer, 'clientHeight', { value: 200 })
    Object.defineProperty(logContainer, 'scrollTop', { value: 100 })

    // 觸發捲動事件（用戶捲動到中間位置）
    fireEvent.scroll(logContainer)

    // 應該顯示「自動捲動已暫停」
    expect(screen.getByText('自動捲動已暫停')).toBeInTheDocument()
  })

  it('應該在用戶捲動回底部時恢復自動捲動', async () => {
    render(<LogViewer logs={mockLogs} />)

    fireEvent.click(screen.getByRole('button', { name: '展開' }))

    const logContainer = screen.getByTestId('log-viewer')

    // 設定初始捲動位置（中間）
    Object.defineProperty(logContainer, 'scrollHeight', { value: 1000 })
    Object.defineProperty(logContainer, 'clientHeight', { value: 200 })
    Object.defineProperty(logContainer, 'scrollTop', { value: 100, writable: true })

    // 捲動到中間 → 暫停
    fireEvent.scroll(logContainer)
    expect(screen.getByText('自動捲動已暫停')).toBeInTheDocument()

    // 捲動回底部
    logContainer.scrollTop = 800 // 800 + 200 = 1000 (接近底部)
    fireEvent.scroll(logContainer)

    // 自動捲動應該恢復（提示消失）
    await waitFor(() => {
      expect(screen.queryByText('自動捲動已暫停')).not.toBeInTheDocument()
    })
  })

  it('應該正確格式化時間（HH:MM:SS）', () => {
    const logs = [
      {
        timestamp: '2025-10-21T14:35:42Z',
        level: 'info' as const,
        message: '測試訊息',
      },
    ]

    render(<LogViewer logs={logs} />)

    fireEvent.click(screen.getByRole('button', { name: '展開' }))

    // 應該顯示格式化後的時間（依據本地時區）
    const timestampPattern = /\[\d{2}:\d{2}:\d{2}\]/
    const logContainer = screen.getByTestId('log-viewer')

    expect(logContainer.textContent).toMatch(timestampPattern)
  })

  it('應該為日誌訊息也使用顏色', () => {
    render(<LogViewer logs={mockLogs} />)

    fireEvent.click(screen.getByRole('button', { name: '展開' }))

    const errorMessage = screen.getByText('Stability AI API 錯誤')
    expect(errorMessage).toHaveClass('text-red-500')
  })

  it('應該使用等寬字體顯示日誌', () => {
    render(<LogViewer logs={mockLogs} />)

    fireEvent.click(screen.getByRole('button', { name: '展開' }))

    const logContainer = screen.getByTestId('log-viewer')
    expect(logContainer).toHaveClass('font-mono')
  })

  it('應該允許日誌區域捲動', () => {
    render(<LogViewer logs={mockLogs} />)

    fireEvent.click(screen.getByRole('button', { name: '展開' }))

    const logContainer = screen.getByTestId('log-viewer')
    expect(logContainer).toHaveClass('overflow-y-auto')
  })

  it('應該正確處理大量日誌', () => {
    const manyLogs = Array.from({ length: 100 }, (_, i) => ({
      timestamp: `2025-10-21T10:${String(i).padStart(2, '0')}:00Z`,
      level: 'info' as const,
      message: `日誌訊息 ${i + 1}`,
    }))

    render(<LogViewer logs={manyLogs} />)

    fireEvent.click(screen.getByRole('button', { name: '展開' }))

    // 應該顯示所有 100 條日誌
    const logEntries = screen.getAllByTestId('log-entry')
    expect(logEntries).toHaveLength(100)
  })
})
