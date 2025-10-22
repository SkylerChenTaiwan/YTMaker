'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { FileUpload } from '@/components/ui/FileUpload'
import { useConfigStore } from '@/store/useConfigStore'
import * as batchApi from '@/services/batchApi'
import { toast } from 'sonner'

interface CreateBatchModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

interface FormData {
  task_name: string
  files: File[]
  configuration_id?: string
  prompt_template_id: string
  gemini_model: 'gemini-1.5-pro' | 'gemini-1.5-flash'
  youtube_privacy: 'public' | 'unlisted' | 'private'
  youtube_publish_type: 'immediate' | 'scheduled'
}

interface FormErrors {
  task_name?: string
  files?: string
  prompt_template_id?: string
  gemini_model?: string
}

export function CreateBatchModal({ open, onClose, onSuccess }: CreateBatchModalProps) {
  const router = useRouter()
  const { promptTemplates } = useConfigStore()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    task_name: '',
    files: [],
    prompt_template_id: '',
    gemini_model: 'gemini-1.5-flash',
    youtube_privacy: 'private',
    youtube_publish_type: 'immediate',
  })

  const [errors, setErrors] = useState<FormErrors>({})

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.task_name.trim()) {
      newErrors.task_name = '任務名稱為必填'
    }

    if (formData.files.length === 0) {
      newErrors.files = '至少需上傳一個文字檔案'
    }

    if (!formData.prompt_template_id) {
      newErrors.prompt_template_id = '請選擇 Prompt 範本'
    }

    if (!formData.gemini_model) {
      newErrors.gemini_model = '請選擇 Gemini 模型'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleFileSelect = (files: File[]) => {
    // 驗證檔案類型
    const invalidFiles = files.filter((file) => !file.name.endsWith('.txt'))

    if (invalidFiles.length > 0) {
      setErrors((prev) => ({
        ...prev,
        files: '只能上傳 .txt 文字檔案',
      }))
      return
    }

    // 驗證檔案大小 (最大 1MB)
    const largeFiles = files.filter((file) => file.size > 1024 * 1024)
    if (largeFiles.length > 0) {
      setErrors((prev) => ({
        ...prev,
        files: '檔案大小不能超過 1MB',
      }))
      return
    }

    setFormData((prev) => ({ ...prev, files }))
    setErrors((prev) => ({ ...prev, files: undefined }))
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await batchApi.createBatchTask({
        task_name: formData.task_name,
        files: formData.files,
        template_id: formData.configuration_id,
        prompt_template_id: formData.prompt_template_id,
        gemini_model: formData.gemini_model,
        youtube_config: {
          title: '', // 將由後端根據內容生成
          description: '',
          tags: [],
          privacy: formData.youtube_privacy,
          publish_type: formData.youtube_publish_type,
          ai_content_flag: true,
        },
      })

      toast.success('批次任務已建立')
      onSuccess()
      handleClose()

      // 跳轉到批次詳情頁
      router.push(`/batch/${response.batch_id}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '建立批次任務失敗'
      toast.error(`建立批次任務失敗：${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    // 重置表單
    setFormData({
      task_name: '',
      files: [],
      prompt_template_id: '',
      gemini_model: 'gemini-1.5-flash',
      youtube_privacy: 'private',
      youtube_publish_type: 'immediate',
    })
    setErrors({})
    onClose()
  }

  return (
    <Modal
      visible={open}
      title="新增批次任務"
      okText="開始批次處理"
      cancelText="取消"
      onOk={handleSubmit}
      onCancel={handleClose}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        {/* 任務名稱 */}
        <div>
          <label htmlFor="task_name" className="block text-sm font-medium text-gray-700 mb-1">
            任務名稱 <span className="text-red-500">*</span>
          </label>
          <input
            id="task_name"
            type="text"
            value={formData.task_name}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, task_name: e.target.value }))
              setErrors((prev) => ({ ...prev, task_name: undefined }))
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="例如：週一影片批次"
          />
          {errors.task_name && <p className="mt-1 text-sm text-red-600">{errors.task_name}</p>}
        </div>

        {/* 文字檔案上傳 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            文字內容檔案 <span className="text-red-500">*</span>
          </label>
          <FileUpload
            accept=".txt"
            multiple={true}
            onFileSelect={handleFileSelect}
            label="上傳檔案"
            helperText="支援多檔案上傳，僅接受 .txt 文字檔案 (最大 1MB)"
            errorMessage={errors.files}
          />
          {formData.files.length > 0 && !errors.files && (
            <p className="mt-1 text-sm text-green-600">
              已選擇 {formData.files.length} 個檔案
            </p>
          )}
        </div>

        {/* Prompt 範本選擇 */}
        <div>
          <label htmlFor="prompt_template_id" className="block text-sm font-medium text-gray-700 mb-1">
            Prompt 範本 <span className="text-red-500">*</span>
          </label>
          <select
            id="prompt_template_id"
            value={formData.prompt_template_id}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, prompt_template_id: e.target.value }))
              setErrors((prev) => ({ ...prev, prompt_template_id: undefined }))
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">請選擇範本</option>
            {promptTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          {errors.prompt_template_id && (
            <p className="mt-1 text-sm text-red-600">{errors.prompt_template_id}</p>
          )}
          {promptTemplates.length === 0 && (
            <p className="mt-1 text-sm text-amber-600">
              尚無可用的 Prompt 範本，請先建立範本
            </p>
          )}
        </div>

        {/* Gemini 模型選擇 */}
        <div>
          <label htmlFor="gemini_model" className="block text-sm font-medium text-gray-700 mb-1">
            Gemini 模型 <span className="text-red-500">*</span>
          </label>
          <select
            id="gemini_model"
            value={formData.gemini_model}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                gemini_model: e.target.value as 'gemini-1.5-pro' | 'gemini-1.5-flash',
              }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="gemini-1.5-flash">Gemini 1.5 Flash（快速，推薦批次使用）</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro（高品質，較慢）</option>
          </select>
        </div>

        {/* YouTube 設定 */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">YouTube 設定</h3>

          {/* 隱私設定 */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">隱私設定</label>
            <div className="flex gap-4">
              {[
                { value: 'private', label: '私人' },
                { value: 'unlisted', label: '不公開' },
                { value: 'public', label: '公開' },
              ].map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="radio"
                    name="youtube_privacy"
                    value={option.value}
                    checked={formData.youtube_privacy === option.value}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        youtube_privacy: e.target.value as 'public' | 'unlisted' | 'private',
                      }))
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 發布方式 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">發布方式</label>
            <div className="flex gap-4">
              {[
                { value: 'immediate', label: '立即發布' },
                { value: 'scheduled', label: '排程發布' },
              ].map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="radio"
                    name="youtube_publish_type"
                    value={option.value}
                    checked={formData.youtube_publish_type === option.value}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        youtube_publish_type: e.target.value as 'immediate' | 'scheduled',
                      }))
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
