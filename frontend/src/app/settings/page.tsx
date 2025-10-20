// src/app/settings/page.tsx
import { AppLayout } from '@/components/layout/AppLayout'
import { Breadcrumb } from '@/components/layout/Breadcrumb'

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="p-6">
        <Breadcrumb items={[{ label: '主控台', href: '/' }, { label: '系統設定' }]} />
        <h1>系統設定</h1>
        <p className="text-gray-600 mt-2">
          API Keys、YouTube 授權、偏好設定。完整實作在 Task-026。
        </p>
      </div>
    </AppLayout>
  )
}
