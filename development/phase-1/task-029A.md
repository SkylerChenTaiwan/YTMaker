# Task-029A: 測試基礎設施

> **建立日期:** 2025-10-22
> **狀態:** ⏳ 未開始
> **預計時間:** 3 小時
> **優先級:** P0 (必須)
> **父任務:** Task-029 (E2E 整合測試)

---

## 關聯文件

### 產品設計
- **User Flows:** `product-design/flows.md` - 所有使用者流程

### 技術規格
- **後端測試:** `tech-specs/backend/testing.md` - Mock 策略
- **前端測試:** `tech-specs/frontend/testing.md` - E2E 測試規範  
- **技術框架:** `tech-specs/framework.md` - Playwright + MSW

### 相關任務
- **前置任務:** Task-001 ~ Task-028
- **後續任務:** Task-029B, Task-029C (依賴此任務)

---

## 任務目標

### 簡述
建立完整的 E2E 測試基礎設施,包含所有第三方 API 的 Mock Server、測試輔助工具和測試資料。確保後續測試撰寫能夠順利進行。

### 成功標準
- [ ] MSW (Mock Service Worker) 正確設定並運作
- [ ] 4 個第三方 API Mock 全部實作並通過驗證
  - [ ] Gemini API Mock (腳本生成)
  - [ ] Stability AI Mock (圖片生成)
  - [ ] D-ID API Mock (虛擬主播)
  - [ ] YouTube API Mock (影片上傳)
- [ ] 測試輔助函數完整且易用
- [ ] Mock 測試資料完整
- [ ] 所有 Mock 機制通過單元測試驗證
- [ ] 測試 fixtures 準備完成 (圖片、文字檔案)

---

## 實作規格

### 需要建立的檔案結構

```
frontend/
└── tests/
    ├── mocks/
    │   ├── handlers.ts              # 整合所有 Mock handlers
    │   ├── server.ts                # MSW Server 設定
    │   ├── gemini-api.mock.ts       # Gemini API Mock
    │   ├── stability-ai.mock.ts     # Stability AI Mock
    │   ├── did-api.mock.ts          # D-ID API Mock
    │   ├── youtube-api.mock.ts      # YouTube API Mock
    │   └── fixtures/                # 測試用靜態資源
    │       ├── test-image.png       # 測試圖片 (1920x1080)
    │       ├── test-logo.png        # 測試 Logo
    │       └── test-content.txt     # 測試文字內容 (600字)
    └── e2e/
        └── utils/
            ├── test-helpers.ts      # 測試輔助函數
            ├── mock-data.ts         # Mock 測試資料
            └── assertions.ts        # 自訂斷言
```

---

## 詳細實作規格

### 1. MSW Server 設定

**檔案:** `tests/mocks/server.ts`

```typescript
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)

// 在測試前啟動 Mock Server
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))

// 每次測試後重置 handlers
afterEach(() => server.resetHandlers())

// 測試結束後關閉 Server
afterAll(() => server.close())
```

**功能:**
- 啟動 MSW Server
- 攔截所有 HTTP 請求
- 自動清理機制

---

### 2. Gemini API Mock

**檔案:** `tests/mocks/gemini-api.mock.ts`

**Mock 端點:**
```
POST https://generativelanguage.googleapis.com/v1/models/:model:generateContent
```

**Mock 回應結構:**
```typescript
{
  candidates: [{
    content: {
      parts: [{
        text: JSON.stringify({
          intro: {
            text: "開場白文字",
            duration: 10
          },
          segments: [
            {
              index: 1,
              text: "段落文字",
              duration: 15,
              image_description: "圖片描述"
            },
            // ... 10-15 個段落
          ],
          outro: {
            text: "結尾文字",
            duration: 10
          },
          metadata: {
            title: "AI 生成的影片標題",
            description: "影片描述",
            tags: ["tag1", "tag2", "tag3"]
          },
          total_duration: 300
        })
      }]
    }
  }]
}
```

**測試案例:**
- ✅ 成功回應 (200)
- ❌ API Key 無效 (401)
- ❌ 速率限制 (429)
- ❌ 伺服器錯誤 (500)

**完整代碼:** (見下方實作程式碼骨架)

---

### 3. Stability AI Mock

**檔案:** `tests/mocks/stability-ai.mock.ts`

**Mock 端點:**
```
POST https://api.stability.ai/v1/generation/:engineId/text-to-image
```

**Mock 回應:**
- 回傳 base64 編碼的 PNG 圖片
- 使用 fixtures/test-image.png
- 模擬生成延遲 (2秒)

**測試案例:**
- ✅ 成功生成圖片 (200)
- ❌ Rate Limit (429)
- ❌ 無效參數 (400)

---

### 4. D-ID API Mock

**檔案:** `tests/mocks/did-api.mock.ts`

**Mock 端點:**
```
POST https://api.d-id.com/talks          # 建立任務
GET  https://api.d-id.com/talks/:id      # 查詢狀態
```

**Mock 流程:**
1. POST → 回傳 `talk_id`
2. GET (前2次) → `status: "processing"`
3. GET (第3次) → `status: "done"` + `result_url`

**測試案例:**
- ✅ 任務建立成功
- ✅ 輪詢機制正常
- ✅ 任務完成回傳影片 URL
- ❌ 配額不足 (402)

---

### 5. YouTube API Mock

**檔案:** `tests/mocks/youtube-api.mock.ts`

**Mock 端點:**
```
POST https://oauth2.googleapis.com/token                     # OAuth Token
POST https://www.googleapis.com/upload/youtube/v3/videos     # 上傳初始化
PUT  https://www.googleapis.com/upload/youtube/v3/videos     # 上傳檔案
GET  https://www.googleapis.com/youtube/v3/videos            # 查詢影片
```

**測試案例:**
- ✅ OAuth 流程
- ✅ Resumable Upload
- ✅ 影片 metadata 設定
- ❌ 配額不足 (403)

---

### 6. Mock Handlers 整合

**檔案:** `tests/mocks/handlers.ts`

```typescript
import { geminiApiMock } from './gemini-api.mock'
import { stabilityAiMock } from './stability-ai.mock'
import { didApiMock } from './did-api.mock'
import { youtubeApiMock } from './youtube-api.mock'

export const handlers = [
  ...geminiApiMock,
  ...stabilityAiMock,
  ...didApiMock,
  ...youtubeApiMock
]
```

---

### 7. 測試輔助函數

**檔案:** `tests/e2e/utils/test-helpers.ts`

**功能:**
- `fillProjectBasicInfo()` - 填寫專案基本資訊
- `waitForCharCount()` - 等待字數統計更新
- `waitForPageLoad()` - 等待頁面載入
- `waitForApiCall()` - 等待 API 請求完成
- `verifyToast()` - 驗證 Toast 訊息
- `verifyNavigation()` - 驗證導航
- `uploadFile()` - 模擬檔案上傳
- `waitForElement()` - 等待元素可見

**範例:**
```typescript
export class TestHelpers {
  constructor(private page: Page) {}

  async fillProjectBasicInfo(projectName: string, content: string) {
    await this.page.fill('input[name="project_name"]', projectName)
    await this.page.fill('textarea[name="content_text"]', content)
    await this.waitForCharCount(content.length)
  }

  async verifyToast(message: string, type: 'success' | 'error' = 'success') {
    const toast = this.page.locator(`.toast.${type}:has-text("${message}")`)
    await expect(toast).toBeVisible()
  }

  // ... 更多輔助函數
}
```

---

### 8. Mock 測試資料

**檔案:** `tests/e2e/utils/mock-data.ts`

```typescript
export const mockProjectData = {
  projectName: 'E2E 測試專案',
  contentText: '這是測試內容...'.repeat(100), // 600 字
}

export const mockApiKeys = {
  gemini: 'test-gemini-key-12345',
  stabilityAI: 'test-stability-key-12345',
  did: 'test-did-key-12345',
}

export const mockScriptResponse = {
  intro: { text: '歡迎來到今天的影片', duration: 10 },
  segments: [
    { index: 1, text: '第一段內容', duration: 15, image_description: 'desc1' },
    // ... 更多段落
  ],
  outro: { text: '感謝觀看', duration: 10 },
  metadata: {
    title: 'AI 生成的測試影片',
    description: '這是描述',
    tags: ['測試', 'AI'],
  },
  total_duration: 300,
}
```

---

### 9. 測試 Fixtures

**準備檔案:**

1. **test-image.png** (1920x1080)
   - 用於模擬 Stability AI 生成的圖片
   - 可以是純色或簡單圖案

2. **test-logo.png** (100x100)
   - 用於測試 Logo 上傳

3. **test-content.txt** (600 字)
   ```
   這是一段測試文字內容,用於 E2E 測試專案生成流程。
   [重複內容以達到 600 字]
   ```

---

## 開發指引 (TDD 流程)

### Step 1: 安裝依賴 (已完成)

```bash
cd frontend
npm install -D msw @playwright/test
npx playwright install
```

### Step 2: 建立目錄結構 (已完成)

```bash
mkdir -p tests/mocks/fixtures tests/e2e/utils
```

### Step 3: 實作 MSW Server (30 分鐘)

1. 建立 `tests/mocks/server.ts`
2. 建立 `tests/mocks/handlers.ts` (空陣列)
3. 測試 Server 可正常啟動

### Step 4: 實作 Gemini API Mock (45 分鐘)

1. 建立 `tests/mocks/gemini-api.mock.ts`
2. 實作成功回應 (200)
3. 實作錯誤回應 (401, 429, 500)
4. 撰寫單元測試驗證 Mock
5. 確保回應符合真實 API 格式

### Step 5: 實作 Stability AI Mock (30 分鐘)

1. 準備 `fixtures/test-image.png`
2. 建立 `tests/mocks/stability-ai.mock.ts`
3. 實作圖片生成 Mock
4. 測試 base64 編碼正確

### Step 6: 實作 D-ID API Mock (30 分鐘)

1. 建立 `tests/mocks/did-api.mock.ts`
2. 實作任務建立與查詢
3. 實作輪詢機制
4. 測試狀態轉換正確

### Step 7: 實作 YouTube API Mock (45 分鐘)

1. 建立 `tests/mocks/youtube-api.mock.ts`
2. 實作 OAuth Mock
3. 實作 Resumable Upload Mock
4. 測試完整上傳流程

### Step 8: 整合所有 Handlers (15 分鐘)

1. 更新 `handlers.ts`
2. 匯入所有 Mock
3. 測試 Server 可正常攔截請求

### Step 9: 建立測試輔助工具 (30 分鐘)

1. 建立 `test-helpers.ts`
2. 實作常用函數
3. 建立 `mock-data.ts`
4. 準備測試資料

### Step 10: 準備 Fixtures (15 分鐘)

1. 準備測試圖片
2. 準備測試文字
3. 驗證檔案可正常讀取

---

## 完整程式碼骨架

### tests/mocks/gemini-api.mock.ts

```typescript
import { http, HttpResponse } from 'msw'

export const geminiApiMock = [
  // 成功回應
  http.post('https://generativelanguage.googleapis.com/v1/models/:model:generateContent', 
    async ({ params, request }) => {
      const { model } = params
      
      await new Promise(resolve => setTimeout(resolve, 1500)) // 模擬延遲
      
      return HttpResponse.json({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                intro: {
                  text: "歡迎來到今天的影片,我們將探討一個有趣的話題。",
                  duration: 10
                },
                segments: Array.from({ length: 12 }, (_, i) => ({
                  index: i + 1,
                  text: `這是第 ${i + 1} 段內容,包含重要資訊。`,
                  duration: 15 + (i % 5),
                  image_description: `A detailed image for segment ${i + 1}`
                })),
                outro: {
                  text: "感謝您觀看本期影片,如果覺得有幫助請訂閱。",
                  duration: 10
                },
                metadata: {
                  title: "AI 自動生成的影片標題 | 深入探討核心概念",
                  description: "在本影片中,我們將深入探討...(完整描述約 200 字)",
                  tags: ["教學", "科技", "AI", "自動化"]
                },
                total_duration: 300
              })
            }]
          }
        }]
      })
    }
  ),

  // 錯誤: API Key 無效
  http.post('https://generativelanguage.googleapis.com/v1/models/:model:generateContent',
    async ({ request }) => {
      const authHeader = request.headers.get('Authorization')
      if (authHeader === 'Bearer invalid-key') {
        return HttpResponse.json(
          {
            error: {
              code: 401,
              message: 'API key not valid',
              status: 'UNAUTHENTICATED'
            }
          },
          { status: 401 }
        )
      }
    }
  ),
]
```

---

## 測試驗證

### 單元測試 Mock Server

**檔案:** `tests/mocks/__tests__/gemini-api.test.ts`

```typescript
import { server } from '../server'
import { http, HttpResponse } from 'msw'

describe('Gemini API Mock', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('應該回傳正確的腳本結構', async () => {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent',
      {
        method: 'POST',
        headers: { 'Authorization': 'Bearer test-key' },
        body: JSON.stringify({ contents: [] })
      }
    )

    const data = await response.json()
    const script = JSON.parse(data.candidates[0].content.parts[0].text)

    expect(script).toHaveProperty('intro')
    expect(script).toHaveProperty('segments')
    expect(script).toHaveProperty('outro')
    expect(script).toHaveProperty('metadata')
    expect(script.segments.length).toBeGreaterThan(10)
  })

  it('應該回傳 401 當 API Key 無效', async () => {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent',
      {
        method: 'POST',
        headers: { 'Authorization': 'Bearer invalid-key' },
      }
    )

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error.code).toBe(401)
  })
})
```

---

## 完成檢查清單

### Mock Server
- [ ] MSW Server 正確設定 (`server.ts`)
- [ ] Handlers 正確整合 (`handlers.ts`)
- [ ] Server 可攔截 HTTP 請求
- [ ] 自動清理機制運作正常

### Gemini API Mock
- [ ] 成功回應結構正確
- [ ] 包含 10-15 個段落
- [ ] 每段時長在 5-20 秒
- [ ] Metadata 完整
- [ ] 錯誤情境 (401, 429, 500) 正確
- [ ] 通過單元測試

### Stability AI Mock
- [ ] 圖片生成回應正確
- [ ] Base64 編碼正確
- [ ] 模擬延遲 (~2秒)
- [ ] Rate Limit 錯誤正確
- [ ] 通過單元測試

### D-ID API Mock
- [ ] 任務建立回傳 talk_id
- [ ] 輪詢機制正常 (2-3 次)
- [ ] 完成時回傳影片 URL
- [ ] 配額不足錯誤正確
- [ ] 通過單元測試

### YouTube API Mock
- [ ] OAuth Token 取得正確
- [ ] Resumable Upload 正常
- [ ] 影片 ID 正確回傳
- [ ] Metadata 正確設定
- [ ] 配額不足錯誤正確
- [ ] 通過單元測試

### 測試輔助工具
- [ ] `test-helpers.ts` 完整
- [ ] `mock-data.ts` 完整
- [ ] `assertions.ts` (如需要)
- [ ] 所有函數有 TypeScript 型別

### Fixtures
- [ ] test-image.png 準備完成 (1920x1080)
- [ ] test-logo.png 準備完成 (100x100)
- [ ] test-content.txt 準備完成 (600 字)
- [ ] 所有檔案可正常讀取

### 文件與品質
- [ ] 所有 Mock 檔案有清楚註解
- [ ] README 更新測試說明
- [ ] Commit 訊息清楚
- [ ] 程式碼符合 ESLint 規範

---

## 執行測試

```bash
# 執行 Mock 單元測試
npm test tests/mocks

# 確認所有 Mock 正常運作
npm test -- --testPathPattern=mocks

# 檢查 TypeScript 型別
npm run type-check
```

---

## 注意事項

### Mock 資料一致性
⚠️ 所有 Mock 回應必須符合真實 API 格式
⚠️ 定期更新 Mock 資料以匹配 API 變更
⚠️ 記錄 Mock 資料的來源與版本

### 測試穩定性
✅ 使用明確的等待條件,避免 `setTimeout`
✅ Mock 延遲設定合理 (1-3 秒)
✅ 錯誤情境完整覆蓋

### 效能考量
⚡ Mock 回應延遲應模擬真實情況
⚡ 避免過大的 Mock 資料
⚡ 測試執行時間應 < 2 分鐘

---

## 預估時間分配

- MSW Server 設定: 30 分鐘
- Gemini API Mock: 45 分鐘
- Stability AI Mock: 30 分鐘
- D-ID API Mock: 30 分鐘
- YouTube API Mock: 45 分鐘
- 測試輔助工具: 30 分鐘
- Fixtures 準備: 15 分鐘
- 測試驗證: 15 分鐘

**總計: 約 3 小時**

---

**準備好了嗎?** 開始建立完整的測試基礎設施! 🚀
