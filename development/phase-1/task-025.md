# Task-025: 結果頁面實作 (Page-8)

> **建立日期:** 2025-10-19
> **狀態:** ⏳ 未開始
> **預計時間:** 6 小時
> **優先級:** P0 (必須)

---

## 關聯文件

### 產品設計
- **頁面設計:** `product-design/pages.md#Page-8-結果頁`
- **使用者流程:** `product-design/flows.md#Flow-1` (步驟 11-12: 查看生成結果)

### 技術規格
- **頁面規格:** `tech-specs/frontend/pages.md#8-結果頁`
- **元件架構:** `tech-specs/frontend/component-architecture.md`
- **狀態管理:** `tech-specs/frontend/state-management.md`
- **API 整合:** `tech-specs/frontend/api-integration.md`

### 後端 API
- **Projects API:** `tech-specs/backend/api-projects.md`
  - `GET /api/v1/projects/:id/result` - 取得專案結果資訊
  - `GET /api/v1/projects/:id/download/video` - 下載影片檔案
  - `GET /api/v1/projects/:id/download/thumbnail` - 下載封面圖片
  - `GET /api/v1/projects/:id/download/assets` - 下載所有素材 (ZIP)

### 相關任務
- **前置任務:** Task-017 ✅ (路由系統), Task-018 ✅ (Zustand Stores), Task-019 ✅ (API 整合), Task-024 ✅ (進度監控頁)
- **後續任務:** Task-029 (整合測試)

---

## 任務目標

### 簡述
實作專案完成後的結果展示頁面，包含影片預覽、YouTube 連結、影片資訊顯示、下載功能，以及後續操作按鈕。

### 詳細目標
1. **成功訊息區**
   - 顯示大型綠色勾選圖示和成功訊息
   - 顯示 YouTube 影片連結 (可點擊開啟新視窗)
   - 顯示影片狀態標籤 (公開/不公開/私人/已排程)

2. **影片預覽區**
   - 公開影片: 內嵌 YouTube 播放器 (16:9)
   - 私人影片: 使用本地影片播放器播放 final_video.mp4
   - 支援全螢幕播放

3. **影片資訊顯示**
   - 標題
   - 描述
   - 標籤列表
   - 發布時間 (若已發布)
   - 排程時間 (若為排程發布)

4. **下載功能**
   - 下載影片 (final_video.mp4)
   - 下載封面 (thumbnail.jpg)
   - 下載所有素材 (ZIP 檔案)
   - 顯示下載進度 (若檔案較大)

5. **操作按鈕**
   - 編輯 YouTube 資訊 (開啟 YouTube Studio)
   - 生成新影片 (跳轉到新增專案頁)
   - 返回主控台

6. **錯誤處理**
   - 專案未完成時顯示錯誤訊息
   - 找不到專案時顯示 404
   - 載入失敗時提供重試選項

### 成功標準
- [ ] 結果頁面完整實作
- [ ] YouTube 播放器正確嵌入
- [ ] 本地影片播放器正常運作
- [ ] 所有下載功能正常
- [ ] 下載進度顯示正確
- [ ] 響應式設計在各裝置正常顯示
- [ ] 錯誤狀態處理完整
- [ ] 單元測試通過
- [ ] E2E 測試通過

---

## 測試要求

### 單元測試

#### 測試 1: 結果頁面基本渲染

**目的:** 驗證結果頁面能正確顯示所有資訊

**測試步驟:**
```typescript
// __tests__/pages/ResultPage.test.tsx
describe('ResultPage', () => {
  it('應該正確渲染所有結果資訊', async () => {
    // 1. Mock project result data
    const mockResult = {
      id: 'project-123',
      project_name: '測試專案',
      youtube_video_id: 'dQw4w9WgXcQ',
      youtube_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      youtube_title: '我的測試影片',
      youtube_description: '這是測試描述',
      youtube_tags: ['AI', '測試', '自動化'],
      privacy: 'public',
      publish_type: 'immediate',
      published_at: '2025-10-19T10:00:00Z',
      status: 'completed'
    }

    // 2. Mock API
    mockUseQuery.mockReturnValue({
      data: mockResult,
      isLoading: false
    })

    // 3. Render page
    render(<ResultPage params={{ id: 'project-123' }} />)

    // 4. Verify success message
    expect(screen.getByText('影片已成功生成並上傳到 YouTube！')).toBeInTheDocument()

    // 5. Verify YouTube link
    const youtubeLink = screen.getByText('在 YouTube 上觀看')
    expect(youtubeLink).toHaveAttribute('href', 'https://youtube.com/watch?v=dQw4w9WgXcQ')
    expect(youtubeLink).toHaveAttribute('target', '_blank')

    // 6. Verify video info
    expect(screen.getByText('我的測試影片')).toBeInTheDocument()
    expect(screen.getByText('這是測試描述')).toBeInTheDocument()
    expect(screen.getByText('AI')).toBeInTheDocument()
    expect(screen.getByText('測試')).toBeInTheDocument()

    // 7. Verify status badge
    expect(screen.getByText('公開')).toBeInTheDocument()
  })
})
```

**驗證點:**
- [ ] 成功訊息顯示
- [ ] 綠色勾選圖示顯示
- [ ] YouTube 連結正確且開啟新視窗
- [ ] 影片標題、描述、標籤正確顯示
- [ ] 影片狀態標籤正確顯示

---

#### 測試 2: YouTube 播放器嵌入 (公開影片)

**目的:** 驗證公開影片正確嵌入 YouTube 播放器

**測試步驟:**
```typescript
it('公開影片應該顯示 YouTube 播放器', () => {
  const mockResult = {
    id: 'project-123',
    youtube_video_id: 'dQw4w9WgXcQ',
    privacy: 'public',
    status: 'completed'
  }

  mockUseQuery.mockReturnValue({ data: mockResult, isLoading: false })

  render(<ResultPage params={{ id: 'project-123' }} />)

  // Verify YouTube iframe
  const iframe = screen.getByTestId('youtube-player')
  expect(iframe).toHaveAttribute(
    'src',
    'https://www.youtube.com/embed/dQw4w9WgXcQ'
  )
  expect(iframe).toHaveAttribute('allowFullScreen')

  // Verify aspect ratio
  expect(iframe.closest('[data-testid="video-container"]')).toHaveClass('aspect-video')
})
```

**驗證點:**
- [ ] YouTube iframe 正確嵌入
- [ ] iframe src 包含正確的 video ID
- [ ] 支援全螢幕 (allowFullScreen)
- [ ] 16:9 比例正確

---

#### 測試 3: 本地影片播放器 (私人影片)

**目的:** 驗證私人影片使用本地播放器

**測試步驟:**
```typescript
it('私人影片應該使用本地播放器', () => {
  const mockResult = {
    id: 'project-123',
    privacy: 'private',
    local_video_path: '/outputs/project-123/final_video.mp4',
    status: 'completed'
  }

  mockUseQuery.mockReturnValue({ data: mockResult, isLoading: false })

  render(<ResultPage params={{ id: 'project-123' }} />)

  // Verify local video player
  const videoPlayer = screen.getByTestId('local-video-player')
  expect(videoPlayer).toBeInTheDocument()
  expect(videoPlayer).toHaveAttribute(
    'src',
    expect.stringContaining('final_video.mp4')
  )

  // Verify controls
  expect(videoPlayer).toHaveAttribute('controls')
})
```

**驗證點:**
- [ ] 本地 video 元素渲染
- [ ] video src 指向正確路徑
- [ ] 播放控制列顯示
- [ ] 支援全螢幕

---

#### 測試 4: 下載功能

**目的:** 驗證所有下載按鈕功能正常

**測試步驟:**
```typescript
it('應該能下載影片、封面和所有素材', async () => {
  const { user } = setup()

  const mockDownload = jest.fn()
  global.URL.createObjectURL = jest.fn()
  global.document.createElement = jest.fn().mockReturnValue({
    click: mockDownload,
    setAttribute: jest.fn(),
  })

  render(<ResultPage params={{ id: 'project-123' }} />)

  // 1. Download video
  const downloadVideoBtn = screen.getByRole('button', { name: /下載影片/i })
  await user.click(downloadVideoBtn)

  expect(mockApiClient.get).toHaveBeenCalledWith(
    '/api/v1/projects/project-123/download/video',
    { responseType: 'blob' }
  )

  // 2. Download thumbnail
  const downloadThumbnailBtn = screen.getByRole('button', { name: /下載封面/i })
  await user.click(downloadThumbnailBtn)

  expect(mockApiClient.get).toHaveBeenCalledWith(
    '/api/v1/projects/project-123/download/thumbnail',
    { responseType: 'blob' }
  )

  // 3. Download all assets
  const downloadAllBtn = screen.getByRole('button', { name: /下載所有素材/i })
  await user.click(downloadAllBtn)

  expect(mockApiClient.get).toHaveBeenCalledWith(
    '/api/v1/projects/project-123/download/assets',
    { responseType: 'blob' }
  )
})
```

**驗證點:**
- [ ] 下載影片按鈕功能正常
- [ ] 下載封面按鈕功能正常
- [ ] 下載所有素材按鈕功能正常
- [ ] API 調用參數正確
- [ ] 檔案下載觸發

---

#### 測試 5: 下載進度顯示

**目的:** 驗證下載大檔案時顯示進度

**測試步驟:**
```typescript
it('下載大檔案時應該顯示進度', async () => {
  const { user } = setup()

  // Mock axios download with progress
  mockApiClient.get.mockImplementation((url, config) => {
    // Simulate progress events
    const onDownloadProgress = config.onDownloadProgress

    setTimeout(() => onDownloadProgress({ loaded: 25, total: 100 }), 100)
    setTimeout(() => onDownloadProgress({ loaded: 50, total: 100 }), 200)
    setTimeout(() => onDownloadProgress({ loaded: 100, total: 100 }), 300)

    return Promise.resolve({ data: new Blob() })
  })

  render(<ResultPage params={{ id: 'project-123' }} />)

  const downloadBtn = screen.getByRole('button', { name: /下載影片/i })
  await user.click(downloadBtn)

  // Verify progress shown
  await waitFor(() => {
    expect(screen.getByText(/下載中/i)).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  // Verify progress percentage
  await waitFor(() => {
    expect(screen.getByText('25%')).toBeInTheDocument()
  })

  // Verify completion
  await waitFor(() => {
    expect(screen.getByText(/下載完成/i)).toBeInTheDocument()
  })
})
```

**驗證點:**
- [ ] 下載中狀態顯示
- [ ] 進度條顯示
- [ ] 進度百分比更新
- [ ] 完成狀態顯示

---

#### 測試 6: 排程發布資訊顯示

**目的:** 驗證排程發布的影片正確顯示排程時間

**測試步驟:**
```typescript
it('排程發布應該顯示排程時間', () => {
  const mockResult = {
    id: 'project-123',
    publish_type: 'scheduled',
    scheduled_date: '2025-10-25T10:00:00Z',
    privacy: 'public',
    status: 'completed'
  }

  mockUseQuery.mockReturnValue({ data: mockResult, isLoading: false })

  render(<ResultPage params={{ id: 'project-123' }} />)

  // Verify scheduled badge
  expect(screen.getByText('已排程')).toBeInTheDocument()

  // Verify scheduled time
  expect(screen.getByText(/排程時間:/i)).toBeInTheDocument()
  expect(screen.getByText('2025-10-25 10:00')).toBeInTheDocument()
})
```

**驗證點:**
- [ ] 「已排程」標籤顯示
- [ ] 排程時間正確顯示
- [ ] 時區顯示正確

---

#### 測試 7: 錯誤狀態處理

**目的:** 驗證各種錯誤情境的處理

**測試場景 A - 專案未完成:**
```typescript
it('專案未完成時應該顯示錯誤訊息', () => {
  const mockResult = {
    id: 'project-123',
    status: 'processing'
  }

  mockUseQuery.mockReturnValue({ data: mockResult, isLoading: false })

  render(<ResultPage params={{ id: 'project-123' }} />)

  expect(screen.getByText('專案尚未完成，無法查看結果')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /返回主控台/i })).toBeInTheDocument()

  // Should not show result content
  expect(screen.queryByTestId('youtube-player')).not.toBeInTheDocument()
})
```

**測試場景 B - 找不到專案:**
```typescript
it('找不到專案時應該顯示 404', () => {
  mockUseQuery.mockReturnValue({
    data: null,
    isLoading: false,
    isError: true,
    error: { status: 404 }
  })

  render(<ResultPage params={{ id: 'non-existent' }} />)

  expect(screen.getByText(/找不到專案/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /返回主控台/i })).toBeInTheDocument()
})
```

**驗證點:**
- [ ] 未完成專案顯示錯誤訊息
- [ ] 404 錯誤顯示正確
- [ ] 提供返回主控台按鈕
- [ ] 不顯示結果內容

---

#### 測試 8: 操作按鈕功能

**目的:** 驗證所有操作按鈕的導航和功能

**測試步驟:**
```typescript
it('操作按鈕應該正確導航', async () => {
  const { user } = setup()

  const mockResult = {
    id: 'project-123',
    youtube_video_id: 'dQw4w9WgXcQ',
    status: 'completed'
  }

  mockUseQuery.mockReturnValue({ data: mockResult, isLoading: false })

  render(<ResultPage params={{ id: 'project-123' }} />)

  // 1. Test "編輯 YouTube 資訊" button
  const editYouTubeBtn = screen.getByRole('button', { name: /編輯 YouTube 資訊/i })
  expect(editYouTubeBtn).toHaveAttribute(
    'href',
    'https://studio.youtube.com/video/dQw4w9WgXcQ/edit'
  )
  expect(editYouTubeBtn).toHaveAttribute('target', '_blank')

  // 2. Test "生成新影片" button
  const newProjectBtn = screen.getByRole('button', { name: /生成新影片/i })
  await user.click(newProjectBtn)

  expect(mockRouter.push).toHaveBeenCalledWith('/project/new')

  // 3. Test "返回主控台" button
  const backBtn = screen.getByRole('button', { name: /返回主控台/i })
  await user.click(backBtn)

  expect(mockRouter.push).toHaveBeenCalledWith('/')
})
```

**驗證點:**
- [ ] 編輯 YouTube 資訊開啟正確連結
- [ ] 生成新影片跳轉正確
- [ ] 返回主控台跳轉正確
- [ ] 所有外部連結開啟新視窗

---

### 整合測試

#### 測試 9: 完整結果頁面流程

**目的:** 驗證從進度監控頁到結果頁的完整流程

**測試步驟:**
```typescript
it('應該能從進度監控頁查看結果', async () => {
  const { user } = setup()

  // 1. Start at progress page
  render(<ProgressPage params={{ id: 'project-123' }} />)

  // 2. Wait for completion
  await waitFor(() => {
    expect(screen.getByText('生成完成！')).toBeInTheDocument()
  })

  // 3. Click "查看結果"
  const viewResultBtn = screen.getByRole('button', { name: /查看結果/i })
  await user.click(viewResultBtn)

  // 4. Should navigate to result page
  expect(mockRouter.push).toHaveBeenCalledWith('/project/project-123/result')

  // 5. Render result page
  render(<ResultPage params={{ id: 'project-123' }} />)

  // 6. Verify result displayed
  await waitFor(() => {
    expect(screen.getByText('影片已成功生成並上傳到 YouTube！')).toBeInTheDocument()
  })
})
```

**驗證點:**
- [ ] 從進度頁正確跳轉
- [ ] 結果頁正確載入
- [ ] 所有資訊正確顯示
- [ ] 無錯誤發生

---

### E2E 測試 (Playwright)

#### 測試 10: 結果頁面 E2E

**測試腳本:**
```typescript
// e2e/result-page.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Result Page E2E', () => {
  test('用戶應該能查看結果並下載影片', async ({ page }) => {
    // 1. Navigate to result page
    await page.goto('http://localhost:3000/project/test-123/result')

    // 2. Verify success message
    await expect(page.locator('h1')).toContainText('影片已成功生成')

    // 3. Verify YouTube player
    const youtubeIframe = page.locator('iframe[src*="youtube.com"]')
    await expect(youtubeIframe).toBeVisible()

    // 4. Verify video info
    await expect(page.locator('text=影片標題')).toBeVisible()
    await expect(page.locator('text=影片描述')).toBeVisible()

    // 5. Test download video
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("下載影片")')
    const download = await downloadPromise

    expect(download.suggestedFilename()).toContain('.mp4')

    // 6. Test navigation
    await page.click('button:has-text("返回主控台")')
    await expect(page).toHaveURL(/\/$/)
  })
})
```

---

## 實作規格

### 需要建立/修改的檔案

#### 1. Page Component: `app/project/[id]/result/page.tsx`

**職責:** 結果頁面主組件

**完整實作:**

```tsx
// app/project/[id]/result/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import AppLayout from '@/components/layouts/AppLayout'
import Breadcrumb from '@/components/ui/Breadcrumb'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { toast } from '@/utils/toast'
import { api } from '@/lib/api'
import YouTubePlayer from '@/components/domain/YouTubePlayer'
import LocalVideoPlayer from '@/components/domain/LocalVideoPlayer'
import DownloadButton from '@/components/domain/DownloadButton'

export default function ResultPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [downloadProgress, setDownloadProgress] = useState<{
    [key: string]: number
  }>({})

  // Fetch project result
  const { data: result, isLoading, isError, error } = useQuery({
    queryKey: ['projectResult', params.id],
    queryFn: () => api.projects.getResult(params.id),
  })

  // Handle download
  const handleDownload = async (
    type: 'video' | 'thumbnail' | 'assets',
    filename: string
  ) => {
    try {
      const response = await api.projects.download(params.id, type, {
        onDownloadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          )
          setDownloadProgress((prev) => ({ ...prev, [type]: progress }))
        },
      })

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
  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Spinner size="large" />
          <p className="ml-4 text-gray-600">載入結果中...</p>
        </div>
      </AppLayout>
    )
  }

  // Error state - Project not found
  if (isError || !result) {
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

  // Error state - Project not completed
  if (result.status !== 'completed') {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            專案尚未完成
          </h1>
          <p className="text-gray-600 mb-6">
            專案正在生成中，請稍後再查看結果
          </p>
          <Button onClick={() => router.push('/')}>返回主控台</Button>
        </div>
      </AppLayout>
    )
  }

  const privacyLabels = {
    public: '公開',
    unlisted: '不公開',
    private: '私人',
  }

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: '主控台', href: '/' },
          { label: result.project_name, href: `/project/${params.id}` },
          { label: '結果' },
        ]}
      />

      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          {/* Success Message */}
          <Card className="mb-6 border-l-4 border-green-500">
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
                    在 YouTube 上觀看 →
                  </a>
                )}
              </div>
              <Badge
                type={
                  result.privacy === 'public'
                    ? 'success'
                    : result.privacy === 'unlisted'
                    ? 'warning'
                    : 'default'
                }
              >
                {result.publish_type === 'scheduled'
                  ? '已排程'
                  : privacyLabels[result.privacy]}
              </Badge>
            </div>
          </Card>

          {/* Video Preview */}
          <Card title="影片預覽" className="mb-6">
            <div data-testid="video-container" className="aspect-video">
              {result.privacy === 'private' ? (
                <LocalVideoPlayer src={result.local_video_url} />
              ) : (
                <YouTubePlayer videoId={result.youtube_video_id} />
              )}
            </div>
          </Card>

          {/* Video Info */}
          <Card title="影片資訊" className="mb-6">
            <div className="space-y-4">
              <div>
                <label className="block font-medium mb-1">標題</label>
                <p className="text-gray-700">{result.youtube_title}</p>
              </div>

              <div>
                <label className="block font-medium mb-1">描述</label>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {result.youtube_description}
                </p>
              </div>

              <div>
                <label className="block font-medium mb-1">標籤</label>
                <div className="flex flex-wrap gap-2">
                  {result.youtube_tags?.map((tag, index) => (
                    <Badge key={index} type="default">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {result.published_at && (
                <div>
                  <label className="block font-medium mb-1">發布時間</label>
                  <p className="text-gray-700">
                    {new Date(result.published_at).toLocaleString('zh-TW')}
                  </p>
                </div>
              )}

              {result.publish_type === 'scheduled' && result.scheduled_date && (
                <div>
                  <label className="block font-medium mb-1">排程時間</label>
                  <p className="text-gray-700">
                    {new Date(result.scheduled_date).toLocaleString('zh-TW')}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Download Section */}
          <Card title="下載" className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DownloadButton
                label="下載影片"
                onClick={() =>
                  handleDownload('video', `${result.project_name}.mp4`)
                }
                progress={downloadProgress.video}
              />

              <DownloadButton
                label="下載封面"
                onClick={() =>
                  handleDownload('thumbnail', `${result.project_name}_thumbnail.jpg`)
                }
                progress={downloadProgress.thumbnail}
              />

              <DownloadButton
                label="下載所有素材"
                onClick={() =>
                  handleDownload('assets', `${result.project_name}_assets.zip`)
                }
                progress={downloadProgress.assets}
              />
            </div>
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap gap-4 justify-center">
            {result.youtube_video_id && (
              <Button
                type="secondary"
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

            <Button type="secondary" onClick={() => router.push('/project/new')}>
              生成新影片
            </Button>

            <Button type="primary" onClick={() => router.push('/')}>
              返回主控台
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
```

---

#### 2. Domain Component: `components/domain/YouTubePlayer.tsx`

**職責:** YouTube 播放器元件

```tsx
// components/domain/YouTubePlayer.tsx
interface YouTubePlayerProps {
  videoId: string
}

export default function YouTubePlayer({ videoId }: YouTubePlayerProps) {
  return (
    <iframe
      data-testid="youtube-player"
      className="w-full h-full"
      src={`https://www.youtube.com/embed/${videoId}`}
      title="YouTube video player"
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  )
}
```

---

#### 3. Domain Component: `components/domain/LocalVideoPlayer.tsx`

**職責:** 本地影片播放器元件

```tsx
// components/domain/LocalVideoPlayer.tsx
interface LocalVideoPlayerProps {
  src: string
}

export default function LocalVideoPlayer({ src }: LocalVideoPlayerProps) {
  return (
    <video
      data-testid="local-video-player"
      className="w-full h-full"
      src={src}
      controls
      controlsList="nodownload"
    />
  )
}
```

---

#### 4. Domain Component: `components/domain/DownloadButton.tsx`

**職責:** 帶進度條的下載按鈕元件

```tsx
// components/domain/DownloadButton.tsx
import Button from '@/components/ui/Button'

interface DownloadButtonProps {
  label: string
  onClick: () => void
  progress?: number
}

export default function DownloadButton({
  label,
  onClick,
  progress = 0,
}: DownloadButtonProps) {
  const isDownloading = progress > 0 && progress < 100

  return (
    <div className="relative">
      <Button
        type="secondary"
        onClick={onClick}
        disabled={isDownloading}
        className="w-full"
      >
        {isDownloading ? `下載中 ${progress}%` : label}
      </Button>

      {isDownloading && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded">
          <div
            className="h-full bg-primary transition-all rounded"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}
    </div>
  )
}
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步: 環境準備 (10 分鐘)
1. 確認 Task-024 (進度監控頁) 已完成
2. 確認路由、API 整合層可用
3. 閱讀 `product-design/pages.md#Page-8`
4. 閱讀 `tech-specs/frontend/pages.md#8`

#### 第 2 步: 撰寫基本渲染測試 (20 分鐘)
1. 建立 `__tests__/pages/ResultPage.test.tsx`
2. 撰寫「測試 1: 結果頁面基本渲染」
3. 執行測試 → 失敗 (紅燈)

#### 第 3 步: 實作結果頁面基礎 (45 分鐘)
1. 建立 `app/project/[id]/result/page.tsx`
2. 實作基本頁面結構
3. 實作成功訊息區
4. 實作影片資訊顯示
5. 執行測試 → 通過 ✅

#### 第 4 步: 實作播放器元件 (40 分鐘)
1. 撰寫「測試 2: YouTube 播放器」和「測試 3: 本地播放器」
2. 建立 `YouTubePlayer.tsx` 和 `LocalVideoPlayer.tsx`
3. 實作播放器邏輯 (根據 privacy 選擇)
4. 執行測試 → 通過 ✅

#### 第 5 步: 實作下載功能 (60 分鐘)
1. 撰寫「測試 4: 下載功能」和「測試 5: 下載進度」
2. 建立 `DownloadButton.tsx` 元件
3. 實作下載邏輯與進度顯示
4. 執行測試 → 通過 ✅

#### 第 6 步: 實作錯誤處理 (30 分鐘)
1. 撰寫「測試 7: 錯誤狀態處理」
2. 實作未完成專案錯誤頁面
3. 實作 404 錯誤頁面
4. 執行測試 → 通過 ✅

#### 第 7 步: 實作操作按鈕 (20 分鐘)
1. 撰寫「測試 8: 操作按鈕功能」
2. 實作導航邏輯
3. 實作 YouTube Studio 連結
4. 執行測試 → 通過 ✅

#### 第 8 步: 整合測試與 E2E (45 分鐘)
1. 撰寫「測試 9: 完整結果頁面流程」
2. 撰寫 Playwright E2E 測試
3. 執行所有測試 → 通過 ✅

#### 第 9 步: 響應式設計 (30 分鐘)
1. 實作桌面版佈局
2. 實作平板版佈局
3. 實作手機版佈局
4. 測試各種螢幕尺寸

#### 第 10 步: 程式碼檢查 (20 分鐘)
1. ESLint: `npm run lint`
2. TypeScript: `npm run type-check`
3. 檢查重複程式碼
4. 測試覆蓋率確認

---

## 注意事項

### 影片播放
- ⚠️ YouTube 播放器需要檢查 video ID 有效性
- ⚠️ 本地播放器需要處理大檔案載入
- ⚠️ 支援全螢幕播放

### 下載功能
- ⚠️ 大檔案下載需要顯示進度
- ⚠️ 下載失敗需要提供重試機制
- ⚠️ ZIP 檔案可能很大,需要提示用戶

### 使用者體驗
- 💡 載入狀態顯示清楚
- 💡 錯誤訊息具體且友善
- 💡 按鈕狀態明確 (禁用/載入中)
- 💡 下載進度即時更新

### 安全性
- ⚠️ YouTube iframe 使用 HTTPS
- ⚠️ 外部連結開啟新視窗 (target="_blank" + rel="noopener noreferrer")
- ⚠️ 檔案下載驗證檔案類型

---

## 完成檢查清單

### 功能完整性
- [ ] 結果頁面完整實作
- [ ] 成功訊息區正確顯示
- [ ] YouTube 播放器正常嵌入
- [ ] 本地播放器正常運作
- [ ] 影片資訊正確顯示
- [ ] 下載影片功能正常
- [ ] 下載封面功能正常
- [ ] 下載所有素材功能正常
- [ ] 下載進度顯示正確
- [ ] 排程發布資訊正確顯示
- [ ] 操作按鈕導航正確
- [ ] 錯誤狀態處理完整

### 測試
- [ ] 所有單元測試通過 (8 個測試)
- [ ] 整合測試通過 (1 個測試)
- [ ] E2E 測試通過 (1 個測試)
- [ ] 測試覆蓋率 > 80%

### 程式碼品質
- [ ] ESLint 檢查通過
- [ ] TypeScript 類型檢查通過
- [ ] 無重複程式碼
- [ ] 命名清晰、有註解

### 響應式設計
- [ ] 桌面版正確顯示 (≥1024px)
- [ ] 平板版正確顯示 (768-1023px)
- [ ] 手機版正確顯示 (<768px)

### 整合
- [ ] API 整合正確
- [ ] 狀態管理正確
- [ ] 頁面導航流程正確
- [ ] Toast 通知正確顯示

---

## 預估時間分配

- 閱讀與準備: 10 分鐘
- 撰寫測試: 1.5 小時
- 實作頁面與元件: 2.5 小時
- 下載功能實作: 1 小時
- 錯誤處理: 30 分鐘
- 整合測試與 E2E: 45 分鐘
- 響應式設計: 30 分鐘
- 程式碼檢查: 20 分鐘

**總計: 約 6 小時**

---

## 參考資源

### Next.js 官方文檔
- [App Router](https://nextjs.org/docs/app)
- [Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)

### React 官方文檔
- [Video Element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video)
- [Download Files](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/download)

### YouTube API
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)
- [YouTube Studio URLs](https://support.google.com/youtube/answer/57792)

### 專案內部文件
- `product-design/pages.md#Page-8` - 頁面設計
- `tech-specs/frontend/pages.md#8` - 技術規格
- `product-design/flows.md#Flow-1` - 使用者流程

---

**準備好了嗎？** 開始使用 TDD 方式實作結果頁面！🚀
