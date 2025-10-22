// src/app/templates/page.tsx
'use client'

import { useState } from 'react'
import { Tabs } from 'antd'
import { AppLayout } from '@/components/layout/AppLayout'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import VisualTemplatesTab from '@/components/templates/VisualTemplatesTab'
import PromptTemplatesTab from '@/components/templates/PromptTemplatesTab'

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState('visual')

  const items = [
    {
      key: 'visual',
      label: '視覺配置模板',
      children: <VisualTemplatesTab />,
    },
    {
      key: 'prompt',
      label: 'Prompt 範本',
      children: <PromptTemplatesTab />,
    },
  ]

  return (
    <AppLayout>
      <div className="p-6">
        <Breadcrumb items={[{ label: '主控台', href: '/' }, { label: '模板管理' }]} />

        <h1 className="text-3xl font-bold mb-6 mt-4">模板管理</h1>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={items}
        />
      </div>
    </AppLayout>
  )
}
