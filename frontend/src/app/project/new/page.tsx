// src/app/project/new/page.tsx
import { AppLayout } from '@/components/layout/AppLayout'
import { Breadcrumb } from '@/components/layout/Breadcrumb'

export default function NewProjectPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <Breadcrumb items={[{ label: '主控台', href: '/' }, { label: '新增專案' }]} />
        <h1>新增專案</h1>
        <p className="text-gray-600 mt-2">這裡是新增專案頁面。完整實作在 Task-022。</p>
      </div>
    </AppLayout>
  )
}
