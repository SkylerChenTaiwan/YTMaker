'use client'

import { useState } from 'react'
import { Modal, Input, Button, message } from 'antd'
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'
import { systemApi } from '@/lib/api/system'
import type { APIProvider } from '@/types/system'

interface Props {
  provider: APIProvider
  currentKey?: string | null
  onClose: () => void
  onSave: () => void
}

const providerNames: Record<APIProvider, string> = {
  gemini: 'Google Gemini',
  stability_ai: 'Stability AI',
  did: 'D-ID',
}

export const EditAPIKeyModal = ({ provider, currentKey, onClose, onSave }: Props) => {
  const [apiKey, setApiKey] = useState(currentKey || '')
  const [showKey, setShowKey] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleTest = async () => {
    if (!apiKey.trim()) {
      message.error('請輸入 API Key')
      return
    }

    setTestStatus('testing')
    setTestMessage('')

    try {
      const result = await systemApi.testAPIKey(provider, apiKey)
      if (result.is_valid) {
        setTestStatus('success')
        setTestMessage('連線成功')
      } else {
        setTestStatus('error')
        setTestMessage(result.message || '連線失敗')
      }
    } catch (error: any) {
      setTestStatus('error')
      setTestMessage(error.message || 'API Key 無效或已過期')
    }
  }

  const handleSave = async () => {
    if (!apiKey.trim()) {
      message.error('請輸入 API Key')
      return
    }

    setIsSaving(true)
    try {
      await systemApi.saveAPIKey(provider, apiKey)
      message.success('API Key 已儲存')
      onSave()
    } catch (error: any) {
      message.error(error.message || '儲存失敗')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      title={`編輯 ${providerNames[provider]} API Key`}
      open={true}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="save" type="primary" loading={isSaving} onClick={handleSave}>
          儲存
        </Button>,
      ]}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          請輸入您的 {providerNames[provider]} API Key
        </p>

        <div className="relative">
          <Input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="輸入 API Key"
            suffix={
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              </button>
            }
          />
        </div>

        <Button
          type="default"
          onClick={handleTest}
          loading={testStatus === 'testing'}
          disabled={!apiKey.trim()}
        >
          測試連線
        </Button>

        {testStatus === 'success' && (
          <p className="text-green-600 text-sm flex items-center gap-1">
            <span>✓</span>
            <span>{testMessage}</span>
          </p>
        )}
        {testStatus === 'error' && (
          <p className="text-red-600 text-sm flex items-center gap-1">
            <span>✗</span>
            <span>{testMessage}</span>
          </p>
        )}
      </div>
    </Modal>
  )
}
