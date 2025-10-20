// src/components/layout/AppLayout/AppLayout.tsx
import { ReactNode } from 'react'
import { NavigationBar } from './NavigationBar'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* 導航列 */}
      <NavigationBar />

      {/* 主內容區 */}
      <main className="flex-1 bg-gray-50">{children}</main>

      {/* Footer (可選) */}
      <footer className="bg-white border-t py-4 px-6 text-center text-sm text-gray-600">
        © 2025 YTMaker. All rights reserved.
      </footer>
    </div>
  )
}
