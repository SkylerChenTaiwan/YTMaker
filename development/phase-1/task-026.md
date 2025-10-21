# [v] Task-026: 系統設定頁面 (Page-11: System Settings)

> **建立日期:** 2025-10-19
> **狀態:** ✅ 已完成
> **預計時間:** 10 小時
> **優先級:** P0 (必須)

---

## 關聯文件

### 產品設計
- **頁面設計:** `product-design/pages.md#Page-11-系統設定頁`
- **使用者流程:** `product-design/flows.md#Flow-9-系統設定管理`
- **使用者流程:** `product-design/flows.md#Flow-0-步驟2-4`（首次設定可在此重新配置）

### 技術規格
- **頁面規格:** `tech-specs/frontend/pages.md#11-系統設定頁`
- **元件架構:** `tech-specs/frontend/component-architecture.md#SystemSettingsPage`
- **狀態管理:** `tech-specs/frontend/state-management.md#useAuthStore`
- **API 整合:** `tech-specs/frontend/api-integration.md`
- **後端 API:** `tech-specs/backend/api-system.md`

### 相關任務
- **前置任務:** Task-017 ✅ (前端路由), Task-018 ✅ (Zustand Stores), Task-019 ✅ (Axios 客戶端)
- **後續任務:** Task-029 (整合測試)
- **並行任務:** Task-020 (Setup 頁面), Task-021 (Dashboard)

---

## 任務目標

### 簡述
實作系統設定頁面，提供 API 金鑰管理、YouTube 授權管理、偏好設定三大功能區，支援 API 連線測試、配額顯示、多帳號管理、資料匯出匯入等完整系統設定功能。

### 成功標準
- [x] Tab 切換功能完成（API 金鑰、YouTube 授權、偏好設定）
- [x] API 金鑰 CRUD 功能完成（新增、編輯、測試、刪除）
- [x] API 配額顯示完成（D-ID、YouTube）
- [x] YouTube 授權管理完成（連結、重新授權、移除）
- [x] 偏好設定功能完成（一般、檔案、通知、資料管理）
- [x] 所有 Modal 元件完成（編輯、確認、資料匯出匯入）
- [x] 表單驗證完成（Zod）
- [x] 錯誤處理完成
- [x] 響應式設計完成
- [x] 單元測試完成

---

## 測試要求

### 單元測試

#### 測試 1：Tab 切換功能

**目的：** 驗證三個 Tab 的切換功能正常運作

**測試步驟：**
1. 渲染 SettingsPage
2. 預設顯示 Tab 1（API 金鑰）
3. 點擊 Tab 2（YouTube 授權）
4. 驗證顯示內容切換到 YouTube 授權
5. 點擊 Tab 3（偏好設定）
6. 驗證顯示內容切換到偏好設定

**預期結果：**
```typescript
// 測試代碼
describe('SettingsPage Tab 切換', () => {
  it('應該正確切換 Tab 並顯示對應內容', () => {
    render(<SettingsPage />)

    // 預設顯示 API 金鑰 Tab
    expect(screen.getByText('Google Gemini API')).toBeInTheDocument()

    // 點擊 YouTube 授權 Tab
    fireEvent.click(screen.getByText('YouTube 授權'))
    expect(screen.getByText('連結新的 YouTube 帳號')).toBeInTheDocument()

    // 點擊偏好設定 Tab
    fireEvent.click(screen.getByText('偏好設定'))
    expect(screen.getByText('預設語音性別')).toBeInTheDocument()
  })
})
```

**驗證點：**
- [ ] Tab 元件正確渲染
- [ ] 點擊 Tab 時切換內容
- [ ] Tab 高亮狀態正確顯示
- [ ] 切換 Tab 不影響表單狀態

---

#### 測試 2：API Key 新增與測試連線

**目的：** 驗證 API Key 可正確儲存並測試連線

**前置條件：**
- API 端點 `POST /api/v1/system/api-keys` 可用
- API 端點 `POST /api/v1/system/api-keys/test` 可用

**測試步驟：**
1. 點擊「編輯」按鈕開啟 Gemini API Key Modal
2. 輸入 API Key: "test-api-key-123"
3. 點擊「測試連線」
4. 驗證呼叫 API 測試端點
5. 回傳成功後顯示「✓ 連線成功」
6. 點擊「儲存」
7. 驗證呼叫儲存 API
8. 顯示成功 Toast 通知

**預期 API 請求：**
```json
// 測試連線 POST /api/v1/system/api-keys/test
{
  "provider": "gemini",
  "api_key": "test-api-key-123"
}

// 回應
{
  "success": true,
  "data": {
    "is_valid": true,
    "message": "連線成功"
  }
}

// 儲存 API Key POST /api/v1/system/api-keys
{
  "provider": "gemini",
  "api_key": "test-api-key-123"
}

// 回應
{
  "success": true,
  "message": "API Key 已儲存"
}
```

**驗證點：**
- [ ] Modal 正確開啟
- [ ] API Key 輸入框正常運作
- [ ] 測試連線呼叫正確 API
- [ ] 連線狀態正確顯示（未測試/測試中/成功/失敗)
- [ ] 儲存按鈕呼叫正確 API
- [ ] 成功後顯示 Toast 通知
- [ ] Modal 自動關閉
- [ ] API 列表更新顯示「✓ 已設定」

---

#### 測試 3：API Key 測試失敗處理

**目的：** 驗證 API Key 無效時的錯誤處理

**測試步驟：**
1. 開啟編輯 API Key Modal
2. 輸入無效的 API Key: "invalid-key"
3. 點擊「測試連線」
4. API 回傳失敗

**預期 API 回應：**
```json
POST /api/v1/system/api-keys/test
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "API Key 無效或已過期"
  }
}
```

**預期結果：**
- 顯示錯誤狀態：「✗ 連線失敗：API Key 無效或已過期」
- 「儲存」按鈕保持可用（允許儲存未測試的 key）
- 錯誤訊息以紅色顯示

**驗證點：**
- [ ] 錯誤訊息正確顯示
- [ ] 連線狀態顯示失敗
- [ ] 不會自動儲存
- [ ] 使用者可以重新測試或取消

---

#### 測試 4：API 配額顯示

**目的：** 驗證 API 配額正確顯示並警告配額不足

**前置條件：**
- API 端點 `GET /api/v1/system/api-keys` 回傳配額資訊

**測試資料：**
```json
GET /api/v1/system/api-keys
{
  "success": true,
  "data": {
    "api_keys": [
      {
        "provider": "did",
        "configured": true,
        "last_tested": "2025-10-19T10:30:00Z"
      },
      {
        "provider": "youtube",
        "configured": true,
        "last_tested": "2025-10-19T09:00:00Z"
      }
    ],
    "quotas": {
      "did": {
        "used_minutes": 75,
        "total_minutes": 90,
        "reset_date": "2025-11-01"
      },
      "youtube": {
        "used_units": 9500,
        "total_units": 10000,
        "reset_date": "2025-10-20"
      }
    }
  }
}
```

**預期顯示：**
```
API 配額：

D-ID：
[████████████████░░] 75 / 90 分鐘 (83%)
⚠️ 配額即將用盡，請注意使用

YouTube：
[████████████████████] 9,500 / 10,000 units (95%)
⚠️ 配額即將用盡，請注意使用
```

**驗證點：**
- [ ] 配額進度條正確顯示
- [ ] 百分比計算正確
- [ ] 配額 > 80% 顯示黃色警告
- [ ] 配額 > 90% 顯示紅色警告
- [ ] 重置日期正確顯示

---

#### 測試 5：YouTube 授權流程

**目的：** 驗證 YouTube OAuth 授權流程

**測試步驟：**
1. 點擊「連結新的 YouTube 帳號」按鈕
2. 觸發 OAuth 流程（開啟新視窗）
3. 模擬 OAuth 回調

**預期 API 流程：**
```javascript
// 1. 發起授權
POST /api/v1/youtube/auth/start
Response: {
  "success": true,
  "data": {
    "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?..."
  }
}

// 2. 開啟新視窗
window.open(auth_url)

// 3. OAuth 回調 (後端處理)
GET /api/v1/youtube/auth/callback?code=xxx&state=yyy

// 4. 前端輪詢或 WebSocket 接收授權成功
GET /api/v1/youtube/channels
Response: {
  "success": true,
  "data": {
    "channels": [
      {
        "id": "UCxxxxx",
        "name": "我的頻道",
        "thumbnail": "https://...",
        "subscriber_count": 10000,
        "authorized_at": "2025-10-19T10:45:00Z"
      }
    ]
  }
}
```

**驗證點：**
- [ ] 點擊按鈕觸發 API 調用
- [ ] 正確開啟 OAuth 視窗
- [ ] 授權成功後顯示頻道卡片
- [ ] 頻道資訊正確顯示（名稱、頭像、訂閱數）
- [ ] 顯示成功 Toast 通知

---

#### 測試 6：移除 YouTube 授權

**目的：** 驗證移除 YouTube 授權功能

**測試步驟：**
1. 點擊已連結頻道的「移除授權」按鈕
2. 顯示確認 Modal
3. 點擊「確認」
4. 調用刪除 API
5. 更新頻道列表

**預期 Modal 內容：**
```
標題：確認移除授權

確定要移除「我的頻道」的授權嗎？
移除後將無法上傳影片到此頻道，需重新授權。

[取消] [確認移除]
```

**預期 API 請求：**
```javascript
DELETE /api/v1/youtube/channels/{channel_id}

Response: {
  "success": true,
  "message": "授權已移除"
}
```

**驗證點：**
- [ ] 確認 Modal 正確顯示
- [ ] 取消按鈕關閉 Modal 不調用 API
- [ ] 確認按鈕調用刪除 API
- [ ] 成功後頻道卡片消失
- [ ] 顯示成功 Toast 通知

---

#### 測試 7：偏好設定儲存

**目的：** 驗證偏好設定可正確儲存

**測試步驟：**
1. 修改預設語音性別為「女聲」
2. 調整預設語速為 1.2x
3. 修改隱私設定為「不公開」
4. 修改專案保留時間為「30 天後刪除」
5. 勾選「是否保留中間素材」
6. 點擊「儲存變更」

**預期 API 請求：**
```json
POST /api/v1/system/preferences
{
  "voice_gender": "female",
  "voice_speed": 1.2,
  "default_privacy": "unlisted",
  "project_retention_days": 30,
  "keep_intermediate_files": true,
  "notification_on_complete": true,
  "notification_on_error": true
}

Response: {
  "success": true,
  "message": "設定已儲存"
}
```

**驗證點：**
- [ ] 表單欄位正確綁定
- [ ] 滑桿數值正確更新
- [ ] 下拉選單正確選擇
- [ ] 勾選框狀態正確
- [ ] 儲存按鈕調用 API
- [ ] 成功後顯示 Toast 通知
- [ ] Store 狀態更新

---

#### 測試 8：清除所有專案資料（危險操作）

**目的：** 驗證危險操作的確認流程

**測試步驟：**
1. 點擊「清除所有專案資料」按鈕
2. 顯示確認 Modal
3. 輸入框為空，「確認刪除」按鈕禁用
4. 輸入 "DELETE ALL"
5. 「確認刪除」按鈕啟用
6. 點擊確認

**預期 Modal：**
```
標題：確認清除所有專案資料

⚠️ 此操作將刪除所有專案、影片檔案和中間素材，且無法復原！

請輸入 "DELETE ALL" 以確認：
[____________]

[取消] [確認刪除]（禁用，直到輸入正確）
```

**預期 API 請求：**
```javascript
DELETE /api/v1/system/data

Response: {
  "success": true,
  "message": "所有資料已清除"
}
```

**驗證點：**
- [ ] 確認文字必須完全匹配 "DELETE ALL"
- [ ] 匹配前「確認刪除」按鈕禁用
- [ ] 匹配後按鈕啟用
- [ ] 調用 API 成功後清空 Store
- [ ] 顯示成功 Toast 通知
- [ ] Modal 關閉

---

#### 測試 9：資料匯出功能

**目的：** 驗證專案資料匯出功能

**測試步驟：**
1. 點擊「匯出所有專案資料」按鈕
2. 調用 API 取得資料
3. 生成 JSON 檔案
4. 觸發瀏覽器下載

**預期 API 請求：**
```javascript
GET /api/v1/system/export

Response: {
  "success": true,
  "data": {
    "export_date": "2025-10-19T12:00:00Z",
    "projects": [...],
    "configurations": [...],
    "templates": [...]
  }
}
```

**預期下載檔案：**
- 檔名格式：`ytmaker-export-2025-10-19.json`
- 內容為完整的專案資料 JSON

**驗證點：**
- [ ] 點擊按鈕觸發 API 調用
- [ ] 成功取得資料
- [ ] 生成 JSON 檔案
- [ ] 檔名包含當前日期
- [ ] 瀏覽器觸發下載
- [ ] 顯示成功 Toast 通知

---

#### 測試 10：資料匯入功能

**目的：** 驗證專案資料匯入功能

**測試步驟：**
1. 點擊「匯入專案資料」按鈕
2. 顯示檔案選擇器
3. 選擇有效的 JSON 檔案
4. 驗證檔案格式
5. 調用匯入 API
6. 顯示成功訊息

**測試資料（JSON 檔案）：**
```json
{
  "export_date": "2025-10-18T12:00:00Z",
  "projects": [
    {
      "id": "proj-001",
      "name": "測試專案",
      "status": "completed"
    }
  ],
  "configurations": [],
  "templates": []
}
```

**預期 API 請求：**
```javascript
POST /api/v1/system/import
Content-Type: multipart/form-data

Response: {
  "success": true,
  "data": {
    "imported_projects": 1,
    "imported_configurations": 0,
    "imported_templates": 0
  }
}
```

**驗證點：**
- [ ] 檔案選擇器正確開啟
- [ ] 只接受 .json 檔案
- [ ] 驗證 JSON 格式正確
- [ ] 調用匯入 API
- [ ] 成功後更新 Store
- [ ] 顯示匯入統計（X 個專案、Y 個配置等）
- [ ] 顯示成功 Toast 通知

---

### 整合測試

#### 測試 11：完整設定流程（E2E）

**目的：** 驗證完整的系統設定流程

**測試步驟：**
1. 導航到 `/settings`
2. Tab 1: 設定三個 API Key（Gemini, Stability AI, D-ID）並測試連線
3. Tab 2: 連結 YouTube 帳號
4. Tab 3: 修改偏好設定並儲存
5. 離開頁面並重新進入
6. 驗證所有設定已保存

**驗證點：**
- [ ] 所有 API Key 成功儲存並測試
- [ ] YouTube 帳號成功連結
- [ ] 偏好設定成功儲存
- [ ] 重新載入後設定仍然存在
- [ ] Store 狀態與 API 狀態一致

---

## 實作規格

### 需要建立/修改的檔案

#### 1. 主頁面元件：`frontend/app/settings/page.tsx`

**職責：** 系統設定頁面主元件

**結構：**

```tsx
// frontend/app/settings/page.tsx
'use client'

import { useState } from 'react'
import { Tabs } from '@/components/ui/Tabs'
import { APIKeysTab } from '@/components/settings/APIKeysTab'
import { YouTubeAuthTab } from '@/components/settings/YouTubeAuthTab'
import { PreferencesTab } from '@/components/settings/PreferencesTab'
import { AppLayout } from '@/components/layout/AppLayout'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'api-keys' | 'youtube' | 'preferences'>('api-keys')

  const tabs = [
    { key: 'api-keys', label: 'API 金鑰' },
    { key: 'youtube', label: 'YouTube 授權' },
    { key: 'preferences', label: '偏好設定' },
  ]

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">系統設定</h1>

        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(key) => setActiveTab(key as any)}
        />

        <div className="mt-6">
          {activeTab === 'api-keys' && <APIKeysTab />}
          {activeTab === 'youtube' && <YouTubeAuthTab />}
          {activeTab === 'preferences' && <PreferencesTab />}
        </div>
      </div>
    </AppLayout>
  )
}
```

---

#### 2. API Keys Tab：`frontend/components/settings/APIKeysTab.tsx`

**職責：** API 金鑰管理 Tab

**結構：**

```tsx
// frontend/components/settings/APIKeysTab.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Table } from '@/components/ui/Table'
import { Modal } from '@/components/ui/Modal'
import { EditAPIKeyModal } from './EditAPIKeyModal'
import { useAuthStore } from '@/stores/authStore'
import { systemApi } from '@/lib/api/system'
import { toast } from '@/lib/toast'
import type { APIProvider } from '@/types/system'

export const APIKeysTab = () => {
  const { apiKeys, quotas, fetchAPIKeys, fetchQuotas } = useAuthStore()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<APIProvider | null>(null)

  useEffect(() => {
    fetchAPIKeys()
    fetchQuotas()
  }, [fetchAPIKeys, fetchQuotas])

  const handleEdit = (provider: APIProvider) => {
    setEditingProvider(provider)
    setIsEditModalOpen(true)
  }

  const handleTest = async (provider: APIProvider) => {
    try {
      const result = await systemApi.testAPIKey(provider, apiKeys[provider])
      if (result.is_valid) {
        toast.success('連線成功')
      } else {
        toast.error('連線失敗')
      }
    } catch (error) {
      toast.error('測試失敗')
    }
  }

  const handleDelete = async (provider: APIProvider) => {
    if (!confirm('確定要刪除此 API Key 嗎？')) return

    try {
      await systemApi.deleteAPIKey(provider)
      toast.success('API Key 已刪除')
      fetchAPIKeys()
    } catch (error) {
      toast.error('刪除失敗')
    }
  }

  const apiKeyRows = [
    {
      service: 'Google Gemini API',
      provider: 'gemini' as APIProvider,
      status: apiKeys.gemini ? '✓ 已設定' : '✗ 未設定',
      lastTested: apiKeys.geminiLastTested || '-',
    },
    {
      service: 'Stability AI API',
      provider: 'stability_ai' as APIProvider,
      status: apiKeys.stability_ai ? '✓ 已設定' : '✗ 未設定',
      lastTested: apiKeys.stabilityAILastTested || '-',
    },
    {
      service: 'D-ID API',
      provider: 'did' as APIProvider,
      status: apiKeys.did ? '✓ 已設定' : '✗ 未設定',
      lastTested: apiKeys.didLastTested || '-',
    },
  ]

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">API 金鑰</h2>

      {/* API 金鑰列表 */}
      <Table
        columns={[
          { key: 'service', label: 'API 服務' },
          { key: 'status', label: '狀態' },
          { key: 'lastTested', label: '最後測試時間' },
          { key: 'actions', label: '操作', width: '200px' },
        ]}
        data={apiKeyRows}
        renderCell={(row, column) => {
          if (column.key === 'actions') {
            return (
              <div className="flex gap-2">
                <Button size="small" onClick={() => handleEdit(row.provider)}>
                  編輯
                </Button>
                <Button size="small" onClick={() => handleTest(row.provider)}>
                  測試連線
                </Button>
                {apiKeys[row.provider] && (
                  <Button
                    size="small"
                    type="danger"
                    onClick={() => handleDelete(row.provider)}
                  >
                    刪除
                  </Button>
                )}
              </div>
            )
          }
          return row[column.key]
        }}
      />

      {/* API 配額顯示 */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">API 配額</h3>

        {quotas.did && (
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span>D-ID</span>
              <span>{quotas.did.used_minutes} / {quotas.did.total_minutes} 分鐘</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full ${
                  quotas.did.usage_percent > 90
                    ? 'bg-red-500'
                    : quotas.did.usage_percent > 80
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${quotas.did.usage_percent}%` }}
              />
            </div>
            {quotas.did.usage_percent > 80 && (
              <p className="text-yellow-600 text-sm mt-1">
                ⚠️ 配額即將用盡，請注意使用
              </p>
            )}
          </div>
        )}

        {quotas.youtube && (
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span>YouTube</span>
              <span>
                {quotas.youtube.used_units.toLocaleString()} /{' '}
                {quotas.youtube.total_units.toLocaleString()} units
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full ${
                  quotas.youtube.usage_percent > 90
                    ? 'bg-red-500'
                    : quotas.youtube.usage_percent > 80
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${quotas.youtube.usage_percent}%` }}
              />
            </div>
            {quotas.youtube.usage_percent > 80 && (
              <p className="text-yellow-600 text-sm mt-1">
                ⚠️ 配額即將用盡，請注意使用
              </p>
            )}
          </div>
        )}
      </div>

      {/* 編輯 API Key Modal */}
      {isEditModalOpen && editingProvider && (
        <EditAPIKeyModal
          provider={editingProvider}
          currentKey={apiKeys[editingProvider]}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingProvider(null)
          }}
          onSave={() => {
            setIsEditModalOpen(false)
            setEditingProvider(null)
            fetchAPIKeys()
          }}
        />
      )}
    </div>
  )
}
```

---

#### 3. Edit API Key Modal：`frontend/components/settings/EditAPIKeyModal.tsx`

**職責：** 編輯 API Key 的 Modal 元件

```tsx
// frontend/components/settings/EditAPIKeyModal.tsx
'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { systemApi } from '@/lib/api/system'
import { toast } from '@/lib/toast'
import type { APIProvider } from '@/types/system'

interface Props {
  provider: APIProvider
  currentKey?: string
  onClose: () => void
  onSave: () => void
}

export const EditAPIKeyModal = ({ provider, currentKey, onClose, onSave }: Props) => {
  const [apiKey, setApiKey] = useState(currentKey || '')
  const [showKey, setShowKey] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const providerNames = {
    gemini: 'Google Gemini',
    stability_ai: 'Stability AI',
    did: 'D-ID',
  }

  const handleTest = async () => {
    if (!apiKey.trim()) {
      toast.error('請輸入 API Key')
      return
    }

    setTestStatus('testing')
    try {
      const result = await systemApi.testAPIKey(provider, apiKey)
      if (result.is_valid) {
        setTestStatus('success')
        setTestMessage('連線成功')
      } else {
        setTestStatus('error')
        setTestMessage(result.message || '連線失敗')
      }
    } catch (error: any) {
      setTestStatus('error')
      setTestMessage(error.message || 'API Key 無效或已過期')
    }
  }

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error('請輸入 API Key')
      return
    }

    setIsSaving(true)
    try {
      await systemApi.saveAPIKey(provider, apiKey)
      toast.success('API Key 已儲存')
      onSave()
    } catch (error) {
      toast.error('儲存失敗')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      title={`編輯 ${providerNames[provider]} API Key`}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="secondary" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave} loading={isSaving}>
            儲存
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          請輸入您的 {providerNames[provider]} API Key
        </p>

        <div className="relative">
          <Input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="輸入 API Key"
          />
          <button
            type="button"
            className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
            onClick={() => setShowKey(!showKey)}
          >
            {showKey ? '隱藏' : '顯示'}
          </button>
        </div>

        <Button
          type="secondary"
          onClick={handleTest}
          loading={testStatus === 'testing'}
          disabled={!apiKey.trim()}
        >
          測試連線
        </Button>

        {testStatus === 'success' && (
          <p className="text-green-600 text-sm">✓ {testMessage}</p>
        )}
        {testStatus === 'error' && (
          <p className="text-red-600 text-sm">✗ {testMessage}</p>
        )}
      </div>
    </Modal>
  )
}
```

---

#### 4. YouTube Auth Tab：`frontend/components/settings/YouTubeAuthTab.tsx`

**職責：** YouTube 授權管理 Tab

```tsx
// frontend/components/settings/YouTubeAuthTab.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { YouTubeChannelCard } from './YouTubeChannelCard'
import { useAuthStore } from '@/stores/authStore'
import { youtubeApi } from '@/lib/api/youtube'
import { toast } from '@/lib/toast'

export const YouTubeAuthTab = () => {
  const { youtubeChannels, fetchYouTubeChannels } = useAuthStore()
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    fetchYouTubeChannels()
  }, [fetchYouTubeChannels])

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const { auth_url } = await youtubeApi.startAuth()

      // 開啟 OAuth 視窗
      const authWindow = window.open(auth_url, 'YouTube Authorization', 'width=600,height=700')

      // 輪詢檢查授權是否完成
      const checkAuth = setInterval(async () => {
        if (authWindow?.closed) {
          clearInterval(checkAuth)
          setIsConnecting(false)
          // 重新取得頻道列表
          fetchYouTubeChannels()
        }
      }, 1000)
    } catch (error) {
      toast.error('授權失敗')
      setIsConnecting(false)
    }
  }

  const handleRemove = async (channelId: string) => {
    if (!confirm('確定要移除此頻道的授權嗎？')) return

    try {
      await youtubeApi.removeChannel(channelId)
      toast.success('授權已移除')
      fetchYouTubeChannels()
    } catch (error) {
      toast.error('移除失敗')
    }
  }

  const handleReauthorize = async (channelId: string) => {
    // 重新授權與連結新帳號流程相同
    handleConnect()
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">YouTube 授權</h2>

      <p className="text-gray-600 mb-6">
        您可以連結多個 YouTube 帳號，在生成影片時選擇要上傳的頻道
      </p>

      {/* 已連結帳號 */}
      {youtubeChannels.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {youtubeChannels.map((channel) => (
            <YouTubeChannelCard
              key={channel.id}
              channel={channel}
              onRemove={handleRemove}
              onReauthorize={handleReauthorize}
            />
          ))}
        </div>
      )}

      {/* 連結新帳號 */}
      <Button
        type="primary"
        size="large"
        onClick={handleConnect}
        loading={isConnecting}
      >
        連結新的 YouTube 帳號
      </Button>
    </div>
  )
}
```

---

#### 5. YouTube Channel Card：`frontend/components/settings/YouTubeChannelCard.tsx`

**職責：** YouTube 頻道卡片元件

```tsx
// frontend/components/settings/YouTubeChannelCard.tsx
import { Button } from '@/components/ui/Button'
import type { YouTubeChannel } from '@/types/youtube'

interface Props {
  channel: YouTubeChannel
  onRemove: (channelId: string) => void
  onReauthorize: (channelId: string) => void
}

export const YouTubeChannelCard = ({ channel, onRemove, onReauthorize }: Props) => {
  const isExpired = channel.auth_status === 'expired'

  return (
    <div className="border rounded-lg p-4 flex items-start gap-4">
      {/* 頻道頭像 */}
      <img
        src={channel.thumbnail}
        alt={channel.name}
        className="w-16 h-16 rounded-full"
      />

      {/* 頻道資訊 */}
      <div className="flex-1">
        <h3 className="font-semibold text-lg">{channel.name}</h3>
        <p className="text-sm text-gray-600">
          訂閱數：{channel.subscriber_count.toLocaleString()}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {isExpired ? (
            <span className="text-yellow-600">✗ 授權已過期</span>
          ) : (
            <span className="text-green-600">✓ 已授權</span>
          )}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          授權時間：{new Date(channel.authorized_at).toLocaleString('zh-TW')}
        </p>
      </div>

      {/* 操作按鈕 */}
      <div className="flex flex-col gap-2">
        {isExpired && (
          <Button size="small" onClick={() => onReauthorize(channel.id)}>
            重新授權
          </Button>
        )}
        <Button
          size="small"
          type="danger"
          onClick={() => onRemove(channel.id)}
        >
          移除授權
        </Button>
      </div>
    </div>
  )
}
```

---

#### 6. Preferences Tab：`frontend/components/settings/PreferencesTab.tsx`

**職責：** 偏好設定 Tab

```tsx
// frontend/components/settings/PreferencesTab.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { Slider } from '@/components/ui/Slider'
import { Modal } from '@/components/ui/Modal'
import { systemApi } from '@/lib/api/system'
import { toast } from '@/lib/toast'
import type { Preferences } from '@/types/system'

export const PreferencesTab = () => {
  const [preferences, setPreferences] = useState<Preferences>({
    voice_gender: 'male',
    voice_speed: 1.0,
    default_privacy: 'public',
    project_retention_days: -1, // -1 表示永久保留
    keep_intermediate_files: true,
    notification_on_complete: true,
    notification_on_error: true,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [showClearDataModal, setShowClearDataModal] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      const data = await systemApi.getPreferences()
      setPreferences(data)
    } catch (error) {
      toast.error('載入設定失敗')
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await systemApi.savePreferences(preferences)
      toast.success('設定已儲存')
    } catch (error) {
      toast.error('儲存失敗')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClearCache = async () => {
    if (!confirm('確定要清除所有快取嗎？')) return

    try {
      await systemApi.clearCache()
      toast.success('快取已清除')
    } catch (error) {
      toast.error('清除失敗')
    }
  }

  const handleExport = async () => {
    try {
      const data = await systemApi.exportData()

      // 生成 JSON 檔案並下載
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ytmaker-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)

      toast.success('資料已匯出')
    } catch (error) {
      toast.error('匯出失敗')
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await systemApi.importData(formData)
      toast.success(
        `匯入成功：${result.imported_projects} 個專案、${result.imported_configurations} 個配置`
      )

      // 重新載入設定
      loadPreferences()
    } catch (error) {
      toast.error('匯入失敗')
    }
  }

  const handleResetSettings = async () => {
    if (!confirm('確定要重置所有設定為預設值嗎？')) return

    try {
      await systemApi.resetSettings()
      toast.success('設定已重置')
      loadPreferences()
    } catch (error) {
      toast.error('重置失敗')
    }
  }

  const handleClearAllData = async () => {
    if (confirmText !== 'DELETE ALL') {
      toast.error('請輸入正確的確認文字')
      return
    }

    try {
      await systemApi.clearAllData()
      toast.success('所有資料已清除')
      setShowClearDataModal(false)
      setConfirmText('')
    } catch (error) {
      toast.error('清除失敗')
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">偏好設定</h2>

      {/* 一般設定 */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">一般設定</h3>

        <div className="space-y-4">
          <div>
            <label className="block mb-2">預設語音性別</label>
            <Select
              value={preferences.voice_gender}
              onChange={(value) =>
                setPreferences({ ...preferences, voice_gender: value as 'male' | 'female' })
              }
              options={[
                { value: 'male', label: '男聲' },
                { value: 'female', label: '女聲' },
              ]}
            />
          </div>

          <div>
            <label className="block mb-2">預設語速：{preferences.voice_speed}x</label>
            <Slider
              min={0.5}
              max={2.0}
              step={0.1}
              value={preferences.voice_speed}
              onChange={(value) =>
                setPreferences({ ...preferences, voice_speed: value })
              }
            />
          </div>

          <div>
            <label className="block mb-2">預設隱私設定</label>
            <Select
              value={preferences.default_privacy}
              onChange={(value) =>
                setPreferences({
                  ...preferences,
                  default_privacy: value as 'public' | 'unlisted' | 'private',
                })
              }
              options={[
                { value: 'public', label: '公開' },
                { value: 'unlisted', label: '不公開' },
                { value: 'private', label: '私人' },
              ]}
            />
          </div>
        </div>
      </section>

      {/* 檔案管理 */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">檔案管理</h3>

        <div className="space-y-4">
          <div>
            <label className="block mb-2">專案檔案保留時間</label>
            <Select
              value={String(preferences.project_retention_days)}
              onChange={(value) =>
                setPreferences({
                  ...preferences,
                  project_retention_days: Number(value),
                })
              }
              options={[
                { value: '-1', label: '永久保留' },
                { value: '30', label: '30 天後刪除' },
                { value: '7', label: '7 天後刪除' },
              ]}
            />
          </div>

          <div>
            <Checkbox
              checked={preferences.keep_intermediate_files}
              onChange={(checked) =>
                setPreferences({ ...preferences, keep_intermediate_files: checked })
              }
              label="保留中間素材（圖片、音訊、片段等）"
            />
          </div>
        </div>
      </section>

      {/* 通知設定 */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">通知設定</h3>

        <div className="space-y-2">
          <Checkbox
            checked={preferences.notification_on_complete}
            onChange={(checked) =>
              setPreferences({ ...preferences, notification_on_complete: checked })
            }
            label="影片生成完成時顯示系統通知"
          />
          <Checkbox
            checked={preferences.notification_on_error}
            onChange={(checked) =>
              setPreferences({ ...preferences, notification_on_error: checked })
            }
            label="發生錯誤時顯示通知"
          />
        </div>
      </section>

      {/* 資料管理 */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-4">資料管理</h3>

        <div className="space-y-2">
          <Button type="secondary" onClick={handleClearCache}>
            清除所有快取
          </Button>
          <Button type="secondary" onClick={handleExport}>
            匯出所有專案資料
          </Button>
          <div>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="import-file"
            />
            <Button
              type="secondary"
              onClick={() => document.getElementById('import-file')?.click()}
            >
              匯入專案資料
            </Button>
          </div>
        </div>
      </section>

      {/* 危險區域 */}
      <section className="mb-8 border-2 border-red-300 rounded-lg p-4 bg-red-50">
        <h3 className="text-lg font-semibold mb-4 text-red-700">危險區域</h3>

        <div className="space-y-2">
          <Button type="danger" onClick={handleResetSettings}>
            重置所有設定
          </Button>
          <Button type="danger" onClick={() => setShowClearDataModal(true)}>
            清除所有專案資料
          </Button>
        </div>
      </section>

      {/* 儲存按鈕 */}
      <div className="flex justify-end">
        <Button type="primary" onClick={handleSave} loading={isSaving}>
          儲存變更
        </Button>
      </div>

      {/* 清除資料確認 Modal */}
      {showClearDataModal && (
        <Modal
          title="確認清除所有專案資料"
          onClose={() => {
            setShowClearDataModal(false)
            setConfirmText('')
          }}
          footer={
            <div className="flex justify-end gap-2">
              <Button
                type="secondary"
                onClick={() => {
                  setShowClearDataModal(false)
                  setConfirmText('')
                }}
              >
                取消
              </Button>
              <Button
                type="danger"
                onClick={handleClearAllData}
                disabled={confirmText !== 'DELETE ALL'}
              >
                確認刪除
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-red-600 font-semibold flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              此操作將刪除所有專案、影片檔案和中間素材，且無法復原！
            </p>

            <div>
              <label className="block mb-2">
                請輸入 <code className="bg-gray-200 px-2 py-1 rounded">DELETE ALL</code> 以確認：
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE ALL"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
```

---

#### 7. API 服務層：`frontend/lib/api/system.ts`

**職責：** 系統 API 調用

```typescript
// frontend/lib/api/system.ts
import { apiClient } from './client'
import type { APIProvider, Preferences } from '@/types/system'

export const systemApi = {
  // API Keys
  async getAPIKeys() {
    const res = await apiClient.get('/api/v1/system/api-keys')
    return res.data.data
  },

  async saveAPIKey(provider: APIProvider, apiKey: string) {
    const res = await apiClient.post('/api/v1/system/api-keys', {
      provider,
      api_key: apiKey,
    })
    return res.data
  },

  async testAPIKey(provider: APIProvider, apiKey: string) {
    const res = await apiClient.post('/api/v1/system/api-keys/test', {
      provider,
      api_key: apiKey,
    })
    return res.data.data
  },

  async deleteAPIKey(provider: APIProvider) {
    const res = await apiClient.delete(`/api/v1/system/api-keys/${provider}`)
    return res.data
  },

  // Quotas
  async getQuotas() {
    const res = await apiClient.get('/api/v1/system/quotas')
    return res.data.data
  },

  // Preferences
  async getPreferences(): Promise<Preferences> {
    const res = await apiClient.get('/api/v1/system/preferences')
    return res.data.data
  },

  async savePreferences(preferences: Preferences) {
    const res = await apiClient.post('/api/v1/system/preferences', preferences)
    return res.data
  },

  // Data Management
  async clearCache() {
    const res = await apiClient.post('/api/v1/system/cache/clear')
    return res.data
  },

  async exportData() {
    const res = await apiClient.get('/api/v1/system/export')
    return res.data.data
  },

  async importData(formData: FormData) {
    const res = await apiClient.post('/api/v1/system/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return res.data.data
  },

  async resetSettings() {
    const res = await apiClient.post('/api/v1/system/reset')
    return res.data
  },

  async clearAllData() {
    const res = await apiClient.delete('/api/v1/system/data')
    return res.data
  },
}
```

---

#### 8. 類型定義：`frontend/types/system.ts`

**職責：** 系統相關類型定義

```typescript
// frontend/types/system.ts
export type APIProvider = 'gemini' | 'stability_ai' | 'did'

export interface APIKeyInfo {
  provider: APIProvider
  configured: boolean
  last_tested?: string
}

export interface Quota {
  used_minutes?: number
  total_minutes?: number
  used_units?: number
  total_units?: number
  usage_percent: number
  reset_date: string
}

export interface Quotas {
  did?: Quota
  youtube?: Quota
}

export interface Preferences {
  voice_gender: 'male' | 'female'
  voice_speed: number
  default_privacy: 'public' | 'unlisted' | 'private'
  project_retention_days: number // -1 表示永久保留
  keep_intermediate_files: boolean
  notification_on_complete: boolean
  notification_on_error: boolean
}

export interface ExportData {
  export_date: string
  projects: any[]
  configurations: any[]
  templates: any[]
}

export interface ImportResult {
  imported_projects: number
  imported_configurations: number
  imported_templates: number
}
```

---

#### 9. Auth Store 擴充：`frontend/stores/authStore.ts`（部分）

**職責：** 添加 API Keys 和 YouTube 授權相關狀態

```typescript
// frontend/stores/authStore.ts (擴充部分)
interface AuthState {
  // API Keys
  apiKeys: {
    gemini?: string
    stability_ai?: string
    did?: string
    geminiLastTested?: string
    stabilityAILastTested?: string
    didLastTested?: string
  }

  // Quotas
  quotas: {
    did?: Quota
    youtube?: Quota
  }

  // YouTube Channels
  youtubeChannels: YouTubeChannel[]

  // Actions
  fetchAPIKeys: () => Promise<void>
  fetchQuotas: () => Promise<void>
  fetchYouTubeChannels: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  apiKeys: {},
  quotas: {},
  youtubeChannels: [],

  fetchAPIKeys: async () => {
    try {
      const data = await systemApi.getAPIKeys()
      set({ apiKeys: data })
    } catch (error) {
      console.error('Failed to fetch API keys', error)
    }
  },

  fetchQuotas: async () => {
    try {
      const data = await systemApi.getQuotas()
      set({ quotas: data })
    } catch (error) {
      console.error('Failed to fetch quotas', error)
    }
  },

  fetchYouTubeChannels: async () => {
    try {
      const data = await youtubeApi.getChannels()
      set({ youtubeChannels: data })
    } catch (error) {
      console.error('Failed to fetch YouTube channels', error)
    }
  },
}))
```

---

#### 10. 測試檔案：`frontend/__tests__/pages/settings.test.tsx`

**職責：** SettingsPage 單元測試

```typescript
// frontend/__tests__/pages/settings.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import SettingsPage from '@/app/settings/page'
import { systemApi } from '@/lib/api/system'
import { youtubeApi } from '@/lib/api/youtube'

jest.mock('@/lib/api/system')
jest.mock('@/lib/api/youtube')

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('應該正確切換 Tab', () => {
    render(<SettingsPage />)

    // 預設顯示 API 金鑰 Tab
    expect(screen.getByText('Google Gemini API')).toBeInTheDocument()

    // 點擊 YouTube 授權 Tab
    fireEvent.click(screen.getByText('YouTube 授權'))
    expect(screen.getByText('連結新的 YouTube 帳號')).toBeInTheDocument()

    // 點擊偏好設定 Tab
    fireEvent.click(screen.getByText('偏好設定'))
    expect(screen.getByText('預設語音性別')).toBeInTheDocument()
  })

  it('應該正確儲存 API Key', async () => {
    ;(systemApi.testAPIKey as jest.Mock).mockResolvedValue({
      is_valid: true,
      message: '連線成功',
    })
    ;(systemApi.saveAPIKey as jest.Mock).mockResolvedValue({
      success: true,
    })

    render(<SettingsPage />)

    // 點擊編輯按鈕
    const editButtons = screen.getAllByText('編輯')
    fireEvent.click(editButtons[0])

    // 輸入 API Key
    const input = screen.getByPlaceholderText('輸入 API Key')
    fireEvent.change(input, { target: { value: 'test-api-key-123' } })

    // 點擊測試連線
    fireEvent.click(screen.getByText('測試連線'))

    await waitFor(() => {
      expect(systemApi.testAPIKey).toHaveBeenCalledWith('gemini', 'test-api-key-123')
    })

    // 點擊儲存
    fireEvent.click(screen.getByText('儲存'))

    await waitFor(() => {
      expect(systemApi.saveAPIKey).toHaveBeenCalledWith('gemini', 'test-api-key-123')
    })
  })

  it('應該顯示配額警告', async () => {
    ;(systemApi.getQuotas as jest.Mock).mockResolvedValue({
      did: {
        used_minutes: 85,
        total_minutes: 90,
        usage_percent: 94.4,
        reset_date: '2025-11-01',
      },
    })

    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText(/配額即將用盡/)).toBeInTheDocument()
    })
  })
})
```

---

## 開發指引

### TDD 開發流程

#### 第 1 步：環境準備（10 分鐘）
1. 確認 Task-017, 018, 019 已完成
2. 確認 Zustand store 和 API 客戶端可用
3. 確認後端 System API 可用
4. 閱讀 `product-design/pages.md#Page-11` 和 `tech-specs/frontend/pages.md#11`

#### 第 2 步：建立基礎架構（30 分鐘）
1. 建立 `app/settings/page.tsx` - 主頁面
2. 建立 Tab 切換邏輯
3. 建立三個 Tab 骨架元件
4. 撰寫測試 1（Tab 切換）→ 執行 → 通過 ✅

#### 第 3 步：實作 API Keys Tab（120 分鐘）
1. 撰寫測試 2（API Key 新增與測試）
2. 實作 `APIKeysTab.tsx`
3. 實作 `EditAPIKeyModal.tsx`
4. 撰寫測試 3（測試失敗處理）
5. 實作錯誤處理邏輯
6. 撰寫測試 4（配額顯示）
7. 實作配額進度條和警告
8. 執行所有測試 → 通過 ✅

#### 第 4 步：實作 YouTube Auth Tab（90 分鐘）
1. 撰寫測試 5（YouTube 授權流程）
2. 實作 `YouTubeAuthTab.tsx`
3. 實作 `YouTubeChannelCard.tsx`
4. 實作 OAuth 流程邏輯
5. 撰寫測試 6（移除授權）
6. 實作移除授權功能
7. 執行所有測試 → 通過 ✅

#### 第 5 步：實作 Preferences Tab（120 分鐘）
1. 撰寫測試 7（偏好設定儲存）
2. 實作 `PreferencesTab.tsx`
3. 實作所有表單欄位
4. 撰寫測試 8（清除資料）
5. 實作危險操作確認流程
6. 撰寫測試 9（資料匯出）
7. 撰寫測試 10（資料匯入）
8. 實作匯出匯入功能
9. 執行所有測試 → 通過 ✅

#### 第 6 步：API 整合層（60 分鐘）
1. 實作 `lib/api/system.ts`
2. 建立所有 API 方法
3. 實作類型定義 `types/system.ts`
4. 擴充 `authStore.ts`
5. 測試 API 調用

#### 第 7 步：整合測試（60 分鐘）
1. 撰寫測試 11（完整 E2E 流程）
2. 執行完整流程測試
3. 修正發現的問題
4. 執行所有測試 → 通過 ✅

#### 第 8 步：響應式設計與優化（60 分鐘）
1. 實作桌面版 (≥1024px)
2. 實作平板版 (768-1023px)
3. 實作手機版 (<768px)
4. 測試不同螢幕尺寸
5. 優化載入效能

#### 第 9 步：文件與檢查（30 分鐘）
1. 檢查所有元件 PropTypes/TypeScript
2. 執行 ESLint：`npm run lint`
3. 執行 TypeScript 檢查：`npm run type-check`
4. 檢查測試覆蓋率：`npm run test:coverage`
5. 更新 README（如需要）

---

### 注意事項

#### 安全性
- ⚠️ API Key 必須使用 password 類型輸入框
- ⚠️ API Key 儲存必須加密（後端負責）
- ⚠️ 危險操作必須二次確認
- ⚠️ 清除資料必須輸入確認文字

#### 使用者體驗
- 💡 測試 API Key 時顯示載入狀態
- 💡 操作成功後顯示 Toast 通知
- 💡 配額 > 80% 顯示警告
- 💡 OAuth 視窗關閉後自動更新頻道列表

#### 響應式設計
- ✅ Tab 在手機版改為下拉選單
- ✅ API 列表在手機版改為卡片顯示
- ✅ YouTube 頻道卡片在平板/手機版單欄顯示
- ✅ Modal 在手機版全螢幕顯示

#### 測試
- ✅ Mock 所有 API 調用
- ✅ 測試成功和失敗情境
- ✅ 測試表單驗證
- ✅ 測試 Modal 互動
- ✅ 測試 Tab 切換

---

### 完成檢查清單

#### 功能完整性
- [ ] Tab 切換功能正常
- [ ] API Key CRUD 功能完成
- [ ] API 連線測試功能正常
- [ ] API 配額顯示正確
- [ ] YouTube OAuth 授權流程正常
- [ ] YouTube 帳號移除功能正常
- [ ] 偏好設定儲存功能正常
- [ ] 資料匯出功能正常
- [ ] 資料匯入功能正常
- [ ] 危險操作確認流程正常

#### 測試
- [ ] 所有單元測試通過（10 個測試）
- [ ] 整合測試通過（1 個測試）
- [ ] 測試覆蓋率 > 80%
- [ ] E2E 測試通過

#### UI/UX
- [ ] 響應式設計完成（桌面/平板/手機）
- [ ] 載入狀態正確顯示
- [ ] 錯誤訊息清晰
- [ ] Toast 通知正常
- [ ] Modal 互動流暢
- [ ] 表單驗證完整

#### 程式碼品質
- [ ] ESLint 檢查通過：`npm run lint`
- [ ] TypeScript 檢查通過：`npm run type-check`
- [ ] 所有元件有 TypeScript 類型
- [ ] 無 console.log
- [ ] 程式碼已格式化

#### 整合
- [ ] 與後端 API 整合正常
- [ ] Store 狀態更新正確
- [ ] API 錯誤處理完整
- [ ] OAuth 流程正常運作

#### Spec 同步
- [ ] 如果實作與 spec 有差異，已更新對應文件
- [ ] 如果有新的依賴套件，已更新 package.json

---

## 預估時間分配

- 環境準備與基礎架構：40 分鐘
- API Keys Tab 實作：120 分鐘
- YouTube Auth Tab 實作：90 分鐘
- Preferences Tab 實作：120 分鐘
- API 整合層：60 分鐘
- 整合測試：60 分鐘
- 響應式設計：60 分鐘
- 文件檢查：30 分鐘

**總計：約 9.5 小時**（預留 0.5 小時 buffer = 10 小時）

---

## 參考資源

### React/Next.js 文檔
- [Next.js App Router](https://nextjs.org/docs/app)
- [React Hooks](https://react.dev/reference/react)

### 相關套件文檔
- [Zustand](https://zustand-demo.pmnd.rs/) - 狀態管理
- [Ant Design](https://ant.design/components/overview) - UI 元件庫
- [React Testing Library](https://testing-library.com/react) - 測試框架

### 專案內部文件
- `product-design/pages.md#Page-11` - 頁面設計
- `product-design/flows.md#Flow-9` - 使用者流程
- `tech-specs/frontend/pages.md#11` - 頁面規格
- `tech-specs/frontend/component-architecture.md` - 元件架構
- `tech-specs/backend/api-system.md` - 系統 API

---

**準備好了嗎？** 開始使用 TDD 方式實作系統設定頁面！🚀
