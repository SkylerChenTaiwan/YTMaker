// src/app/templates/page.tsx
import { AppLayout } from '@/components/layout/AppLayout'
import { Breadcrumb } from '@/components/layout/Breadcrumb'

export default function TemplatesPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <Breadcrumb items={[{ label: '主控台', href: '/' }, { label: '模板管理' }]} />
        <h1>模板管理</h1>
        <p className="text-gray-600 mt-2">管理視覺模板和 Prompt 範本。完整實作在後續 task。</p>
      </div>
    </AppLayout>
  )
}
