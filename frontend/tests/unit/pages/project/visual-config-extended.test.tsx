// tests/unit/pages/project/visual-config-extended.test.tsx
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VisualConfigPage from '@/app/project/[id]/configure/visual/page'
import { useRouter, notFound } from 'next/navigation'
import { toast } from 'sonner'

// Note: Next.js navigation and toast are globally mocked in jest.setup.js

/**
 * 測試 12：UUID 驗證
 *
 * 目的：驗證只接受有效的 UUID v4 格式
 */
describe('測試 12：UUID 驗證', () => {
  let mockNotFound: jest.Mock

  beforeEach(() => {
    mockNotFound = notFound as jest.Mock
    jest.clearAllMocks()
  })

  it('12.1 有效的 UUID v4 應該正常載入頁面', () => {
    const validUuid = '12345678-1234-4234-8234-123456789012'
    render(<VisualConfigPage params={{ id: validUuid }} />)

    // 應該顯示字幕設定
    expect(screen.getByText('字幕設定')).toBeInTheDocument()
    expect(screen.getByText('Logo 設定')).toBeInTheDocument()

    // 不應該調用 notFound
    expect(mockNotFound).not.toHaveBeenCalled()
  })

  it('12.2 無效的 UUID 應該呼叫 notFound()', () => {
    const invalidUuid = 'not-a-valid-uuid'

    // notFound 會拋出錯誤，所以需要 catch
    expect(() => {
      render(<VisualConfigPage params={{ id: invalidUuid }} />)
    }).toThrow()

    expect(mockNotFound).toHaveBeenCalled()
  })

  it('12.3 空字串應該呼叫 notFound()', () => {
    expect(() => {
      render(<VisualConfigPage params={{ id: '' }} />)
    }).toThrow()

    expect(mockNotFound).toHaveBeenCalled()
  })

  it('12.4 UUID v1 格式應該被拒絕', () => {
    // UUID v1: 第 3 組以 1 開頭
    const uuidV1 = '12345678-1234-1234-8234-123456789012'

    expect(() => {
      render(<VisualConfigPage params={{ id: uuidV1 }} />)
    }).toThrow()

    expect(mockNotFound).toHaveBeenCalled()
  })

  it('12.5 UUID v3 格式應該被拒絕', () => {
    // UUID v3: 第 3 組以 3 開頭
    const uuidV3 = '12345678-1234-3234-8234-123456789012'

    expect(() => {
      render(<VisualConfigPage params={{ id: uuidV3 }} />)
    }).toThrow()

    expect(mockNotFound).toHaveBeenCalled()
  })

  it('12.6 格式正確但 variant 錯誤應該被拒絕', () => {
    // UUID v4 但 variant 不對（第 4 組應該以 8,9,a,b 開頭）
    const invalidVariant = '12345678-1234-4234-c234-123456789012'

    expect(() => {
      render(<VisualConfigPage params={{ id: invalidVariant }} />)
    }).toThrow()

    expect(mockNotFound).toHaveBeenCalled()
  })
})

/**
 * 測試 13：字幕配置完整測試
 *
 * 目的：測試所有字幕配置選項
 */
describe('測試 13：字幕配置完整測試', () => {
  const validProjectId = '12345678-1234-4234-8234-123456789012'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('13.1 預設配置應該正確載入', () => {
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    // 檢查預設字型
    const fontSelect = screen.getByLabelText('字型') as HTMLSelectElement
    expect(fontSelect.value).toBe('Noto Sans TC')

    // 檢查預設陰影啟用
    const shadowCheckbox = screen.getByLabelText('啟用陰影') as HTMLInputElement
    expect(shadowCheckbox.checked).toBe(true)
  })

  it('13.2 字型變更應該即時反映在預覽', async () => {
    const user = userEvent.setup()
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    const fontSelect = screen.getByLabelText('字型')
    await user.selectOptions(fontSelect, 'Arial')

    // 預覽應該更新字型
    const preview = screen.getByText('範例字幕')
    expect(preview).toHaveStyle({ fontFamily: 'Arial' })
  })

  it('13.3 字體大小變更應該即時反映', async () => {
    const user = userEvent.setup()
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    // 找到字體大小滑桿
    const sizeSlider = screen.getByDisplayValue('48') as HTMLInputElement

    // 變更大小
    await user.clear(sizeSlider)
    await user.type(sizeSlider, '72')

    // 預覽應該更新
    const preview = screen.getByText('範例字幕')
    expect(preview).toHaveStyle({ fontSize: '72px' })
  })

  it('13.4 陰影展開/收起邏輯', async () => {
    const user = userEvent.setup()
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    // 預設陰影啟用，陰影顏色應該顯示
    expect(screen.getByText('陰影顏色')).toBeInTheDocument()

    // 關閉陰影
    const shadowCheckbox = screen.getByLabelText('啟用陰影')
    await user.click(shadowCheckbox)

    // 陰影顏色選項應該消失
    await waitFor(() => {
      expect(screen.queryByText('陰影顏色')).not.toBeInTheDocument()
    })

    // 重新啟用陰影
    await user.click(shadowCheckbox)

    // 陰影顏色選項應該重新顯示
    await waitFor(() => {
      expect(screen.getByText('陰影顏色')).toBeInTheDocument()
    })
  })

  it('13.5 陰影顏色變更應該即時反映', async () => {
    const user = userEvent.setup()
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    // 找到陰影顏色輸入
    const shadowColorInput = screen.getAllByDisplayValue('#000000')[0] as HTMLInputElement

    // 變更顏色
    await user.clear(shadowColorInput)
    await user.type(shadowColorInput, '#FF0000')

    // 預覽應該更新陰影顏色
    const preview = screen.getByText('範例字幕')
    expect(preview.style.textShadow).toContain('#FF0000')
  })
})

/**
 * 測試 14：Logo 配置完整測試
 *
 * 目的：測試 Logo 上傳、配置和錯誤處理
 */
describe('測試 14：Logo 配置完整測試', () => {
  const validProjectId = '12345678-1234-4234-8234-123456789012'
  let toastSuccessSpy: jest.Mock
  let toastErrorSpy: jest.Mock

  beforeEach(() => {
    toastSuccessSpy = (toast.success as jest.Mock)
    toastErrorSpy = (toast.error as jest.Mock)
    jest.clearAllMocks()
  })

  it('14.1 初始狀態：無 Logo 時不顯示配置選項', () => {
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    // Logo 設定區應該存在
    expect(screen.getByText('Logo 設定')).toBeInTheDocument()

    // 但大小和透明度選項不應該顯示
    expect(screen.queryByText(/大小:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/透明度:/)).not.toBeInTheDocument()
  })

  it('14.2 上傳 PNG Logo 應該成功', async () => {
    const user = userEvent.setup()
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    // 創建 PNG 圖片檔案
    const file = new File(['logo'], 'logo.png', { type: 'image/png' })

    const fileInput = screen.getByLabelText('上傳 Logo') as HTMLInputElement
    await user.upload(fileInput, file)

    // 應該顯示成功 toast
    await waitFor(() => {
      expect(toastSuccessSpy).toHaveBeenCalledWith('Logo 已上傳')
    })

    // 配置選項應該顯示
    await waitFor(() => {
      expect(screen.getByText(/大小:/)).toBeInTheDocument()
      expect(screen.getByText(/透明度:/)).toBeInTheDocument()
    })
  })

  it('14.3 上傳 JPG Logo 應該成功', async () => {
    const user = userEvent.setup()
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    const file = new File(['logo'], 'logo.jpg', { type: 'image/jpeg' })

    const fileInput = screen.getByLabelText('上傳 Logo') as HTMLInputElement
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(toastSuccessSpy).toHaveBeenCalledWith('Logo 已上傳')
    })
  })

  it('14.4 上傳 SVG Logo 應該成功', async () => {
    const user = userEvent.setup()
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    const file = new File(['<svg></svg>'], 'logo.svg', { type: 'image/svg+xml' })

    const fileInput = screen.getByLabelText('上傳 Logo') as HTMLInputElement
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(toastSuccessSpy).toHaveBeenCalledWith('Logo 已上傳')
    })
  })

  it('14.5 上傳不支援的格式應該顯示錯誤', async () => {
    const user = userEvent.setup()
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    const file = new File(['content'], 'file.pdf', { type: 'application/pdf' })

    const fileInput = screen.getByLabelText('上傳 Logo') as HTMLInputElement
    await user.upload(fileInput, file)

    // 應該顯示錯誤 toast
    await waitFor(() => {
      expect(toastErrorSpy).toHaveBeenCalledWith('檔案必須為 PNG, JPG 或 SVG 格式')
    })

    // 配置選項不應該顯示
    expect(screen.queryByText(/大小:/)).not.toBeInTheDocument()
  })

  it('14.6 Logo 大小調整應該即時反映', async () => {
    const user = userEvent.setup()
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    // 先上傳 Logo
    const file = new File(['logo'], 'logo.png', { type: 'image/png' })
    const fileInput = screen.getByLabelText('上傳 Logo') as HTMLInputElement
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByText(/大小:/)).toBeInTheDocument()
    })

    // 調整大小
    const sizeSlider = screen.getByDisplayValue('100') as HTMLInputElement
    await user.clear(sizeSlider)
    await user.type(sizeSlider, '150')

    // Logo 應該更新大小
    await waitFor(() => {
      const logo = screen.getByAltText('Logo')
      expect(logo).toHaveStyle({ width: '150px', height: '150px' })
    })
  })

  it('14.7 Logo 透明度調整應該即時反映', async () => {
    const user = userEvent.setup()
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    // 先上傳 Logo
    const file = new File(['logo'], 'logo.png', { type: 'image/png' })
    const fileInput = screen.getByLabelText('上傳 Logo') as HTMLInputElement
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByText(/透明度:/)).toBeInTheDocument()
    })

    // 調整透明度（預設是 100%）
    const opacitySlider = screen.getAllByDisplayValue('100').find(
      (el) => el.parentElement?.textContent?.includes('透明度')
    ) as HTMLInputElement

    await user.clear(opacitySlider)
    await user.type(opacitySlider, '50')

    // Logo 透明度應該更新
    await waitFor(() => {
      const logo = screen.getByAltText('Logo')
      expect(logo).toHaveStyle({ opacity: '0.5' })
    })
  })
})

/**
 * 測試 15：導航與儲存
 *
 * 目的：測試頁面導航和自動儲存功能
 */
describe('測試 15：導航與儲存', () => {
  const validProjectId = '12345678-1234-4234-8234-123456789012'
  let mockRouterPush: jest.Mock
  let mockRouterBack: jest.Mock

  beforeEach(() => {
    mockRouterPush = (useRouter as jest.Mock)().push as jest.Mock
    mockRouterBack = (useRouter as jest.Mock)().back as jest.Mock
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('15.1 上一步按鈕應該調用 router.back()', async () => {
    const user = userEvent.setup({ delay: null })
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    const backButton = screen.getByRole('button', { name: '上一步' })
    await user.click(backButton)

    expect(mockRouterBack).toHaveBeenCalled()
  })

  it('15.2 下一步按鈕應該跳轉到 prompt-model 頁面', async () => {
    const user = userEvent.setup({ delay: null })
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    const nextButton = screen.getByRole('button', { name: '下一步' })
    await user.click(nextButton)

    expect(mockRouterPush).toHaveBeenCalledWith(
      `/project/${validProjectId}/configure/prompt-model`
    )
  })

  it('15.3 配置變更應該觸發自動儲存（1 秒延遲）', async () => {
    const user = userEvent.setup({ delay: null })
    const toastSuccessSpy = (toast.success as jest.Mock)

    render(<VisualConfigPage params={{ id: validProjectId }} />)

    // 變更配置
    const fontSelect = screen.getByLabelText('字型')
    await act(async () => {
      await user.selectOptions(fontSelect, 'Arial')
    })

    // 1 秒內不應該儲存
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(toastSuccessSpy).not.toHaveBeenCalled()

    // 1 秒後應該觸發儲存
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // 等待儲存完成（模擬 API 呼叫 500ms）
    act(() => {
      jest.advanceTimersByTime(500)
    })

    await waitFor(() => {
      expect(toastSuccessSpy).toHaveBeenCalledWith('配置已自動儲存')
    })
  })

  it('15.4 儲存中時應該顯示儲存指示', async () => {
    const user = userEvent.setup({ delay: null })
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    // 變更配置
    const fontSelect = screen.getByLabelText('字型')
    await act(async () => {
      await user.selectOptions(fontSelect, 'Arial')
    })

    // 等待 debounce 延遲
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // 應該顯示「儲存中...」
    await waitFor(() => {
      expect(screen.getByText('儲存中...')).toBeInTheDocument()
    })

    // 等待儲存完成
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // 儲存指示應該消失
    await waitFor(() => {
      expect(screen.queryByText('儲存中...')).not.toBeInTheDocument()
    })
  })

  it('15.5 儲存中時按鈕仍然可用（非阻塞）', async () => {
    const user = userEvent.setup({ delay: null })
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    // 變更配置觸發儲存
    const fontSelect = screen.getByLabelText('字型')
    await act(async () => {
      await user.selectOptions(fontSelect, 'Arial')
    })

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // 等待儲存開始
    await waitFor(() => {
      expect(screen.getByText('儲存中...')).toBeInTheDocument()
    })

    // 下一步按鈕仍然可點擊
    const nextButton = screen.getByRole('button', { name: '下一步' })
    expect(nextButton).not.toBeDisabled()

    // 可以點擊下一步
    await user.click(nextButton)
    expect(mockRouterPush).toHaveBeenCalled()
  })
})

/**
 * 測試 16：響應式設計
 *
 * 目的：驗證響應式佈局
 */
describe('測試 16：響應式設計', () => {
  const validProjectId = '12345678-1234-4234-8234-123456789012'

  it('16.1 預覽區應該有正確的寬度類名', () => {
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    // 預覽區容器
    const previewContainer = document.querySelector('.lg\\:w-3\\/5')
    expect(previewContainer).toBeInTheDocument()
  })

  it('16.2 配置面板應該可滾動', () => {
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    // 配置面板應該有 overflow-y-auto
    const configPanel = document.querySelector('.overflow-y-auto')
    expect(configPanel).toBeInTheDocument()
  })

  it('16.3 預覽區應該有 aspect-video', () => {
    render(<VisualConfigPage params={{ id: validProjectId }} />)

    const videoPreview = document.querySelector('.aspect-video')
    expect(videoPreview).toBeInTheDocument()
  })
})
