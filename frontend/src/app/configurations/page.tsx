// src/app/configurations/page.tsx
import { AppLayout } from '@/components/layout/AppLayout'
import { Breadcrumb } from '@/components/layout/Breadcrumb'

export default function ConfigurationsPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <Breadcrumb items={[{ label: '主控台', href: '/' }, { label: '配置管理' }]} />
        <h1>配置管理</h1>
        <p className="text-gray-600 mt-2">
          管理視覺配置 (字幕、Logo、疊加元素)。完整實作在後續 task。
        </p>
      </div>
    </AppLayout>
  )
}
