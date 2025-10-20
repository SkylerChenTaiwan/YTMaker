// src/app/project/[id]/result/page.tsx
import { notFound } from 'next/navigation'
import { validateProjectId } from '@/lib/validators'
import { AppLayout } from '@/components/layout/AppLayout'
import { Breadcrumb } from '@/components/layout/Breadcrumb'

export default function ResultPage({ params }: { params: { id: string } }) {
  // 驗證 UUID 格式
  if (!validateProjectId(params.id)) {
    notFound()
  }

  return (
    <AppLayout>
      <div className="p-6">
        <Breadcrumb
          items={[
            { label: '主控台', href: '/' },
            { label: '專案名稱', href: `/project/${params.id}` },
            { label: '結果' },
          ]}
        />
        <h1>結果頁</h1>
        <p className="text-gray-600 mt-2">專案 ID: {params.id}</p>
        <p className="text-gray-600">完整實作在 Task-025。</p>
      </div>
    </AppLayout>
  )
}
