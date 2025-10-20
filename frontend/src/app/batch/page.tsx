// src/app/batch/page.tsx
import { AppLayout } from '@/components/layout/AppLayout'
import { Breadcrumb } from '@/components/layout/Breadcrumb'

export default function BatchPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <Breadcrumb items={[{ label: '主控台', href: '/' }, { label: '批次處理' }]} />
        <h1>批次處理</h1>
        <p className="text-gray-600 mt-2">批次生成影片,管理批次任務。完整實作在後續 task。</p>
      </div>
    </AppLayout>
  )
}
