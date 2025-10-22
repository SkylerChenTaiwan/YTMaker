/**
 * LogViewer 元件
 *
 * 功能:
 * - 顯示即時日誌訊息
 * - 自動捲動到最新訊息
 * - 支援展開/收起
 * - 根據日誌級別顯示不同顏色
 */

import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'

interface LogEntry {
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
}

interface LogViewerProps {
  logs: LogEntry[]
}

const levelColors = {
  info: 'text-gray-700',
  warning: 'text-yellow-500',
  error: 'text-red-500',
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)

  // 自動捲動到最新
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  // 監聽用戶捲動
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    const isAtBottom =
      Math.abs(container.scrollHeight - container.clientHeight - container.scrollTop) < 10

    setAutoScroll(isAtBottom)
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold">日誌</h2>
        <div className="flex items-center gap-2">
          {!autoScroll && <span className="text-sm text-yellow-600">自動捲動已暫停</span>}
          <Button size="small" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? '收起' : '展開'}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div
          ref={logContainerRef}
          className="p-3 md:p-4 h-48 md:h-64 overflow-y-auto font-mono text-xs md:text-sm bg-gray-50"
          onScroll={handleScroll}
          data-testid="log-viewer"
        >
          {logs.length === 0 ? (
            <p className="text-gray-500">無日誌訊息</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1" data-testid="log-entry">
                <span className="text-gray-500 mr-2">[{formatTime(log.timestamp)}]</span>
                <span className={cn('font-medium mr-2', levelColors[log.level])}>
                  [{log.level.toUpperCase()}]
                </span>
                <span className={levelColors[log.level]}>{log.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
