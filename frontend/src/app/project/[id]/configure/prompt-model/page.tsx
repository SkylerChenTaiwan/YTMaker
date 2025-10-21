// src/app/project/[id]/configure/prompt-model/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { toast } from 'sonner'
import { validateProjectId } from '@/lib/validators'
import { AppLayout } from '@/components/layout/AppLayout'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { StepIndicator } from '@/components/setup/StepIndicator'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { PromptEditor } from '@/components/ui/PromptEditor'
import { ModelSelector } from '@/components/ui/ModelSelector'
import {
  getProject,
  getPromptTemplates,
  updatePromptSettings,
  type PromptSettings,
  type PromptTemplate,
} from '@/lib/api/projects'

// Validation schema
const promptFormSchema = z.object({
  prompt_template_id: z.string().min(1, '請選擇 Prompt 範本'),
  prompt_content: z
    .string()
    .min(200, 'Prompt 長度必須在 200-1000 字之間')
    .max(1000, 'Prompt 長度必須在 200-1000 字之間'),
  gemini_model: z.enum(['gemini-1.5-pro', 'gemini-1.5-flash']),
})

type PromptFormData = z.infer<typeof promptFormSchema>

export default function PromptModelPage({ params }: { params: { id: string } }) {
  // 驗證 UUID 格式
  if (!validateProjectId(params.id)) {
    notFound()
  }

  const router = useRouter()
  const [formData, setFormData] = useState<PromptFormData>({
    prompt_template_id: '',
    prompt_content: '',
    gemini_model: 'gemini-1.5-flash',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load project and templates data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [project, templatesData] = await Promise.all([
          getProject(params.id),
          getPromptTemplates(),
        ])

        setTemplates(templatesData)

        // Set form data from project
        setFormData({
          prompt_template_id: project.prompt_template_id || templatesData[0]?.id || '',
          prompt_content: project.prompt_content || templatesData[0]?.content || '',
          gemini_model: project.gemini_model || 'gemini-1.5-flash',
        })
      } catch (error) {
        console.error('Failed to load data:', error)
        toast.error('載入資料失敗')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params.id])

  // Handle template selection
  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    if (template) {
      setFormData({
        ...formData,
        prompt_template_id: templateId,
        prompt_content: template.content,
      })
      // Clear errors when template changes
      setErrors({})
    }
  }

  // Handle form submit
  const handleNext = async () => {
    try {
      // Validate
      const result = promptFormSchema.safeParse(formData)
      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors
        setErrors(
          Object.fromEntries(
            Object.entries(fieldErrors).map(([key, value]) => [
              key,
              value?.[0] || '',
            ])
          )
        )
        toast.error('請檢查表單內容')
        return
      }

      setErrors({})
      setSaving(true)

      // Save settings
      await updatePromptSettings(params.id, formData)

      toast.success('設定已儲存')
      router.push(`/project/${params.id}/configure/youtube`)
    } catch (error) {
      console.error('Failed to save:', error)
      toast.error('儲存失敗,請稍後再試')
    } finally {
      setSaving(false)
    }
  }

  const steps = [
    { title: '上傳文字內容' },
    { title: '視覺化配置' },
    { title: 'Prompt & Model' },
    { title: 'YouTube 設定' },
  ]

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">載入中...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6">
        <Breadcrumb
          items={[
            { label: '主控台', href: '/' },
            { label: '新增專案', href: '/project/new' },
            { label: 'Prompt 與模型' },
          ]}
        />

        <StepIndicator current={2} total={4} steps={steps} />

        <div className="max-w-4xl mx-auto mt-8">
          <h1 className="text-3xl font-bold mb-6">Prompt 與模型設定</h1>

          {/* Prompt Template Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Prompt 範本</h2>

            <div className="mb-4">
              <Select
                label="選擇範本"
                value={formData.prompt_template_id}
                onChange={handleTemplateChange}
                options={templates.map((t) => ({
                  label: t.name,
                  value: t.id,
                }))}
                className="w-full"
                data-testid="prompt-template-select"
              />
            </div>

            <div className="mb-4">
              <label className="block mb-2 font-medium text-gray-700">
                Prompt 內容
              </label>
              <PromptEditor
                value={formData.prompt_content}
                onChange={(value) =>
                  setFormData({ ...formData, prompt_content: value })
                }
                error={errors.prompt_content}
                data-testid="prompt-editor"
              />
              <p className="text-sm text-gray-500 mt-2">
                目前字數: {formData.prompt_content.length} / 1000
              </p>
              <p className="text-sm text-gray-500 mt-1">
                建議: 包含段落時長要求(5-20 秒)以獲得更好的效果
              </p>
            </div>
          </div>

          {/* Model Selection Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">選擇 Gemini 模型</h2>
            <ModelSelector
              selected={formData.gemini_model}
              onChange={(model) => setFormData({ ...formData, gemini_model: model })}
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="secondary"
              onClick={() => router.push(`/project/${params.id}/configure/visual`)}
            >
              上一步
            </Button>
            <Button
              variant="primary"
              onClick={handleNext}
              loading={saving}
              disabled={saving}
            >
              下一步
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
