'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { toast } from '@/lib/toast'
import {
  getProjectResult,
  downloadVideo,
  downloadThumbnail,
  downloadAssets,
  ProjectResult,
} from '@/lib/api/projects'
import YouTubePlayer from '@/components/feature/result/YouTubePlayer'
import LocalVideoPlayer from '@/components/feature/result/LocalVideoPlayer'
import { DownloadButton } from '@/components/feature/result/DownloadButton'

export default function ResultPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [result, setResult] = useState<ProjectResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<{
    video?: number
    thumbnail?: number
    assets?: number
  }>({})

  // Fetch project result
  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true)
        const data = await getProjectResult(params.id)
        setResult(data)
      } catch (err) {
        const error = err as { response?: { status: number } }
        if (error?.response?.status === 404) {
          setError('not_found')
        } else if (error?.response?.status === 409) {
          setError('not_completed')
        } else {
          setError('load_failed')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchResult()
  }, [params.id])

  // Handle download
  const handleDownload = async (
    type: 'video' | 'thumbnail' | 'assets',
    filename: string,
    downloadFn: (
      id: string,
      onProgress: (progressEvent: { loaded: number; total?: number }) => void
    ) => Promise<{ data: Blob }>
  ) => {
    try {
      const response = await downloadFn(
        params.id,
        (progressEvent: { loaded: number; total?: number }) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          )
          setDownloadProgress((prev) => ({ ...prev, [type]: progress }))
        }
      )

      // Trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success('下載完成')
      setDownloadProgress((prev) => ({ ...prev, [type]: 0 }))
    } catch (error) {
      toast.error('下載失敗')
      setDownloadProgress((prev) => ({ ...prev, [type]: 0 }))
    }
  }

  // Loading state
  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          <p className="ml-4 text-gray-600">載入結果中...</p>
        </div>
      </AppLayout>
    )
  }

  // Error state - Project not completed
  if (error === 'not_completed') {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            專案尚未完成
          </h1>
          <p className="text-gray-600 mb-6">
            專案尚未完成，無法查看結果
          </p>
          <Button onClick={() => router.push('/')}>返回主控台</Button>
        </div>
      </AppLayout>
    )
  }

  // Error state - Project not found
  if (error === 'not_found' || !result) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">找不到專案</h1>
          <p className="text-gray-600 mb-6">您訪問的專案不存在或已被刪除</p>
          <Button onClick={() => router.push('/')}>返回主控台</Button>
        </div>
      </AppLayout>
    )
  }

  // Legacy check (should not happen with proper error handling above)
  if (result.status !== 'completed') {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            專案尚未完成
          </h1>
          <p className="text-gray-600 mb-6">
            專案尚未完成，無法查看結果
          </p>
          <Button onClick={() => router.push('/')}>返回主控台</Button>
        </div>
      </AppLayout>
    )
  }

  const privacyLabels: Record<string, string> = {
    public: '公開',
    unlisted: '不公開',
    private: '私人',
  }

  return (
    <AppLayout>
      <div className="p-6">
        <Breadcrumb
          items={[
            { label: '主控台', href: '/' },
            { label: result.project_name, href: `/project/${params.id}` },
            { label: '結果' },
          ]}
        />

        <div className="max-w-5xl mx-auto mt-6">
          {/* Success Message */}
          <div className="mb-6 p-6 bg-white rounded-lg shadow border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mr-4">
                <svg
                  className="w-10 h-10 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-green-700 mb-2">
                  影片已成功生成並上傳到 YouTube！
                </h1>
                {result.youtube_url && (
                  <a
                    href={result.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    在 YouTube 上觀看
                  </a>
                )}
              </div>
              <div className="px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                {result.publish_type === 'scheduled'
                  ? '已排程'
                  : privacyLabels[result.privacy || 'private']}
              </div>
            </div>
          </div>

          {/* Video Preview */}
          <div className="mb-6 p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">影片預覽</h2>
            <div data-testid="video-container" className="aspect-video bg-black rounded">
              {result.privacy === 'private' ? (
                <LocalVideoPlayer src={result.local_video_url || ''} />
              ) : (
                <YouTubePlayer videoId={result.youtube_video_id || ''} />
              )}
            </div>
          </div>

          {/* Video Info */}
          <div className="mb-6 p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">影片資訊</h2>
            <div className="space-y-4">
              <div>
                <label className="block font-medium mb-1 text-gray-700">標題</label>
                <p className="text-gray-900">{result.youtube_title}</p>
              </div>

              <div>
                <label className="block font-medium mb-1 text-gray-700">描述</label>
                <p className="text-gray-900 whitespace-pre-wrap">
                  {result.youtube_description}
                </p>
              </div>

              {result.youtube_tags && result.youtube_tags.length > 0 && (
                <div>
                  <label className="block font-medium mb-1 text-gray-700">標籤</label>
                  <div className="flex flex-wrap gap-2">
                    {result.youtube_tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.published_at && (
                <div>
                  <label className="block font-medium mb-1 text-gray-700">發布時間</label>
                  <p className="text-gray-900">
                    {new Date(result.published_at).toLocaleString('zh-TW')}
                  </p>
                </div>
              )}

              {result.publish_type === 'scheduled' && result.scheduled_date && (
                <div>
                  <label className="block font-medium mb-1 text-gray-700">排程時間</label>
                  <p className="text-gray-900">
                    {new Date(result.scheduled_date).toLocaleString('zh-TW')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Download Section */}
          <div className="mb-6 p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">下載</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DownloadButton
                label="下載影片"
                onClick={() =>
                  handleDownload(
                    'video',
                    `${result.project_name}.mp4`,
                    downloadVideo
                  )
                }
                progress={downloadProgress.video}
              />

              <DownloadButton
                label="下載封面"
                onClick={() =>
                  handleDownload(
                    'thumbnail',
                    `${result.project_name}_thumbnail.jpg`,
                    downloadThumbnail
                  )
                }
                progress={downloadProgress.thumbnail}
              />

              <DownloadButton
                label="下載所有素材"
                onClick={() =>
                  handleDownload(
                    'assets',
                    `${result.project_name}_assets.zip`,
                    downloadAssets
                  )
                }
                progress={downloadProgress.assets}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-4 justify-center">
            {result.youtube_video_id && (
              <Button
                variant="secondary"
                onClick={() =>
                  window.open(
                    `https://studio.youtube.com/video/${result.youtube_video_id}/edit`,
                    '_blank'
                  )
                }
              >
                編輯 YouTube 資訊
              </Button>
            )}

            <Button variant="secondary" onClick={() => router.push('/project/new')}>
              生成新影片
            </Button>

            <Button variant="primary" onClick={() => router.push('/')}>
              返回主控台
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
