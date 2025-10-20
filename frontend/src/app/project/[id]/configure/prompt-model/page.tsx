// src/app/project/[id]/configure/prompt-model/page.tsx
import { notFound } from 'next/navigation'
import { validateProjectId } from '@/lib/validators'
import { AppLayout } from '@/components/layout/AppLayout'
import { Breadcrumb } from '@/components/layout/Breadcrumb'

export default function PromptModelPage({ params }: { params: { id: string } }) {
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
            { label: '新增專案', href: '/project/new' },
            { label: 'Prompt 與模型' },
          ]}
        />
        <h1>Prompt 與模型設定</h1>
        <p className="text-gray-600 mt-2">專案 ID: {params.id}</p>
        <p className="text-gray-600">完整實作在 Task-023。</p>
      </div>
    </AppLayout>
  )
}
