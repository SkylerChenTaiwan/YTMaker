'use client'

import { useState, useEffect } from 'react'
import { Button, Table, Progress, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EditAPIKeyModal } from './EditAPIKeyModal'
import { useAuthStore } from '@/store/useAuthStore'
import { systemApi } from '@/lib/api/system'
import type { APIProvider } from '@/types/system'

interface APIKeyRow {
  key: string
  service: string
  provider: APIProvider
  status: string
  lastTested: string
}

export const APIKeysTab = () => {
  const { apiKeys, quotas, fetchAPIKeys, fetchQuotas } = useAuthStore()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<APIProvider | null>(null)
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchAPIKeys(), fetchQuotas()])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEdit = (provider: APIProvider) => {
    setEditingProvider(provider)
    setIsEditModalOpen(true)
  }

  // 映射 API provider 名稱（從 snake_case 到 camelCase）
  const getStoreKey = (provider: APIProvider): keyof typeof apiKeys => {
    const mapping = {
      gemini: 'gemini',
      stability_ai: 'stabilityAI',
      did: 'dId',
    } as const
    return mapping[provider]
  }

  const handleTest = async (provider: APIProvider) => {
    const storeKey = getStoreKey(provider)
    const key = apiKeys[storeKey]?.value
    if (!key) {
      message.error('請先設定 API Key')
      return
    }

    try {
      const result = await systemApi.testAPIKey(provider, key)
      if (result.is_valid) {
        message.success('連線成功')
        await fetchAPIKeys()
      } else {
        message.error('連線失敗')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '測試失敗'
      message.error(errorMessage)
    }
  }

  const handleDelete = async (provider: APIProvider) => {
    try {
      await systemApi.deleteAPIKey(provider)
      message.success('API Key 已刪除')
      await fetchAPIKeys()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '刪除失敗'
      message.error(errorMessage)
    }
  }

  const apiKeyRows: APIKeyRow[] = [
    {
      key: 'gemini',
      service: 'Google Gemini API',
      provider: 'gemini',
      status: apiKeys.gemini?.value ? '✓ 已設定' : '✗ 未設定',
      lastTested: apiKeys.gemini?.tested ? '已測試' : '-',
    },
    {
      key: 'stability_ai',
      service: 'Stability AI API',
      provider: 'stability_ai',
      status: apiKeys.stabilityAI?.value ? '✓ 已設定' : '✗ 未設定',
      lastTested: apiKeys.stabilityAI?.tested ? '已測試' : '-',
    },
    {
      key: 'did',
      service: 'D-ID API',
      provider: 'did',
      status: apiKeys.dId?.value ? '✓ 已設定' : '✗ 未設定',
      lastTested: apiKeys.dId?.tested ? '已測試' : '-',
    },
  ]

  const columns: ColumnsType<APIKeyRow> = [
    {
      title: 'API 服務',
      dataIndex: 'service',
      key: 'service',
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <span className={status.includes('✓') ? 'text-green-600' : 'text-gray-500'}>
          {status}
        </span>
      ),
    },
    {
      title: '最後測試時間',
      dataIndex: 'lastTested',
      key: 'lastTested',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => handleEdit(record.provider)}>
            編輯
          </Button>
          <Button size="small" onClick={() => handleTest(record.provider)}>
            測試連線
          </Button>
          {apiKeys[getStoreKey(record.provider)]?.value && (
            <Button
              size="small"
              danger
              onClick={() => handleDelete(record.provider)}
            >
              刪除
            </Button>
          )}
        </div>
      ),
    },
  ]

  const getQuotaColor = (percent: number) => {
    if (percent > 90) return '#ff4d4f'
    if (percent > 80) return '#faad14'
    return '#52c41a'
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">API 金鑰</h2>

      {/* API 金鑰列表 */}
      <Table
        columns={columns}
        dataSource={apiKeyRows}
        loading={loading}
        pagination={false}
        className="mb-8"
      />

      {/* API 配額顯示 */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">API 配額</h3>

        {quotas.did && (
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="font-medium">D-ID</span>
              <span className="text-gray-600">
                {quotas.did.used_minutes} / {quotas.did.total_minutes} 分鐘
              </span>
            </div>
            <Progress
              percent={quotas.did.usage_percent}
              strokeColor={getQuotaColor(quotas.did.usage_percent)}
              showInfo={false}
            />
            {quotas.did.usage_percent > 80 && (
              <p className="text-yellow-600 text-sm mt-2">
                ⚠️ 配額即將用盡，請注意使用
              </p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              重置日期：{new Date(quotas.did.reset_date).toLocaleDateString('zh-TW')}
            </p>
          </div>
        )}

        {quotas.youtube && (
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="font-medium">YouTube</span>
              <span className="text-gray-600">
                {quotas.youtube.used_units?.toLocaleString()} /{' '}
                {quotas.youtube.total_units?.toLocaleString()} units
              </span>
            </div>
            <Progress
              percent={quotas.youtube.usage_percent}
              strokeColor={getQuotaColor(quotas.youtube.usage_percent)}
              showInfo={false}
            />
            {quotas.youtube.usage_percent > 80 && (
              <p className="text-yellow-600 text-sm mt-2">
                ⚠️ 配額即將用盡，請注意使用
              </p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              重置日期：{new Date(quotas.youtube.reset_date).toLocaleDateString('zh-TW')}
            </p>
          </div>
        )}

        {!quotas.did && !quotas.youtube && (
          <p className="text-gray-500">尚無配額資訊</p>
        )}
      </div>

      {/* 編輯 API Key Modal */}
      {isEditModalOpen && editingProvider && (
        <EditAPIKeyModal
          provider={editingProvider}
          currentKey={apiKeys[getStoreKey(editingProvider)]?.value || null}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingProvider(null)
          }}
          onSave={async () => {
            setIsEditModalOpen(false)
            setEditingProvider(null)
            await loadData()
          }}
        />
      )}
    </div>
  )
}
