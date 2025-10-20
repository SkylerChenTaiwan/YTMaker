// src/app/page.tsx
import { AppLayout } from '@/components/layout/AppLayout'

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <h1>主控台</h1>
        <p className="text-gray-600 mt-2">歡迎使用 YTMaker!這裡是主控台頁面。</p>
        {/* 完整實作在 Task-021 */}
      </div>
    </AppLayout>
  )
}
