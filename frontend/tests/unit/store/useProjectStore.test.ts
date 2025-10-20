import { renderHook, act } from '@testing-library/react'
import { useProjectStore } from '@/store/useProjectStore'
import type { Project } from '@/types/models'

describe('useProjectStore', () => {
  beforeEach(() => {
    // 重置 store
    useProjectStore.setState({
      projects: {
        list: [],
        current: null,
        loading: false,
        error: null,
      },
    })
  })

  it('測試 1.1: 初始化狀態正確', () => {
    const { result } = renderHook(() => useProjectStore())

    expect(result.current.projects.list).toEqual([])
    expect(result.current.projects.current).toBeNull()
    expect(result.current.projects.loading).toBe(false)
    expect(result.current.projects.error).toBeNull()
  })

  it('測試 1.2: setProjects 正確更新專案列表', () => {
    const { result } = renderHook(() => useProjectStore())

    const testProjects: Project[] = [
      {
        id: 'proj-001',
        project_name: '測試專案 1',
        status: 'INITIALIZED',
        content_text: '測試內容...',
        created_at: '2025-01-19T10:00:00Z',
        updated_at: '2025-01-19T10:00:00Z',
      },
      {
        id: 'proj-002',
        project_name: '測試專案 2',
        status: 'COMPLETED',
        content_text: '另一個測試內容...',
        created_at: '2025-01-18T10:00:00Z',
        updated_at: '2025-01-19T10:00:00Z',
      },
    ]

    act(() => {
      result.current.setProjects(testProjects)
    })

    expect(result.current.projects.list).toHaveLength(2)
    expect(result.current.projects.list[0].id).toBe('proj-001')
    expect(result.current.projects.list[1].id).toBe('proj-002')
  })

  it('測試 1.3: updateProject 正確更新專案狀態', () => {
    const { result } = renderHook(() => useProjectStore())

    const testProjects: Project[] = [
      {
        id: 'proj-001',
        project_name: '測試專案 1',
        status: 'INITIALIZED',
        content_text: '測試內容...',
        created_at: '2025-01-19T10:00:00Z',
        updated_at: '2025-01-19T10:00:00Z',
      },
    ]

    act(() => {
      result.current.setProjects(testProjects)
      result.current.setCurrentProject(testProjects[0])
    })

    act(() => {
      result.current.updateProject('proj-001', { status: 'SCRIPT_GENERATING' })
    })

    // list 中的專案已更新
    const updatedProject = result.current.projects.list.find((p) => p.id === 'proj-001')
    expect(updatedProject?.status).toBe('SCRIPT_GENERATING')

    // current 也已更新
    expect(result.current.projects.current?.status).toBe('SCRIPT_GENERATING')

    // 其他欄位未改變
    expect(updatedProject?.project_name).toBe('測試專案 1')
  })

  it('測試 1.4: deleteProject 正確刪除專案並清除 current', () => {
    const { result } = renderHook(() => useProjectStore())

    const testProjects: Project[] = [
      {
        id: 'proj-001',
        project_name: '測試專案 1',
        status: 'INITIALIZED',
        content_text: '測試內容...',
        created_at: '2025-01-19T10:00:00Z',
        updated_at: '2025-01-19T10:00:00Z',
      },
      {
        id: 'proj-002',
        project_name: '測試專案 2',
        status: 'COMPLETED',
        content_text: '另一個測試內容...',
        created_at: '2025-01-18T10:00:00Z',
        updated_at: '2025-01-19T10:00:00Z',
      },
      {
        id: 'proj-003',
        project_name: '測試專案 3',
        status: 'INITIALIZED',
        content_text: '第三個測試內容...',
        created_at: '2025-01-17T10:00:00Z',
        updated_at: '2025-01-19T10:00:00Z',
      },
    ]

    act(() => {
      result.current.setProjects(testProjects)
      result.current.setCurrentProject(testProjects[0]) // 設定 current 為第一個專案
    })

    // 刪除 current 專案
    act(() => {
      result.current.deleteProject('proj-001')
    })

    // 列表減少
    expect(result.current.projects.list).toHaveLength(2)

    // current 已清空
    expect(result.current.projects.current).toBeNull()

    // 其他專案仍存在
    expect(result.current.projects.list.find((p) => p.id === 'proj-002')).toBeDefined()
    expect(result.current.projects.list.find((p) => p.id === 'proj-003')).toBeDefined()

    // 刪除不存在的專案不報錯
    act(() => {
      result.current.deleteProject('proj-999')
    })
    expect(result.current.projects.list).toHaveLength(2) // 列表不變
  })
})
