// src/app/project/[id]/configure/youtube/page.tsx
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
import { Input } from '@/components/ui/Input'
import { TagsInput } from '@/components/ui/TagsInput'
import { DateTimePicker } from '@/components/ui/DateTimePicker'
import {
  getProject,
  updateYouTubeSettings,
  startGeneration,
  type YouTubeSettings,
} from '@/lib/api/projects'
import { cn } from '@/lib/cn'

// Validation schema
const youtubeFormSchema = z.object({
  youtube_title: z
    .string()
    .min(1, '標題不能為空')
    .max(100, '標題不能超過 100 字元'),
  youtube_description: z
    .string()
    .max(5000, '描述不能超過 5000 字元')
    .optional(),
  youtube_tags: z.array(z.string()).max(30, '標籤數量不能超過 30 個'),
  privacy: z.enum(['public', 'unlisted', 'private']),
  publish_type: z.enum(['immediate', 'scheduled']),
  scheduled_date: z.string().optional(),
  scheduled_time: z.string().optional(),
  ai_content_flag: z.boolean(),
})

type YouTubeFormData = z.infer<typeof youtubeFormSchema>

export default function YouTubeConfigPage({
  params,
}: {
  params: { id: string }
}) {
  // 驗證 UUID 格式
  if (!validateProjectId(params.id)) {
    notFound()
  }

  const router = useRouter()
  const [formData, setFormData] = useState<YouTubeFormData>({
    youtube_title: '',
    youtube_description: '',
    youtube_tags: [],
    privacy: 'public',
    publish_type: 'immediate',
    ai_content_flag: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Mock YouTube account status (應從 store 或 API 獲取)
  const [hasYouTubeAccount] = useState(true) // TODO: 從實際狀態獲取

  // Load project data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const project = await getProject(params.id)

        // Set form data from project
        setFormData({
          youtube_title: project.youtube_title || '',
          youtube_description: project.youtube_description || '',
          youtube_tags: project.youtube_tags || [],
          privacy: project.privacy || 'public',
          publish_type: project.publish_type || 'immediate',
          scheduled_date: project.scheduled_datetime?.split('T')[0],
          scheduled_time: project.scheduled_datetime?.split('T')[1]?.substring(0, 5),
          ai_content_flag: project.ai_content_flag ?? true,
        })
      } catch (error) {
        console.error('Failed to load project:', error)
        toast.error('載入專案資料失敗')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params.id])

  // Validate scheduled datetime
  const validateScheduledTime = () => {
    if (formData.publish_type === 'scheduled') {
      if (!formData.scheduled_date || !formData.scheduled_time) {
        setErrors({
          ...errors,
          scheduled_date: '排程日期和時間為必填',
        })
        return false
      }

      const scheduledDatetime = new Date(
        `${formData.scheduled_date}T${formData.scheduled_time}`
      )
      const now = new Date()

      if (scheduledDatetime <= now) {
        setErrors({
          ...errors,
          scheduled_date: '排程日期必須為未來時間',
        })
        return false
      }
    }

    return true
  }

  // Handle form submit
  const handleSubmit = async () => {
    try {
      // Validate
      const result = youtubeFormSchema.safeParse(formData)
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

      if (!validateScheduledTime()) {
        return
      }

      setErrors({})
      setSaving(true)

      // Save YouTube settings
      await updateYouTubeSettings(params.id, formData)

      toast.success('設定已儲存')

      // Start generation
      await startGeneration(params.id)

      toast.success('開始生成影片')
      router.push(`/project/${params.id}/progress`)
    } catch (error) {
      console.error('Failed to submit:', error)
      toast.error('提交失敗,請稍後再試')
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
            { label: 'YouTube 設定' },
          ]}
        />

        <StepIndicator current={3} total={4} steps={steps} />

        <div className="max-w-4xl mx-auto mt-8">
          <h1 className="text-3xl font-bold mb-6">YouTube 設定</h1>

          {/* YouTube Account Section */}
          {!hasYouTubeAccount && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-yellow-700">
                    請先連結 YouTube 帳號
                  </p>
                  <p className="text-sm text-yellow-600 mt-1">
                    您需要連結 YouTube 帳號才能上傳影片
                  </p>
                </div>
                <Button variant="primary">連結帳號</Button>
              </div>
            </div>
          )}

          {/* Video Info Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">影片資訊</h2>
            <p className="text-sm text-gray-500 mb-4">
              影片標題、描述、標籤將由 AI 自動生成,您也可以在此手動調整
            </p>

            <div className="mb-4">
              <label className="block mb-2 font-medium text-gray-700">
                影片標題 *
              </label>
              <Input
                value={formData.youtube_title}
                onChange={(e) =>
                  setFormData({ ...formData, youtube_title: e.target.value })
                }
                placeholder="輸入影片標題"
                error={errors.youtube_title}
                data-testid="youtube-title"
              />
              {errors.youtube_title && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.youtube_title}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="block mb-2 font-medium text-gray-700">
                影片描述
              </label>
              <textarea
                className={cn(
                  'w-full h-32 border rounded-lg p-3',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500',
                  errors.youtube_description
                    ? 'border-red-500'
                    : 'border-gray-300'
                )}
                value={formData.youtube_description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    youtube_description: e.target.value,
                  })
                }
                placeholder="輸入影片描述"
                data-testid="youtube-description"
              />
              {errors.youtube_description && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.youtube_description}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="block mb-2 font-medium text-gray-700">
                標籤
              </label>
              <TagsInput
                tags={formData.youtube_tags}
                onChange={(tags) =>
                  setFormData({ ...formData, youtube_tags: tags })
                }
                maxTags={30}
                data-testid="youtube-tags-input"
              />
            </div>
          </div>

          {/* Publish Settings Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">發布設定</h2>

            <div className="mb-4">
              <label className="block mb-2 font-medium text-gray-700">
                隱私設定
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="privacy"
                    value="public"
                    checked={formData.privacy === 'public'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        privacy: e.target.value as typeof formData.privacy,
                      })
                    }
                    className="mr-2"
                    data-testid="privacy-public"
                  />
                  <span>公開</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="privacy"
                    value="unlisted"
                    checked={formData.privacy === 'unlisted'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        privacy: e.target.value as typeof formData.privacy,
                      })
                    }
                    className="mr-2"
                  />
                  <span>不公開(僅限連結)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="privacy"
                    value="private"
                    checked={formData.privacy === 'private'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        privacy: e.target.value as typeof formData.privacy,
                      })
                    }
                    className="mr-2"
                  />
                  <span>私人</span>
                </label>
              </div>
            </div>

            <div className="mb-4">
              <label className="block mb-2 font-medium text-gray-700">
                發布方式
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="publish_type"
                    value="immediate"
                    checked={formData.publish_type === 'immediate'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        publish_type: e.target
                          .value as typeof formData.publish_type,
                      })
                    }
                    className="mr-2"
                  />
                  <span>立即發布</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="publish_type"
                    value="scheduled"
                    checked={formData.publish_type === 'scheduled'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        publish_type: e.target
                          .value as typeof formData.publish_type,
                      })
                    }
                    className="mr-2"
                  />
                  <span>排程發布</span>
                </label>
              </div>
            </div>

            {formData.publish_type === 'scheduled' && (
              <div className="pl-6 mb-4">
                <DateTimePicker
                  date={formData.scheduled_date}
                  time={formData.scheduled_time}
                  onDateChange={(date) =>
                    setFormData({ ...formData, scheduled_date: date })
                  }
                  onTimeChange={(time) =>
                    setFormData({ ...formData, scheduled_time: time })
                  }
                  error={errors.scheduled_date}
                />
              </div>
            )}

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.ai_content_flag}
                  disabled
                  className="mr-2"
                />
                <span>此影片包含 AI 生成的內容</span>
              </label>
              <p className="text-sm text-gray-500 mt-1 ml-6">
                根據 YouTube 政策,AI 生成的影片必須標註
              </p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              variant="secondary"
              onClick={() =>
                router.push(`/project/${params.id}/configure/prompt-model`)
              }
            >
              上一步
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={saving}
              disabled={!hasYouTubeAccount || saving}
            >
              開始生成
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
