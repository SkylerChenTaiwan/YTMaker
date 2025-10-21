import { render, screen } from '@testing-library/react'
import { CompletionStep } from '@/components/setup/steps/CompletionStep'
import { useAuthStore } from '@/store/useAuthStore'

describe('CompletionStep', () => {
  beforeEach(() => {
    // 重置 store 到初始狀態
    useAuthStore.setState({
      apiKeys: {
        gemini: { value: '', tested: false },
        stabilityAI: { value: '', tested: false },
        dId: { value: '', tested: false },
      },
      youtube: {
        connected: false,
        channel_name: '',
        channel_id: '',
        thumbnail_url: '',
      },
    })
  })

  it('全部完成時顯示成功圖示和訊息', () => {
    // 設定所有 API Keys 和 YouTube 已連結
    useAuthStore.setState({
      apiKeys: {
        gemini: { value: 'test-key', tested: true },
        stabilityAI: { value: 'test-key', tested: true },
        dId: { value: 'test-key', tested: true },
      },
      youtube: {
        connected: true,
        channel_name: 'My Channel',
        channel_id: 'UC123',
        thumbnail_url: '',
      },
    })

    render(<CompletionStep />)

    expect(screen.getByText('所有設定已完成!')).toBeInTheDocument()
    // 檢查 SVG 圖示存在
    const icon = screen.getByRole('img')
    expect(icon).toBeInTheDocument()
  })

  it('正確顯示 API Keys 設定狀態 (X/3)', () => {
    // 設定 2 個 API Keys
    useAuthStore.setState({
      apiKeys: {
        gemini: { value: 'test-key', tested: true },
        stabilityAI: { value: 'test-key', tested: true },
        dId: { value: '', tested: false },
      },
    })

    render(<CompletionStep />)

    expect(screen.getByText(/已設定 2\/3/)).toBeInTheDocument()
  })

  it('未連結時顯示未連結狀態', () => {
    // 測試未連結狀態
    render(<CompletionStep />)
    expect(screen.getByText('未連結')).toBeInTheDocument()
  })

  it('已連結時顯示頻道名稱', () => {
    // 測試已連結狀態
    useAuthStore.setState({
      youtube: {
        connected: true,
        channel_name: 'Test Channel',
        channel_id: 'UC123',
        thumbnail_url: '',
      },
    })

    render(<CompletionStep />)
    expect(screen.getByText(/已連結 Test Channel/)).toBeInTheDocument()
  })

  it('部分未完成時顯示警告訊息', () => {
    // 只設定部分 API Keys
    useAuthStore.setState({
      apiKeys: {
        gemini: { value: 'test-key', tested: true },
        stabilityAI: { value: '', tested: false },
        dId: { value: '', tested: false },
      },
      youtube: {
        connected: false,
        channel_name: '',
        channel_id: '',
        thumbnail_url: '',
      },
    })

    render(<CompletionStep />)

    expect(
      screen.getByText(/部分設定未完成,部分功能可能無法使用/)
    ).toBeInTheDocument()
    expect(screen.getByText(/您可以稍後在設定頁面完成配置/)).toBeInTheDocument()
  })

  it('全部完成時不顯示警告訊息', () => {
    // 設定所有項目
    useAuthStore.setState({
      apiKeys: {
        gemini: { value: 'test-key', tested: true },
        stabilityAI: { value: 'test-key', tested: true },
        dId: { value: 'test-key', tested: true },
      },
      youtube: {
        connected: true,
        channel_name: 'My Channel',
        channel_id: 'UC123',
        thumbnail_url: '',
      },
    })

    render(<CompletionStep />)

    expect(
      screen.queryByText(/部分設定未完成/)
    ).not.toBeInTheDocument()
  })
})
