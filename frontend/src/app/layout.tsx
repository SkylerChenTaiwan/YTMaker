import type { Metadata } from 'next'
import { Inter, Noto_Sans_TC } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })
const notoSansTC = Noto_Sans_TC({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'YTMaker',
  description: 'AI 驅動的 YouTube 影片自動化生成工具',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className={`${inter.className} ${notoSansTC.className}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
