import { render, screen } from '@testing-library/react'
import { WelcomeStep } from '@/components/setup/steps/WelcomeStep'

describe('WelcomeStep', () => {
  it('顯示歡迎標題', () => {
    render(<WelcomeStep />)

    const title = screen.getByRole('heading', { name: /歡迎使用 YTMaker/i })
    expect(title).toBeInTheDocument()
  })

  it('顯示設定流程說明', () => {
    render(<WelcomeStep />)

    expect(screen.getByText(/設定流程/)).toBeInTheDocument()
    expect(screen.getByText(/設定 API Keys/)).toBeInTheDocument()
    expect(screen.getByText(/配置 Gemini、Stability AI 和 D-ID 的 API 金鑰/)).toBeInTheDocument()
    expect(screen.getByText(/連結 YouTube 帳號/)).toBeInTheDocument()
    expect(screen.getByText(/開始使用/)).toBeInTheDocument()
  })

  it('顯示說明文字', () => {
    render(<WelcomeStep />)

    expect(screen.getByText(/YTMaker 是一個智能影片生成工具/)).toBeInTheDocument()
    expect(screen.getByText(/點擊「下一步」開始設定您的 API Keys/)).toBeInTheDocument()
  })
})
