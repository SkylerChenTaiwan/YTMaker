# 頁面規格

> **建立日期:** 2025-10-19
> **最後更新:** 2025-10-19
> **關聯文件:** `_index.md`, `routing.md`, `component-architecture.md`, `state-management.md`, `api-integration.md`

---

## 📖 目錄

1. [頁面層級結構](#頁面層級結構)
2. [12 個頁面詳細規格](#12-個頁面詳細規格)
3. [表單處理規格](#表單處理規格)
4. [頁面導航流程](#頁面導航流程)

---

## 頁面層級結構

```
應用程式
├── 首次啟動設定精靈 (獨立流程)
│   ├── 歡迎頁 (步驟 0)
│   ├── API 設定頁 (步驟 1-3)
│   ├── YouTube 授權頁 (步驟 4)
│   └── 完成頁 (步驟 5)
│
└── 主應用 (需完成設定後進入)
    ├── 主控台 (/)
    │
    ├── 新增專案流程 (多步驟)
    │   ├── 步驟 1: 上傳文字內容 (/project/new)
    │   ├── 步驟 2: 視覺化配置 (/project/:id/configure/visual)
    │   ├── 步驟 3: Prompt & Model (/project/:id/configure/prompt-model)
    │   └── 步驟 4: YouTube 設定 (/project/:id/configure/youtube)
    │
    ├── 進度監控頁 (/project/:id/progress)
    ├── 結果頁 (/project/:id/result)
    │
    ├── 配置管理頁 (/configurations)
    ├── 模板管理頁 (/templates)
    │   ├── Tab: 視覺配置模板
    │   └── Tab: Prompt 範本
    │
    ├── 系統設定頁 (/settings)
    │   ├── Tab: API 金鑰
    │   ├── Tab: YouTube 授權
    │   └── Tab:偏好設定
    │
    └── 批次處理頁 (/batch)
        └── 批次任務詳細頁 (/batch/:id)
```

---

## 12 個頁面詳細規格

### 1. 主控台 (Dashboard)

**路由:** `/`

**功能:**
- 顯示專案列表
- 顯示統計資訊 (總專案數、完成數、進行中等)
- 快速操作 (新增專案、刪除專案等)

**元件結構:**

```tsx
// app/page.tsx
export default function DashboardPage() {
  const { projects, isLoading } = useProjects()

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">主控台</h1>
          <Link href="/project/new">
            <Button type="primary" icon={<PlusIcon />}>
              新增專案
            </Button>
          </Link>
        </div>

        <StatsCards stats={stats} />

        {isLoading ? (
          <Skeleton count={3} />
        ) : (
          <ProjectList projects={projects} />
        )}
      </div>
    </AppLayout>
  )
}
```

**狀態管理:**
- 從 Store 讀取 `projects.list`
- 使用 TanStack Query 查詢最新專案列表

---

### 2. 設定精靈頁 (Setup Wizard)

**路由:** `/setup`

**功能:**
- 首次啟動時設定 API Keys
- 授權 YouTube 帳號
- 設定偏好選項

**步驟流程:**

```
步驟 0: 歡迎
  ↓
步驟 1: Gemini API Key
  ↓
步驟 2: Stability AI API Key
  ↓
步驟 3: D-ID API Key
  ↓
步驟 4: YouTube 授權
  ↓
步驟 5: 完成
```

**元件結構:**

```tsx
// app/setup/page.tsx
export default function SetupPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const setApiKey = useStore((state) => state.setApiKey)

  const steps = [
    { title: '歡迎', component: <WelcomeStep /> },
    { title: 'Gemini API', component: <GeminiApiStep /> },
    { title: 'Stability AI', component: <StabilityApiStep /> },
    { title: 'D-ID API', component: <DIdApiStep /> },
    { title: 'YouTube 授權', component: <YouTubeAuthStep /> },
    { title: '完成', component: <CompletionStep /> },
  ]

  return (
    <SetupLayout>
      <StepIndicator current={currentStep} total={steps.length} />
      {steps[currentStep].component}
      <div className="flex justify-between mt-6">
        {currentStep > 0 && (
          <Button onClick={() => setCurrentStep(currentStep - 1)}>
            上一步
          </Button>
        )}
        {currentStep < steps.length - 1 && (
          <Button type="primary" onClick={() => setCurrentStep(currentStep + 1)}>
            下一步
          </Button>
        )}
      </div>
    </SetupLayout>
  )
}
```

---

### 3. 新增專案頁 (New Project)

**路由:** `/project/new`

**功能:**
- 輸入專案名稱
- 上傳或貼上文字內容 (500-10000 字)
- 驗證內容長度

**表單 Schema:**

```typescript
const projectFormSchema = z.object({
  project_name: z
    .string()
    .min(1, '專案名稱不能為空')
    .max(100, '專案名稱不能超過 100 字元'),

  content_source: z.enum(['upload', 'paste']),

  content_text: z
    .string()
    .min(500, '文字長度必須在 500-10000 字之間')
    .max(10000, '文字長度必須在 500-10000 字之間')
    .optional(),

  content_file: z
    .instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, '檔案大小不能超過 10MB')
    .optional(),
})
```

**元件結構:**

```tsx
// app/project/new/page.tsx
export default function NewProjectPage() {
  const [formData, setFormData] = useState({
    projectName: '',
    contentSource: 'paste' as 'upload' | 'paste',
    contentText: '',
  })
  const [errors, setErrors] = useState<any>({})

  const createMutation = useMutation({
    mutationFn: (data: CreateProjectData) => api.createProject(data),
    onSuccess: (project) => {
      toast.success('專案創建成功！')
      router.push(`/project/${project.id}/configure/visual`)
    },
  })

  const handleSubmit = () => {
    const result = projectFormSchema.safeParse(formData)
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors)
      return
    }

    createMutation.mutate(formData)
  }

  return (
    <AppLayout>
      <Breadcrumb items={[{ label: '主控台', href: '/' }, { label: '新增專案' }]} />

      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">新增專案</h1>

        <div className="mb-4">
          <label className="block mb-2 font-medium">專案名稱</label>
          <Input
            value={formData.projectName}
            onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
            placeholder="輸入專案名稱"
            status={errors.project_name ? 'error' : ''}
          />
          {errors.project_name && (
            <p className="text-red-500 text-sm mt-1">{errors.project_name[0]}</p>
          )}
        </div>

        <div className="mb-4">
          <label className="block mb-2 font-medium">文字來源</label>
          <Select
            value={formData.contentSource}
            onChange={(value) => setFormData({ ...formData, contentSource: value })}
            options={[
              { label: '貼上文字', value: 'paste' },
              { label: '上傳檔案', value: 'upload' },
            ]}
          />
        </div>

        {formData.contentSource === 'paste' ? (
          <div className="mb-4">
            <label className="block mb-2 font-medium">文字內容</label>
            <textarea
              className="w-full h-64 border rounded p-2"
              value={formData.contentText}
              onChange={(e) => setFormData({ ...formData, contentText: e.target.value })}
              placeholder="貼上文字內容 (500-10000 字)"
            />
            <p className="text-sm text-gray-500 mt-1">
              目前字數: {formData.contentText.length}
            </p>
            {errors.content_text && (
              <p className="text-red-500 text-sm mt-1">{errors.content_text[0]}</p>
            )}
          </div>
        ) : (
          <div className="mb-4">
            <label className="block mb-2 font-medium">上傳檔案</label>
            <FileUpload
              accept=".txt,.md"
              onFileSelect={(files) => handleFileUpload(files[0])}
            />
          </div>
        )}

        <div className="flex justify-end gap-4">
          <Button onClick={() => router.push('/')}>取消</Button>
          <Button
            type="primary"
            loading={createMutation.isLoading}
            onClick={handleSubmit}
          >
            下一步
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
```

---

### 4. 視覺化配置頁 (Visual Config)

**路由:** `/project/:id/configure/visual`

**功能:**
- 配置字幕樣式 (字型、顏色、位置等)
- 上傳 Logo 並調整位置
- 添加疊加元素

**元件結構:**

```tsx
// app/project/[id]/configure/visual/page.tsx
export default function VisualConfigPage({ params }: { params: { id: string } }) {
  const [config, setConfig] = useState<VisualConfig>(defaultConfig)
  const debouncedConfig = useDebounce(config, 1000)

  useEffect(() => {
    // 自動儲存
    api.saveVisualConfig(params.id, debouncedConfig)
  }, [debouncedConfig, params.id])

  return (
    <AppLayout>
      <Breadcrumb
        items={[
          { label: '主控台', href: '/' },
          { label: '新增專案', href: '/project/new' },
          { label: '視覺化配置' },
        ]}
      />

      <div className="flex gap-4 p-6">
        {/* 左側: 預覽區 */}
        <div className="w-3/5">
          <VisualEditor config={config} onChange={setConfig} />
        </div>

        {/* 右側: 配置面板 */}
        <div className="w-2/5">
          <Card title="字幕設定">
            <SubtitleConfig config={config.subtitle} onChange={(subtitle) => setConfig({ ...config, subtitle })} />
          </Card>

          <Card title="Logo 設定" className="mt-4">
            <LogoConfig config={config.logo} onChange={(logo) => setConfig({ ...config, logo })} />
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-4 px-6 pb-6">
        <Button onClick={() => router.back()}>上一步</Button>
        <Button type="primary" onClick={() => router.push(`/project/${params.id}/configure/prompt-model`)}>
          下一步
        </Button>
      </div>
    </AppLayout>
  )
}
```

---

### 5. Prompt 與模型設定頁

**路由:** `/project/:id/configure/prompt-model`

**功能:**
- 選擇 Prompt 範本
- 自訂 Prompt
- 選擇 AI 模型

**元件結構:**

```tsx
// app/project/[id]/configure/prompt-model/page.tsx
export default function PromptModelPage({ params }: { params: { id: string } }) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash')

  const templates = useQuery({
    queryKey: ['promptTemplates'],
    queryFn: () => api.getPromptTemplates(),
  })

  return (
    <AppLayout>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Prompt 範本</h2>
        <PromptTemplateList
          templates={templates.data || []}
          selectedId={selectedTemplate}
          onSelect={setSelectedTemplate}
        />

        <h2 className="text-2xl font-bold mb-4 mt-8">自訂 Prompt</h2>
        <textarea
          className="w-full h-32 border rounded p-2"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="輸入自訂 Prompt"
        />

        <h2 className="text-2xl font-bold mb-4 mt-8">選擇模型</h2>
        <ModelSelector selected={selectedModel} onSelect={setSelectedModel} />

        <div className="flex justify-end gap-4 mt-6">
          <Button onClick={() => router.back()}>上一步</Button>
          <Button type="primary" onClick={handleNext}>
            下一步
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
```

---

### 6. YouTube 設定頁

**路由:** `/project/:id/configure/youtube`

**功能:**
- 設定影片標題
- 設定影片描述
- 選擇發布隱私
- 設定標籤
- 選擇 YouTube 帳號

**元件結構:**

```tsx
// app/project/[id]/configure/youtube/page.tsx
export default function YouTubeSettingsPage({ params }: { params: { id: string } }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    privacy: 'unlisted' as 'public' | 'unlisted' | 'private',
    tags: [] as string[],
    youtubeAccountId: '',
  })

  const youtubeAccounts = useStore((state) => state.settings.youtubeAccounts)

  const handleSubmit = () => {
    api.saveYouTubeSettings(params.id, formData)
    api.startGeneration(params.id)
    router.push(`/project/${params.id}/progress`)
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">YouTube 設定</h1>

        <div className="mb-4">
          <label className="block mb-2 font-medium">影片標題</label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div className="mb-4">
          <label className="block mb-2 font-medium">影片描述</label>
          <textarea
            className="w-full h-32 border rounded p-2"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="mb-4">
          <label className="block mb-2 font-medium">隱私設定</label>
          <Select
            value={formData.privacy}
            onChange={(value) => setFormData({ ...formData, privacy: value })}
            options={[
              { label: '公開', value: 'public' },
              { label: '不公開 (僅限連結)', value: 'unlisted' },
              { label: '私人', value: 'private' },
            ]}
          />
        </div>

        <div className="mb-4">
          <label className="block mb-2 font-medium">YouTube 帳號</label>
          <Select
            value={formData.youtubeAccountId}
            onChange={(value) => setFormData({ ...formData, youtubeAccountId: value })}
            options={youtubeAccounts.map((acc) => ({
              label: acc.channel_name,
              value: acc.id,
            }))}
          />
        </div>

        <div className="flex justify-end gap-4">
          <Button onClick={() => router.back()}>上一步</Button>
          <Button type="primary" onClick={handleSubmit}>
            開始生成
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
```

---

### 7. 進度監控頁 (Progress)

**路由:** `/project/:id/progress`

**功能:**
- 顯示即時進度 (透過 WebSocket)
- 顯示當前階段
- 顯示日誌

**元件結構:**

```tsx
// app/project/[id]/progress/page.tsx
export default function ProgressPage({ params }: { params: { id: string } }) {
  const progress = useStore((state) => state.progress)
  useWebSocket(params.id)

  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">進度監控</h1>

        <Card className="mb-6">
          <div className="mb-4">
            <p className="text-lg font-medium mb-2">當前階段</p>
            <p className="text-2xl font-bold text-primary">{progress.stage}</p>
          </div>

          <ProgressBar value={progress.percentage} showPercentage />
        </Card>

        <Card title="日誌">
          <LogViewer logs={progress.logs} />
        </Card>
      </div>
    </AppLayout>
  )
}
```

---

### 8. 結果頁 (Result)

**路由:** `/project/:id/result`

**功能:**
- 預覽生成的影片
- 下載影片
- 重新生成
- 返回主控台

**元件結構:**

```tsx
// app/project/[id]/result/page.tsx
export default function ResultPage({ params }: { params: { id: string } }) {
  const { data: project } = useQuery({
    queryKey: ['project', params.id],
    queryFn: () => api.getProject(params.id),
  })

  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">生成結果</h1>

        <Card className="mb-6">
          <VideoPlayer src={project?.video_url} />
        </Card>

        <div className="flex justify-end gap-4">
          <Button onClick={() => router.push('/')}>返回主控台</Button>
          <Button onClick={handleDownload}>下載影片</Button>
          <Button type="primary" onClick={handleRegenerate}>
            重新生成
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
```

---

### 9. 配置管理頁 (Configurations)

**路由:** `/configurations`

**功能:**
- 列出所有視覺配置
- 創建新配置
- 編輯配置
- 刪除配置
- 將配置保存為模板

---

### 10. 模板管理頁 (Templates)

**路由:** `/templates`

**功能:**
- Tab 1: 視覺配置模板
- Tab 2: Prompt 範本

---

### 11. 系統設定頁 (Settings)

**路由:** `/settings`

**功能:**
- Tab 1: API 金鑰管理
- Tab 2: YouTube 授權管理
- Tab 3: 偏好設定

---

### 12. 批次處理頁 (Batch)

**路由:** `/batch`

**功能:**
- 創建批次任務
- 列出批次任務
- 監控批次進度

---

## 表單處理規格

### 表單驗證規則

**使用:** Zod

**專案表單範例:**

```typescript
import { z } from 'zod'

const projectFormSchema = z.object({
  project_name: z
    .string()
    .min(1, '專案名稱不能為空')
    .max(100, '專案名稱不能超過 100 字元'),

  content_source: z.enum(['upload', 'paste']),

  content_text: z
    .string()
    .min(500, '文字長度必須在 500-10000 字之間')
    .max(10000, '文字長度必須在 500-10000 字之間')
    .optional(),

  content_file: z
    .instanceof(File)
    .refine((file) => file.size <= 10 * 1024 * 1024, '檔案大小不能超過 10MB')
    .refine(
      (file) => ['text/plain', 'text/markdown'].includes(file.type),
      '檔案必須為 TXT 或 MD 格式'
    )
    .optional(),
})

type ProjectFormData = z.infer<typeof projectFormSchema>
```

### 錯誤訊息顯示

```tsx
<div className="mb-4">
  <label className="block mb-2">專案名稱</label>
  <Input
    value={formData.project_name}
    onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
    status={errors.project_name ? 'error' : ''}
  />
  {errors.project_name && (
    <p className="text-red-500 text-sm mt-1">{errors.project_name}</p>
  )}
</div>
```

### 自動儲存策略

```typescript
import { useDebounce } from '@/hooks/useDebounce'

const VisualConfigPage = () => {
  const [config, setConfig] = useState(initialConfig)
  const debouncedConfig = useDebounce(config, 1000) // 1 秒延遲

  useEffect(() => {
    // 自動儲存
    saveConfig(debouncedConfig)
  }, [debouncedConfig])

  return (
    // ...
  )
}
```

### 離開頁面警告

```typescript
import { useUnsavedWarning } from '@/hooks/useUnsavedWarning'

const FormPage = () => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const { confirmLeave } = useUnsavedWarning(hasUnsavedChanges)

  const handleLeave = () => {
    confirmLeave(() => {
      router.push('/')
    })
  }

  return (
    <Button onClick={handleLeave}>離開</Button>
  )
}
```

### 檔案上傳處理

```typescript
const handleFileUpload = async (file: File) => {
  // 驗證檔案
  if (file.size > 10 * 1024 * 1024) {
    toast.error('檔案大小不能超過 10MB')
    return
  }

  const allowedTypes = ['text/plain', 'text/markdown']
  if (!allowedTypes.includes(file.type)) {
    toast.error('檔案必須為 TXT 或 MD 格式')
    return
  }

  // 讀取文字
  const text = await file.text()
  const charCount = text.length

  if (charCount < 500 || charCount > 10000) {
    toast.error('文字長度必須在 500-10000 字之間')
    return
  }

  setFormData({ ...formData, content_text: text })
  toast.success('檔案載入成功')
}
```

---

## 頁面導航流程

### 專案創建完整流程

```
主控台 (/)
  ↓ 點擊「新增專案」
新增專案 (/project/new)
  ↓ 填寫名稱和內容，點擊「下一步」
視覺化配置 (/project/:id/configure/visual)
  ↓ 配置字幕和 Logo，點擊「下一步」
Prompt 設定 (/project/:id/configure/prompt-model)
  ↓ 選擇 Prompt 和模型，點擊「下一步」
YouTube 設定 (/project/:id/configure/youtube)
  ↓ 填寫 YouTube 資訊，點擊「開始生成」
進度監控 (/project/:id/progress)
  ↓ 等待生成完成 (WebSocket 即時更新)
結果頁 (/project/:id/result)
  ↓ 預覽、下載或重新生成
```

---

## 更新記錄

| 日期 | 版本 | 修改內容 | 修改人 |
|------|------|----------|--------|
| 2025-10-19 | 1.0 | 初始版本，從 frontend-spec.md 拆分 | Claude Code |
