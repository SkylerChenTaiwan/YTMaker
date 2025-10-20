// src/app/batch/[id]/page.tsx
import { notFound } from 'next/navigation'
import { validateBatchId } from '@/lib/validators'
import { AppLayout } from '@/components/layout/AppLayout'
import { Breadcrumb } from '@/components/layout/Breadcrumb'

export default function BatchDetailPage({ params }: { params: { id: string } }) {
  // 驗證 UUID 格式
  if (!validateBatchId(params.id)) {
    notFound()
  }

  return (
    <AppLayout>
      <div className="p-6">
        <Breadcrumb
          items={[
            { label: '主控台', href: '/' },
            { label: '批次處理', href: '/batch' },
            { label: '批次任務詳細' },
          ]}
        />
        <h1>批次任務詳細</h1>
        <p className="text-gray-600 mt-2">批次任務 ID: {params.id}</p>
        <p className="text-gray-600">完整實作在後續 task。</p>
      </div>
    </AppLayout>
  )
}
