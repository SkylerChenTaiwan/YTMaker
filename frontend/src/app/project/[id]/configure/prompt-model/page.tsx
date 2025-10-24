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
import { ModelSelector } from '@/components/ui/ModelSelector'
import {
  getProject,
  getPromptTemplates,
  updatePromptModel,
  type PromptModelSettings,
  type PromptTemplate,
} from '@/lib/api/projects'
import { getGeminiModels, type GeminiModel } from '@/lib/api/gemini'

// Validation schema - 動態驗證模型
const createPromptFormSchema = (availableModels: string[]) =>
  z.object({
    prompt_template_id: z.string().min(1, '請選擇 Prompt 範本'),
    gemini_model: z.string().refine(
      (model) => availableModels.length === 0 || availableModels.includes(model),
      {
        message: '請選擇有效的 Gemini 模型',
      }
    ),
  })

interface PromptFormData {
  prompt_template_id: string
  gemini_model: string
}

export default function PromptModelPage({ params }: { params: { id: string } }) {
  // 驗證 UUID 格式
  if (!validateProjectId(params.id)) {
    notFound()
  }

  const router = useRouter()
  const [formData, setFormData] = useState<PromptFormData>({
    prompt_template_id: '',
    gemini_model: '', // 等待從 API 載入
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [models, setModels] = useState<GeminiModel[]>([])
  const [modelsLoading, setModelsLoading] = useState(true)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load project, templates, and models data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setModelsLoading(true)

        // 並行載入 project, templates, 和 models
        const [project, templatesData, modelsData] = await Promise.allSettled([
          getProject(params.id),
          getPromptTemplates(),
          getGeminiModels(),
        ])

        // 處理 templates
        const templates = templatesData.status === 'fulfilled' ? templatesData.value : []
        setTemplates(templates)

        // 處理 models
        if (modelsData.status === 'fulfilled') {
          setModels(modelsData.value)
          setModelsError(null)
        } else {
          console.error('Failed to load models:', modelsData.reason)
          setModelsError(
            modelsData.reason?.message || '無法載入模型列表，請稍後再試'
          )
          setModels([])
        }

        // 處理 project data
        if (project.status === 'fulfilled') {
          const projectData = project.value
          const defaultModel =
            modelsData.status === 'fulfilled' && modelsData.value.length > 0
              ? modelsData.value[0].name.split('/').pop() || ''
              : ''

          setFormData({
            prompt_template_id:
              projectData.prompt_template_id || templates[0]?.id || '',
            gemini_model: projectData.gemini_model || defaultModel,
          })
        } else {
          console.error('Failed to load project:', project.reason)
          toast.error('載入專案資料失敗')
        }
      } catch (error) {
        console.error('Failed to load data:', error)
        toast.error('載入資料失敗')
      } finally {
        setLoading(false)
        setModelsLoading(false)
      }
    }

    loadData()
  }, [params.id])

  // Handle template selection
  const handleTemplateChange = (templateId: string) => {
    setFormData({
      ...formData,
      prompt_template_id: templateId,
    })
    // Clear errors when template changes
    setErrors({})
  }

  // Handle form submit
  const handleNext = async () => {
    try {
      // 動態創建驗證 schema
      const availableModelIds = models.map((m) => m.name.split('/').pop() || m.name)
      const promptFormSchema = createPromptFormSchema(availableModelIds)

      // Validate
      const result = promptFormSchema.safeParse(formData)
      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors
        setErrors(
          Object.fromEntries(
            Object.entries(fieldErrors).map(([key, value]) => [key, value?.[0] || ''])
          )
        )
        toast.error('請檢查表單內容')
        return
      }

      setErrors({})
      setSaving(true)

      // Save settings - only send template_id and model, not content
      await updatePromptModel(params.id, {
        prompt_template_id: formData.prompt_template_id,
        gemini_model: formData.gemini_model,
      })

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

        <div className="max-w-6xl mx-auto mt-8">
          <h1 className="text-3xl font-bold mb-6">Prompt 與模型設定</h1>

          {/* Prompt Template Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Prompt 範本</h2>

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
            {errors.prompt_template_id && (
              <p className="mt-2 text-sm text-red-600">{errors.prompt_template_id}</p>
            )}
          </div>

          {/* Model Selection Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">選擇 Gemini 模型</h2>
            <ModelSelector
              models={models}
              selected={formData.gemini_model}
              onChange={(model) => setFormData({ ...formData, gemini_model: model })}
              loading={modelsLoading}
              error={modelsError}
            />
            {errors.gemini_model && (
              <p className="mt-2 text-sm text-red-600">{errors.gemini_model}</p>
            )}
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
              disabled={saving || modelsLoading || (models.length === 0 && !modelsError)}
            >
              下一步
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
