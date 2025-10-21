'use client'

import { useState } from 'react'
import { Tabs } from 'antd'
import type { TabsProps } from 'antd'
import { Toaster } from 'sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { APIKeysTab } from '@/components/settings/APIKeysTab'
import { YouTubeAuthTab } from '@/components/settings/YouTubeAuthTab'
import { PreferencesTab } from '@/components/settings/PreferencesTab'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<string>('api-keys')

  const tabItems: TabsProps['items'] = [
    {
      key: 'api-keys',
      label: 'API 金鑰',
      children: <APIKeysTab />,
    },
    {
      key: 'youtube',
      label: 'YouTube 授權',
      children: <YouTubeAuthTab />,
    },
    {
      key: 'preferences',
      label: '偏好設定',
      children: <PreferencesTab />,
    },
  ]

  return (
    <AppLayout>
      <Toaster position="top-center" richColors />
      <div className="p-6">
        <Breadcrumb items={[{ label: '主控台', href: '/' }, { label: '系統設定' }]} />

        <div className="max-w-4xl mx-auto mt-6">
          <h1 className="text-3xl font-bold mb-6">系統設定</h1>

          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        </div>
      </div>
    </AppLayout>
  )
}
