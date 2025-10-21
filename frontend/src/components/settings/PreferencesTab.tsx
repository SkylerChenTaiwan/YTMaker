'use client'

import { useState, useEffect } from 'react'
import { Button, Select, Slider, Checkbox, message, Modal, Input } from 'antd'
import { systemApi } from '@/lib/api/system'
import type { Preferences } from '@/types/system'

export const PreferencesTab = () => {
  const [preferences, setPreferences] = useState<Preferences>({
    voice_gender: 'male',
    voice_speed: 1.0,
    default_privacy: 'public',
    project_retention_days: -1,
    keep_intermediate_files: true,
    notification_on_complete: true,
    notification_on_error: true,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [showClearDataModal, setShowClearDataModal] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const data = await systemApi.getPreferences()
      setPreferences(data)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '載入設定失敗'
      message.error(errorMessage)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await systemApi.savePreferences(preferences)
      message.success('設定已儲存')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '儲存失敗'
      message.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClearCache = async () => {
    Modal.confirm({
      title: '確認清除快取',
      content: '確定要清除所有快取嗎？',
      okText: '確認',
      cancelText: '取消',
      onOk: async () => {
        try {
          await systemApi.clearCache()
          message.success('快取已清除')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '清除失敗'
          message.error(errorMessage)
        }
      },
    })
  }

  const handleExport = async () => {
    try {
      const data = await systemApi.exportData()

      // 生成 JSON 檔案並下載
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ytmaker-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)

      message.success('資料已匯出')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '匯出失敗'
      message.error(errorMessage)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await systemApi.importData(formData)
      message.success(
        `匯入成功：${result.imported_projects} 個專案、${result.imported_configurations} 個配置`
      )

      // 重新載入設定
      await loadPreferences()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '匯入失敗'
      message.error(errorMessage)
    }

    // 重置 input
    e.target.value = ''
  }

  const handleResetSettings = async () => {
    Modal.confirm({
      title: '確認重置設定',
      content: '確定要重置所有設定為預設值嗎？',
      okText: '確認',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await systemApi.resetSettings()
          message.success('設定已重置')
          await loadPreferences()
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '重置失敗'
          message.error(errorMessage)
        }
      },
    })
  }

  const handleClearAllData = async () => {
    if (confirmText !== 'DELETE ALL') {
      message.error('請輸入正確的確認文字')
      return
    }

    try {
      await systemApi.clearAllData()
      message.success('所有資料已清除')
      setShowClearDataModal(false)
      setConfirmText('')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '清除失敗'
      message.error(errorMessage)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">偏好設定</h2>

      {/* 一般設定 */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">一般設定</h3>

        <div className="space-y-4">
          <div>
            <label className="block mb-2">預設語音性別</label>
            <Select
              value={preferences.voice_gender}
              onChange={(value) =>
                setPreferences({ ...preferences, voice_gender: value })
              }
              options={[
                { value: 'male', label: '男聲' },
                { value: 'female', label: '女聲' },
              ]}
              className="w-48"
            />
          </div>

          <div>
            <label className="block mb-2">
              預設語速：{preferences.voice_speed.toFixed(1)}x
            </label>
            <Slider
              min={0.5}
              max={2.0}
              step={0.1}
              value={preferences.voice_speed}
              onChange={(value) => setPreferences({ ...preferences, voice_speed: value })}
              className="w-64"
            />
          </div>

          <div>
            <label className="block mb-2">預設隱私設定</label>
            <Select
              value={preferences.default_privacy}
              onChange={(value) =>
                setPreferences({ ...preferences, default_privacy: value })
              }
              options={[
                { value: 'public', label: '公開' },
                { value: 'unlisted', label: '不公開' },
                { value: 'private', label: '私人' },
              ]}
              className="w-48"
            />
          </div>
        </div>
      </section>

      {/* 檔案管理 */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">檔案管理</h3>

        <div className="space-y-4">
          <div>
            <label className="block mb-2">專案檔案保留時間</label>
            <Select
              value={String(preferences.project_retention_days)}
              onChange={(value) =>
                setPreferences({
                  ...preferences,
                  project_retention_days: Number(value),
                })
              }
              options={[
                { value: '-1', label: '永久保留' },
                { value: '30', label: '30 天後刪除' },
                { value: '7', label: '7 天後刪除' },
              ]}
              className="w-48"
            />
          </div>

          <div>
            <Checkbox
              checked={preferences.keep_intermediate_files}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  keep_intermediate_files: e.target.checked,
                })
              }
            >
              保留中間素材（圖片、音訊、片段等）
            </Checkbox>
          </div>
        </div>
      </section>

      {/* 通知設定 */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">通知設定</h3>

        <div className="space-y-2">
          <Checkbox
            checked={preferences.notification_on_complete}
            onChange={(e) =>
              setPreferences({
                ...preferences,
                notification_on_complete: e.target.checked,
              })
            }
          >
            影片生成完成時顯示系統通知
          </Checkbox>
          <Checkbox
            checked={preferences.notification_on_error}
            onChange={(e) =>
              setPreferences({
                ...preferences,
                notification_on_error: e.target.checked,
              })
            }
          >
            發生錯誤時顯示通知
          </Checkbox>
        </div>
      </section>

      {/* 資料管理 */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">資料管理</h3>

        <div className="flex flex-col gap-2">
          <Button type="default" onClick={handleClearCache} className="w-fit">
            清除所有快取
          </Button>
          <Button type="default" onClick={handleExport} className="w-fit">
            匯出所有專案資料
          </Button>
          <div>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="import-file"
            />
            <Button
              type="default"
              onClick={() => document.getElementById('import-file')?.click()}
              className="w-fit"
            >
              匯入專案資料
            </Button>
          </div>
        </div>
      </section>

      {/* 危險區域 */}
      <section className="mb-8 border-2 border-red-300 rounded-lg p-4 bg-red-50">
        <h3 className="text-lg font-semibold mb-4 text-red-700">危險區域</h3>

        <div className="flex flex-col gap-2">
          <Button danger onClick={handleResetSettings} className="w-fit">
            重置所有設定
          </Button>
          <Button
            danger
            onClick={() => setShowClearDataModal(true)}
            className="w-fit"
          >
            清除所有專案資料
          </Button>
        </div>
      </section>

      {/* 儲存按鈕 */}
      <div className="flex justify-end">
        <Button type="primary" onClick={handleSave} loading={isSaving}>
          儲存變更
        </Button>
      </div>

      {/* 清除資料確認 Modal */}
      <Modal
        title="確認清除所有專案資料"
        open={showClearDataModal}
        onCancel={() => {
          setShowClearDataModal(false)
          setConfirmText('')
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setShowClearDataModal(false)
              setConfirmText('')
            }}
          >
            取消
          </Button>,
          <Button
            key="delete"
            danger
            onClick={handleClearAllData}
            disabled={confirmText !== 'DELETE ALL'}
          >
            確認刪除
          </Button>,
        ]}
      >
        <div className="space-y-4">
          <p className="text-red-600 font-semibold flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            此操作將刪除所有專案、影片檔案和中間素材，且無法復原！
          </p>

          <div>
            <label className="block mb-2">
              請輸入{' '}
              <code className="bg-gray-200 px-2 py-1 rounded">DELETE ALL</code>{' '}
              以確認：
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE ALL"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
