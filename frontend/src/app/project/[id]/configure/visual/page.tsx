'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import { validateProjectId } from '@/lib/validators'
import { AppLayout } from '@/components/layout/AppLayout'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { toast } from '@/lib/toast'
import { useDebounce } from '@/lib/hooks/useDebounce'
import type { VisualConfig, SubtitleConfig, LogoConfig } from '@/types/configuration'

// 預設配置
const defaultConfig: VisualConfig = {
  subtitle: {
    font_family: 'Noto Sans TC',
    font_size: 48,
    font_color: '#FFFFFF',
    position: 'bottom-center',
    position_x: 480,
    position_y: 490,
    border_enabled: false,
    border_color: '#000000',
    border_width: 2,
    shadow_enabled: true,
    shadow_color: '#000000',
    shadow_offset_x: 2,
    shadow_offset_y: 2,
    background_enabled: false,
    background_color: '#000000',
    background_opacity: 70,
  },
  logo: {
    logo_file: null,
    logo_x: 50,
    logo_y: 50,
    logo_size: 100,
    logo_opacity: 100,
  },
  overlays: [],
}

export default function VisualConfigPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const projectId = params.id

  // 驗證 UUID 格式
  if (!validateProjectId(projectId)) {
    notFound()
  }

  const [config, setConfig] = useState<VisualConfig>(defaultConfig)
  const [isSaving, setIsSaving] = useState(false)

  // Debounced config (1 秒延遲)
  const debouncedConfig = useDebounce(config, 1000)

  // 自動儲存效果 (簡化版,實際應該呼叫 API)
  useEffect(() => {
    if (debouncedConfig !== defaultConfig && !isSaving) {
      setIsSaving(true)
      // 模擬 API 呼叫
      setTimeout(() => {
        toast.success('配置已自動儲存')
        setIsSaving(false)
      }, 500)
    }
  }, [debouncedConfig])

  const handleNext = () => {
    router.push(`/project/${projectId}/configure/prompt-model`)
  }

  const updateSubtitle = (updates: Partial<SubtitleConfig>) => {
    setConfig({
      ...config,
      subtitle: { ...config.subtitle, ...updates },
    })
  }

  const updateLogo = (updates: Partial<LogoConfig>) => {
    setConfig({
      ...config,
      logo: { ...config.logo, ...updates },
    })
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 驗證檔案格式
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      toast.error('檔案必須為 PNG, JPG 或 SVG 格式')
      return
    }

    // 讀取檔案為 Data URL
    const reader = new FileReader()
    reader.onload = (e) => {
      updateLogo({ logo_file: e.target?.result as string })
      toast.success('Logo 已上傳')
    }
    reader.readAsDataURL(file)
  }

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: '主控台', href: '/' },
          { label: '新增專案', href: '/project/new' },
          { label: '視覺化配置' },
        ]}
      />

      <div className="flex flex-col lg:flex-row gap-6 p-6 h-[calc(100vh-200px)]">
        {/* 左側：預覽區 (60%) */}
        <div className="w-full lg:w-3/5">
          <div className="border rounded-lg overflow-hidden bg-gray-900 aspect-video relative">
            {/* 模擬影片畫面 */}
            <div className="w-full h-full flex items-center justify-center">
              {/* 字幕預覽 */}
              <div
                className="absolute transition-all"
                style={{
                  left: `${config.subtitle.position_x}px`,
                  top: `${config.subtitle.position_y}px`,
                  fontFamily: config.subtitle.font_family,
                  fontSize: `${config.subtitle.font_size}px`,
                  color: config.subtitle.font_color,
                  textShadow: config.subtitle.shadow_enabled
                    ? `${config.subtitle.shadow_offset_x}px ${config.subtitle.shadow_offset_y}px 4px ${config.subtitle.shadow_color}`
                    : 'none',
                  border: config.subtitle.border_enabled
                    ? `${config.subtitle.border_width}px solid ${config.subtitle.border_color}`
                    : 'none',
                  backgroundColor: config.subtitle.background_enabled
                    ? config.subtitle.background_color
                    : 'transparent',
                  opacity: config.subtitle.background_enabled
                    ? config.subtitle.background_opacity / 100
                    : 1,
                  padding: config.subtitle.background_enabled ? '8px 16px' : 0,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                範例字幕
              </div>

              {/* Logo 預覽 */}
              {config.logo.logo_file && (
                <img
                  src={config.logo.logo_file}
                  alt="Logo"
                  className="absolute"
                  style={{
                    left: `${config.logo.logo_x}px`,
                    top: `${config.logo.logo_y}px`,
                    width: `${config.logo.logo_size}px`,
                    height: `${config.logo.logo_size}px`,
                    opacity: config.logo.logo_opacity / 100,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* 右側：配置面板 (40%) */}
        <div className="w-full lg:w-2/5 overflow-y-auto space-y-4">
          {/* 字幕設定 */}
          <div className="border rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4">字幕設定</h2>

            <div className="space-y-4">
              <Select
                label="字型"
                value={config.subtitle.font_family}
                onChange={(value) => updateSubtitle({ font_family: value })}
                options={[
                  { label: 'Noto Sans TC', value: 'Noto Sans TC' },
                  { label: 'Microsoft JhengHei', value: 'Microsoft JhengHei' },
                  { label: 'Arial', value: 'Arial' },
                ]}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  字體大小: {config.subtitle.font_size}px
                </label>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={config.subtitle.font_size}
                  onChange={(e) =>
                    updateSubtitle({ font_size: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  顏色
                </label>
                <input
                  type="color"
                  value={config.subtitle.font_color}
                  onChange={(e) => updateSubtitle({ font_color: e.target.value })}
                  className="w-full h-10 rounded border"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.subtitle.shadow_enabled}
                    onChange={(e) =>
                      updateSubtitle({ shadow_enabled: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    啟用陰影
                  </span>
                </label>
              </div>

              {config.subtitle.shadow_enabled && (
                <div className="ml-6 space-y-2">
                  <div>
                    <label className="block text-sm text-gray-600">陰影顏色</label>
                    <input
                      type="color"
                      value={config.subtitle.shadow_color}
                      onChange={(e) =>
                        updateSubtitle({ shadow_color: e.target.value })
                      }
                      className="w-full h-8 rounded border"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Logo 設定 */}
          <div className="border rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4">Logo 設定</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  上傳 Logo
                </label>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg"
                  onChange={handleLogoUpload}
                  className="w-full text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  支援 PNG, JPG, SVG 格式
                </p>
              </div>

              {config.logo.logo_file && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      大小: {config.logo.logo_size}px
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="200"
                      value={config.logo.logo_size}
                      onChange={(e) =>
                        updateLogo({ logo_size: parseInt(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      透明度: {config.logo.logo_opacity}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={config.logo.logo_opacity}
                      onChange={(e) =>
                        updateLogo({ logo_opacity: parseInt(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 底部操作按鈕 */}
      <div className="flex justify-between px-6 pb-6 border-t pt-4">
        <Button variant="secondary" onClick={() => router.back()}>
          上一步
        </Button>

        <div className="flex gap-3">
          {isSaving && (
            <span className="text-sm text-gray-500 self-center">儲存中...</span>
          )}
          <Button variant="primary" onClick={handleNext}>
            下一步
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
