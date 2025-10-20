import { renderHook, act } from '@testing-library/react'
import { useConfigStore } from '@/store/useConfigStore'
import type { VisualConfig } from '@/types/models'

describe('useConfigStore', () => {
  beforeEach(() => {
    // 重置 store
    useConfigStore.setState({
      visualConfig: null,
      promptTemplates: [],
    })
  })

  it('測試 2.1: setVisualConfig 正確儲存視覺配置', () => {
    const { result } = renderHook(() => useConfigStore())

    const visualConfig: VisualConfig = {
      subtitle: {
        font_size: 48,
        font_color: '#FFFFFF',
        position: { x: 640, y: 600 },
        border_width: 2,
        border_color: '#000000',
        shadow: true,
      },
      logo: {
        enabled: true,
        position: { x: 50, y: 50 },
        size: { width: 100, height: 100 },
        opacity: 0.8,
      },
      overlays: [],
    }

    act(() => {
      result.current.setVisualConfig(visualConfig)
    })

    expect(result.current.visualConfig?.subtitle.font_size).toBe(48)
    expect(result.current.visualConfig?.logo.enabled).toBe(true)
    expect(result.current.visualConfig?.overlays).toHaveLength(0)
  })

  it('測試 2.2: addPromptTemplate 新增 Prompt 範本', () => {
    const { result } = renderHook(() => useConfigStore())

    const newTemplate = {
      name: '科技頻道範本',
      content: '請將以下內容改寫為適合科技頻道的腳本...',
      created_at: '2025-01-19T10:00:00Z',
    }

    act(() => {
      result.current.addPromptTemplate(newTemplate)
    })

    expect(result.current.promptTemplates).toHaveLength(1)
    expect(result.current.promptTemplates[0].id).toBeDefined()
    expect(result.current.promptTemplates[0].name).toBe('科技頻道範本')
    // 驗證 ID 是 UUID 格式 (基本檢查)
    expect(result.current.promptTemplates[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  })

  it('測試 2.3: deletePromptTemplate 刪除 Prompt 範本', () => {
    const { result } = renderHook(() => useConfigStore())

    // 新增 3 個範本
    const template1 = {
      name: '範本 1',
      content: '內容 1',
      created_at: '2025-01-19T10:00:00Z',
    }
    const template2 = {
      name: '範本 2',
      content: '內容 2',
      created_at: '2025-01-19T10:00:00Z',
    }
    const template3 = {
      name: '範本 3',
      content: '內容 3',
      created_at: '2025-01-19T10:00:00Z',
    }

    act(() => {
      result.current.addPromptTemplate(template1)
      result.current.addPromptTemplate(template2)
      result.current.addPromptTemplate(template3)
    })

    expect(result.current.promptTemplates).toHaveLength(3)

    // 刪除第二個範本
    const idToDelete = result.current.promptTemplates[1].id

    act(() => {
      result.current.deletePromptTemplate(idToDelete)
    })

    expect(result.current.promptTemplates).toHaveLength(2)
    expect(result.current.promptTemplates.find((t) => t.id === idToDelete)).toBeUndefined()

    // 刪除不存在的範本不報錯
    act(() => {
      result.current.deletePromptTemplate('non-existent-id')
    })

    expect(result.current.promptTemplates).toHaveLength(2) // 列表不變
  })
})
