'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { AppLayout } from '@/components/layout/AppLayout'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { FileUpload } from '@/components/ui/FileUpload'
import { projectsApi } from '@/services/api/projects'
import { toast } from '@/lib/toast'

// Form Schema
const projectFormSchema = z.object({
  project_name: z
    .string()
    .min(1, '專案名稱不能為空')
    .max(100, '專案名稱不能超過 100 字元'),

  content_source: z.enum(['upload', 'paste']).default('paste'),

  content_text: z
    .string()
    .min(500, '文字長度必須在 500-10000 字之間')
    .max(10000, '文字長度必須在 500-10000 字之間'),
})

type ProjectFormData = z.infer<typeof projectFormSchema>

export default function NewProjectPage() {
  const router = useRouter()

  const [formData, setFormData] = useState<ProjectFormData>({
    project_name: '',
    content_source: 'paste',
    content_text: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // 字數統計
  const charCount = formData.content_text.length

  // Create Project Mutation
  const createMutation = useMutation({
    mutationFn: projectsApi.createProject,
    onSuccess: (project) => {
      toast.success('專案創建成功！')
      router.push(`/project/${project.id}/configure/visual`)
    },
    onError: (error: any) => {
      toast.error(error.message || '專案創建失敗')
    },
  })

  // 處理檔案上傳
  const handleFileUpload = async (files: File[]) => {
    const file = files[0]

    // 驗證檔案大小
    if (file.size > 10 * 1024 * 1024) {
      toast.error('檔案大小不能超過 10MB')
      return
    }

    // 驗證檔案格式
    const allowedTypes = ['text/plain', 'text/markdown']
    const extension = file.name.split('.').pop()?.toLowerCase()

    if (
      !allowedTypes.includes(file.type) &&
      extension !== 'txt' &&
      extension !== 'md'
    ) {
      toast.error('檔案必須為 TXT 或 MD 格式')
      return
    }

    // 讀取文字
    try {
      const text = await file.text()
      const charCount = text.length

      if (charCount < 500 || charCount > 10000) {
        toast.error('文字長度必須在 500-10000 字之間')
        return
      }

      setFormData({ ...formData, content_text: text })
      toast.success('檔案載入成功')
    } catch (error) {
      toast.error('檔案讀取失敗')
    }
  }

  // 表單提交
  const handleSubmit = () => {
    // 驗證表單
    const result = projectFormSchema.safeParse(formData)

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string
        fieldErrors[field] = issue.message
      })
      setErrors(fieldErrors)
      return
    }

    // 清除錯誤
    setErrors({})

    // 提交
    createMutation.mutate({
      project_name: formData.project_name,
      content_text: formData.content_text,
      content_source: formData.content_source,
    })
  }

  return (
    <AppLayout>
      <Breadcrumb
        items={[{ label: '主控台', href: '/' }, { label: '新增專案' }]}
      />

      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">新增專案</h1>

        {/* 專案名稱 */}
        <div className="mb-6">
          <Input
            label="專案名稱"
            value={formData.project_name}
            onChange={(e) =>
              setFormData({ ...formData, project_name: e.target.value })
            }
            placeholder="輸入專案名稱"
            error={!!errors.project_name}
            errorMessage={errors.project_name}
          />
        </div>

        {/* 文字來源 */}
        <div className="mb-6">
          <Select
            label="文字來源"
            value={formData.content_source}
            onChange={(value) =>
              setFormData({
                ...formData,
                content_source: value as 'upload' | 'paste',
              })
            }
            options={[
              { label: '貼上文字', value: 'paste' },
              { label: '上傳檔案', value: 'upload' },
            ]}
          />
        </div>

        {/* 文字內容 */}
        {formData.content_source === 'paste' ? (
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              文字內容
            </label>
            <textarea
              className={`w-full h-64 border rounded p-3 font-mono text-sm ${
                errors.content_text ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                errors.content_text
                  ? 'focus:ring-red-500'
                  : 'focus:ring-blue-500'
              }`}
              value={formData.content_text}
              onChange={(e) =>
                setFormData({ ...formData, content_text: e.target.value })
              }
              placeholder="貼上文字內容 (500-10000 字)"
            />
            <div className="flex justify-between items-center mt-2">
              <p
                className={`text-sm ${
                  charCount < 500 || charCount > 10000
                    ? 'text-yellow-600'
                    : 'text-gray-500'
                }`}
              >
                目前字數: {charCount}
              </p>
              {charCount > 0 && (charCount < 500 || charCount > 10000) && (
                <p className="text-sm text-yellow-600">
                  {charCount < 500
                    ? `還需要 ${500 - charCount} 字`
                    : `超過 ${charCount - 10000} 字`}
                </p>
              )}
            </div>
            {errors.content_text && (
              <p className="text-red-500 text-sm mt-1">
                {errors.content_text}
              </p>
            )}
          </div>
        ) : (
          <div className="mb-6">
            <FileUpload
              accept=".txt,.md"
              label="上傳檔案"
              onFileSelect={handleFileUpload}
              helperText="支援 .txt 和 .md 格式，最大 10MB"
            />
            {formData.content_text && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">
                  已載入內容 ({formData.content_text.length} 字):
                </p>
                <div className="border rounded p-3 bg-gray-50 max-h-48 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono">
                    {formData.content_text.slice(0, 500)}
                    {formData.content_text.length > 500 && '...'}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="flex justify-end gap-4 mt-8">
          <Button
            variant="secondary"
            onClick={() => router.push('/')}
            disabled={createMutation.isPending}
          >
            取消
          </Button>
          <Button
            variant="primary"
            loading={createMutation.isPending}
            onClick={handleSubmit}
            disabled={charCount < 500 || charCount > 10000}
          >
            下一步
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
