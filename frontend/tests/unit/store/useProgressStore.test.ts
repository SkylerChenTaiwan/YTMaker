import { renderHook, act } from '@testing-library/react'
import { useProgressStore } from '@/store/useProgressStore'

describe('useProgressStore', () => {
  beforeEach(() => {
    // 重置 store
    useProgressStore.setState({
      projectId: null,
      stage: 'INITIALIZED',
      percentage: 0,
      logs: [],
    })
  })

  it('測試 3.1: updateProgress 正確更新進度', () => {
    const { result } = renderHook(() => useProgressStore())

    // 第一次更新 - 只更新 percentage
    act(() => {
      result.current.updateProgress({ percentage: 50 })
    })

    expect(result.current.percentage).toBe(50)
    expect(result.current.stage).toBe('INITIALIZED') // 未改變

    // 第二次更新 - 只更新 stage
    act(() => {
      result.current.updateProgress({ stage: 'RENDERING' })
    })

    expect(result.current.stage).toBe('RENDERING')
    expect(result.current.percentage).toBe(50) // 保持
  })

  it('測試 3.2: addLog 正確新增日誌', () => {
    const { result } = renderHook(() => useProgressStore())

    const logs = [
      { timestamp: '10:00:00', level: 'info' as const, message: '開始生成腳本' },
      { timestamp: '10:00:10', level: 'info' as const, message: '腳本生成完成' },
      { timestamp: '10:00:15', level: 'warning' as const, message: '圖片生成較慢' },
    ]

    act(() => {
      logs.forEach((log) => result.current.addLog(log))
    })

    expect(result.current.logs).toHaveLength(3)
    expect(result.current.logs[0].message).toBe('開始生成腳本')
    expect(result.current.logs[2].level).toBe('warning')
  })

  it('測試 3.3: clearLogs 清空所有日誌', () => {
    const { result } = renderHook(() => useProgressStore())

    // 新增多筆日誌並設定進度
    act(() => {
      result.current.addLog({ timestamp: '10:00:00', level: 'info', message: 'Log 1' })
      result.current.addLog({ timestamp: '10:00:01', level: 'info', message: 'Log 2' })
      result.current.updateProgress({ percentage: 50, projectId: 'proj-001' })
    })

    expect(result.current.logs).toHaveLength(2)
    expect(result.current.percentage).toBe(50)

    // 清空日誌
    act(() => {
      result.current.clearLogs()
    })

    // 日誌已清空
    expect(result.current.logs).toHaveLength(0)

    // 進度保持不變
    expect(result.current.percentage).toBe(50)
    expect(result.current.projectId).toBe('proj-001')
  })

  it('測試 3.4: resetProgress 完全重置進度狀態', () => {
    const { result } = renderHook(() => useProgressStore())

    // 設定完整的進度狀態
    act(() => {
      result.current.updateProgress({
        projectId: 'proj-001',
        stage: 'RENDERING',
        percentage: 75,
      })
      result.current.addLog({ timestamp: '10:00:00', level: 'info', message: 'Test log' })
    })

    // 確認狀態已設定
    expect(result.current.projectId).toBe('proj-001')
    expect(result.current.stage).toBe('RENDERING')
    expect(result.current.percentage).toBe(75)
    expect(result.current.logs).toHaveLength(1)

    // 重置進度
    act(() => {
      result.current.resetProgress()
    })

    // 所有欄位回到初始值
    expect(result.current.projectId).toBeNull()
    expect(result.current.stage).toBe('INITIALIZED')
    expect(result.current.percentage).toBe(0)
    expect(result.current.logs).toHaveLength(0)
  })
})
