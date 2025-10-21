import { render, screen } from '@testing-library/react'
import { WelcomeStep } from '@/components/setup/steps/WelcomeStep'

describe('WelcomeStep', () => {
  it('顯示歡迎標題', () => {
    render(<WelcomeStep />)

    const title = screen.getByRole('heading', { name: /歡迎使用 YTMaker/i })
    expect(title).toBeInTheDocument()
  })

  it('顯示功能列表', () => {
    render(<WelcomeStep />)

    expect(screen.getByText(/🎬 自動生成腳本/)).toBeInTheDocument()
    expect(screen.getByText(/🖼️ 自動生成圖片/)).toBeInTheDocument()
    expect(screen.getByText(/🎙️ 自動生成語音/)).toBeInTheDocument()
    expect(screen.getByText(/🎥 自動合成影片/)).toBeInTheDocument()
    expect(screen.getByText(/📤 自動上傳 YouTube/)).toBeInTheDocument()
  })

  it('顯示說明文字', () => {
    render(<WelcomeStep />)

    expect(screen.getByText(/這是一個本地端的 YouTube 影片自動化生產工具/)).toBeInTheDocument()
    expect(screen.getByText(/讓我們先完成一些基本設定/)).toBeInTheDocument()
  })
})
