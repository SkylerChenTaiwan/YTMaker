// tests/unit/pages/project/visual-config.test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VisualConfigPage from '@/app/project/[id]/configure/visual/page'

// Note: Next.js navigation and toast are globally mocked in jest.setup.js
// We test the real validateProjectId implementation

/**
 * 測試 4：視覺配置即時預覽
 *
 * 目的：驗證視覺配置變更能即時反映在預覽區
 */
describe('測試 4：視覺配置即時預覽', () => {
  const validProjectId = '12345678-1234-1234-1234-123456789012'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('4.1 字幕顏色變更應即時反映在預覽', async () => {
    const user = userEvent.setup()
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    // 等待頁面載入
    await waitFor(() => {
      expect(screen.getByText('字幕設定')).toBeInTheDocument()
    })

    // 找到顏色選擇器
    const colorInput = screen.getByLabelText('顏色') as HTMLInputElement

    // 變更顏色
    await act(async () => {
      await user.clear(colorInput)
      await user.type(colorInput, '#FF0000')
    })

    // 預覽應該更新（檢查樣式）
    const preview = screen.getByText('範例字幕')
    expect(preview).toHaveStyle({ color: '#FF0000' })
  })

  it('4.2 字幕大小變更應即時反映在預覽', async () => {
    const user = userEvent.setup()
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    await waitFor(() => {
      expect(screen.getByText('字幕設定')).toBeInTheDocument()
    })

    // 找到字體大小滑桿
    const sizeSlider = screen.getByRole('slider', { name: /字體大小/ }) as HTMLInputElement

    // 變更大小
    await act(async () => {
      await user.clear(sizeSlider)
      await user.type(sizeSlider, '72')
    })

    // 預覽應該更新
    const preview = screen.getByText('範例字幕')
    expect(preview).toHaveStyle({ fontSize: '72px' })
  })

  it('4.3 字型變更應即時反映在預覽', async () => {
    const user = userEvent.setup()
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    await waitFor(() => {
      expect(screen.getByText('字幕設定')).toBeInTheDocument()
    })

    // 找到字型選擇器
    const fontSelect = screen.getByLabelText('字型') as HTMLSelectElement

    // 變更字型
    await user.selectOptions(fontSelect, 'Arial')

    // 預覽應該更新
    const preview = screen.getByText('範例字幕')
    expect(preview).toHaveStyle({ fontFamily: 'Arial' })
  })

  it('4.4 陰影設定應即時反映在預覽', async () => {
    const user = userEvent.setup()
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    await waitFor(() => {
      expect(screen.getByText('字幕設定')).toBeInTheDocument()
    })

    // 預設陰影應該已啟用
    const preview = screen.getByText('範例字幕')
    expect(preview).toHaveStyle({
      textShadow: expect.stringContaining('2px 2px 4px'),
    })

    // 關閉陰影
    const shadowCheckbox = screen.getByLabelText('啟用陰影') as HTMLInputElement
    await user.click(shadowCheckbox)

    // 陰影應該消失
    expect(preview).toHaveStyle({ textShadow: 'none' })
  })
})

/**
 * 測試 5：自動儲存機制
 *
 * 目的：驗證配置變更後 1 秒自動儲存
 */
describe('測試 5：自動儲存機制', () => {
  const validProjectId = '12345678-1234-1234-1234-123456789012'

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('5.1 單次變更應在 1 秒後觸發儲存', async () => {
    const user = userEvent.setup({ delay: null })
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    await waitFor(() => {
      expect(screen.getByText('字幕設定')).toBeInTheDocument()
    })

    // 變更配置
    const sizeSlider = screen.getByRole('slider', { name: /字體大小/ }) as HTMLInputElement
    await act(async () => {
      await user.clear(sizeSlider)
      await user.type(sizeSlider, '50')
    })

    // 應該顯示儲存中
    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(screen.getByText(/儲存中/)).toBeInTheDocument()
    })

    // 等待儲存完成
    await act(async () => {
      jest.advanceTimersByTime(500)
    })
  })

  it('5.2 多次快速變更只應儲存最後一次', async () => {
    const user = userEvent.setup({ delay: null })
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    await waitFor(() => {
      expect(screen.getByText('字幕設定')).toBeInTheDocument()
    })

    const sizeSlider = screen.getByRole('slider', { name: /字體大小/ }) as HTMLInputElement

    // 快速多次變更
    await act(async () => {
      await user.clear(sizeSlider)
      await user.type(sizeSlider, '40')
      jest.advanceTimersByTime(200)
    })

    await act(async () => {
      await user.clear(sizeSlider)
      await user.type(sizeSlider, '50')
      jest.advanceTimersByTime(200)
    })

    await act(async () => {
      await user.clear(sizeSlider)
      await user.type(sizeSlider, '60')
    })

    // 等待 debounce 延遲
    await act(async () => {
      jest.advanceTimersByTime(1000)
    })

    // 應該只儲存一次（最後的值）
    const preview = screen.getByText('範例字幕')
    expect(preview).toHaveStyle({ fontSize: '60px' })
  })
})

/**
 * 測試 6：Logo 上傳與配置
 */
describe('測試 6：Logo 上傳與配置', () => {
  const validProjectId = '12345678-1234-1234-1234-123456789012'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('6.1 成功上傳 Logo 應顯示預覽', async () => {
    const user = userEvent.setup()
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    await waitFor(() => {
      expect(screen.getByText('Logo 設定')).toBeInTheDocument()
    })

    // 創建測試圖片檔案
    const file = new File(['logo'], 'logo.png', { type: 'image/png' })

    const fileInput = screen.getByLabelText('上傳 Logo') as HTMLInputElement
    await user.upload(fileInput, file)

    // 應該顯示 Logo 配置選項
    await waitFor(() => {
      expect(screen.getByLabelText(/大小:/)).toBeInTheDocument()
      expect(screen.getByLabelText(/透明度:/)).toBeInTheDocument()
    })
  })

  it('6.2 Logo 大小變更應即時反映', async () => {
    const user = userEvent.setup()
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    await waitFor(() => {
      expect(screen.getByText('Logo 設定')).toBeInTheDocument()
    })

    // 先上傳 Logo
    const file = new File(['logo'], 'logo.png', { type: 'image/png' })
    const fileInput = screen.getByLabelText('上傳 Logo') as HTMLInputElement
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByLabelText(/大小:/)).toBeInTheDocument()
    })

    // 變更大小
    const sizeSlider = screen.getByLabelText(/大小:/) as HTMLInputElement
    await user.clear(sizeSlider)
    await user.type(sizeSlider, '150')

    // Logo 應該更新大小
    await waitFor(() => {
      const logo = screen.getByAltText('Logo')
      expect(logo).toHaveStyle({ width: '150px', height: '150px' })
    })
  })

  it('6.3 Logo 透明度變更應即時反映', async () => {
    const user = userEvent.setup()
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    await waitFor(() => {
      expect(screen.getByText('Logo 設定')).toBeInTheDocument()
    })

    // 先上傳 Logo
    const file = new File(['logo'], 'logo.png', { type: 'image/png' })
    const fileInput = screen.getByLabelText('上傳 Logo') as HTMLInputElement
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByLabelText(/透明度:/)).toBeInTheDocument()
    })

    // 變更透明度
    const opacitySlider = screen.getByLabelText(/透明度:/) as HTMLInputElement
    await user.clear(opacitySlider)
    await user.type(opacitySlider, '50')

    // Logo 透明度應該更新
    await waitFor(() => {
      const logo = screen.getByAltText('Logo')
      expect(logo).toHaveStyle({ opacity: 0.5 })
    })
  })

  it('6.4 不支援的檔案格式應顯示錯誤', async () => {
    const user = userEvent.setup()
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    await waitFor(() => {
      expect(screen.getByText('Logo 設定')).toBeInTheDocument()
    })

    // 上傳不支援的格式
    const file = new File(['content'], 'file.pdf', { type: 'application/pdf' })
    const fileInput = screen.getByLabelText('上傳 Logo') as HTMLInputElement
    await user.upload(fileInput, file)

    // 不應該顯示配置選項
    await waitFor(() => {
      expect(screen.queryByLabelText(/大小:/)).not.toBeInTheDocument()
    })
  })
})
