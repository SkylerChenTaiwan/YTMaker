import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'YTMaker - AI 驅動的 YouTube 影片生成工具',
  description: '本地端桌面應用程式，使用 AI 自動生成 YouTube 影片',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  )
}
