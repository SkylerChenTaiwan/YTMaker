# YTMaker 測試文件

這個文件提供 YTMaker 專案完整的測試執行指南、Mock API 使用說明和常見問題解決方案。

## 目錄

1. [測試架構](#測試架構)
2. [快速開始](#快速開始)
3. [測試類型](#測試類型)
4. [執行測試](#執行測試)
5. [Mock API 使用](#mock-api-使用)
6. [覆蓋率報告](#覆蓋率報告)
7. [CI/CD 整合](#cicd-整合)
8. [故障排除](#故障排除)
9. [最佳實踐](#最佳實踐)

---

## 測試架構

```
frontend/tests/
├── e2e/                          # E2E 測試 (Playwright)
│   ├── integration/              # 整合測試
│   │   ├── cross-flow.spec.ts   # 跨流程測試
│   │   └── data-consistency.spec.ts # 資料一致性
│   ├── flow-0-setup-wizard.spec.ts
│   ├── flow-1-basic-generation.spec.ts
│   ├── routing.spec.ts
│   └── ...
├── unit/                         # 單元測試 (Jest)
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   └── ...
├── integration/                  # 整合測試 (Jest)
│   └── api/
└── mocks/                        # Mock 設定
    ├── handlers/                 # MSW handlers
    │   ├── gemini.ts
    │   └── projects.ts
    ├── server.ts                 # Node 測試環境
    ├── browser.ts                # 瀏覽器測試環境
    └── __tests__/                # Mock 測試
```

---

## 快速開始

### 安裝依賴

```bash
cd frontend
npm install
```

### 執行所有測試

```bash
# Unit 測試
npm test

# E2E 測試
npm run test:e2e

# 帶覆蓋率的測試
npm test -- --coverage
```

---

## 測試類型

### 1. 單元測試 (Unit Tests)

**目的：** 測試單一元件、函數或模組的功能

**框架：** Jest + React Testing Library

**範例：**
```typescript
// tests/unit/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/Button';

describe('Button', () => {
  it('應該正常渲染按鈕', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('點擊時應該觸發 onClick', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

**執行：**
```bash
# 執行所有單元測試
npm test

# Watch mode
npm run test:watch

# 特定檔案
npm test Button.test.tsx
```

---

### 2. 整合測試 (Integration Tests)

**目的：** 測試多個模組之間的整合和互動

**框架：** Jest + MSW (Mock Service Worker)

**範例：**
```typescript
// tests/integration/api/projects.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useProjects } from '@/hooks/useProjects';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('Projects API Integration', () => {
  it('應該正確獲取專案列表', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useProjects(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(3);
  });
});
```

**執行：**
```bash
npm test -- tests/integration
```

---

### 3. E2E 測試 (End-to-End Tests)

**目的：** 測試完整的使用者流程

**框架：** Playwright

**範例：**
```typescript
// tests/e2e/flow-0-setup-wizard.spec.ts
import { test, expect } from '@playwright/test';

test('Flow-0: 批次處理完整流程', async ({ page }) => {
  await page.goto('/');

  // 點擊批次處理
  await page.getByRole('button', { name: /批次處理/i }).click();

  // 填寫資訊
  await page.fill('input[name="channelName"]', 'Test Channel');

  // 驗證結果
  await expect(page).toHaveURL(/\/setup-wizard/);
});
```

**執行：**
```bash
# 執行所有 E2E 測試
npm run test:e2e

# Headed mode (看到瀏覽器)
npx playwright test --headed

# Debug mode
npx playwright test --debug

# 特定檔案
npx playwright test flow-0-setup-wizard.spec.ts

# UI mode (推薦)
npx playwright test --ui
```

---

## 執行測試

### 基本命令

```bash
# 單元測試
npm test                          # 執行所有單元測試
npm test -- --watch              # Watch mode
npm test -- --coverage           # 帶覆蓋率報告
npm test Button.test.tsx         # 特定檔案

# E2E 測試
npm run test:e2e                 # 執行所有 E2E 測試
npx playwright test --headed     # 顯示瀏覽器
npx playwright test --debug      # Debug mode
npx playwright test --ui         # UI mode (推薦)
```

### 進階選項

```bash
# 只執行特定描述的測試
npm test -- -t "應該正常渲染"

# 執行失敗的測試
npm test -- --onlyFailures

# 更新快照
npm test -- -u

# 平行執行
npm test -- --maxWorkers=4

# Playwright 特定瀏覽器
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

---

## Mock API 使用

我們使用 **MSW (Mock Service Worker)** 來 mock API 請求，無需真實的後端伺服器即可執行測試。

### 架構

```
tests/mocks/
├── handlers/              # API handlers
│   ├── gemini.ts         # Gemini API mock
│   ├── projects.ts       # Projects API mock
│   └── auth.ts           # Auth API mock
├── server.ts             # Node 環境 (單元測試)
├── browser.ts            # 瀏覽器環境 (E2E 測試)
└── data/                 # Mock 資料
    ├── projects.ts
    └── templates.ts
```

### Gemini API Mock

**檔案:** `tests/mocks/handlers/gemini.ts`

```typescript
import { http, HttpResponse } from 'msw';

export const geminiHandlers = [
  http.post('/api/gemini/generate', async ({ request }) => {
    const body = await request.json();

    // 模擬 Gemini API 回應
    return HttpResponse.json({
      content: `這是根據 "${body.prompt}" 生成的模擬腳本...`,
      usage: { tokens: 150 }
    });
  }),
];
```

### Projects API Mock

**檔案:** `tests/mocks/handlers/projects.ts`

```typescript
import { http, HttpResponse } from 'msw';

let projects = [
  { id: '1', title: 'Test Project 1', description: 'Description 1' },
  { id: '2', title: 'Test Project 2', description: 'Description 2' },
];

export const projectsHandlers = [
  // GET /api/projects
  http.get('/api/projects', () => {
    return HttpResponse.json(projects);
  }),

  // POST /api/projects
  http.post('/api/projects', async ({ request }) => {
    const body = await request.json();
    const newProject = { id: Date.now().toString(), ...body };
    projects.push(newProject);
    return HttpResponse.json(newProject, { status: 201 });
  }),

  // PUT /api/projects/:id
  http.put('/api/projects/:id', async ({ params, request }) => {
    const body = await request.json();
    projects = projects.map(p =>
      p.id === params.id ? { ...p, ...body } : p
    );
    return HttpResponse.json({ success: true });
  }),
];
```

### 使用 Mock Server

**在單元測試中：**

Mock server 會自動啟動（透過 `jest.setup.js`）：

```typescript
// jest.setup.js
import { server } from './tests/mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**在 E2E 測試中：**

手動啟動 mock server：

```typescript
import { test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // MSW 會自動攔截請求
  await page.goto('/');
});
```

### 自訂 Mock 行為

**覆寫特定測試的 handler：**

```typescript
import { server } from '@/tests/mocks/server';
import { http, HttpResponse } from 'msw';

test('應該處理 API 錯誤', async () => {
  // 覆寫為錯誤回應
  server.use(
    http.get('/api/projects', () => {
      return HttpResponse.json(
        { error: 'Server error' },
        { status: 500 }
      );
    })
  );

  // 測試錯誤處理邏輯...
});
```

---

## 覆蓋率報告

### 設定目標

在 `jest.config.js` 中設定覆蓋率閾值：

```javascript
coverageThresholds: {
  global: {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90,
  },
}
```

### 生成報告

```bash
# 執行測試並生成覆蓋率
npm test -- --coverage

# 只生成覆蓋率（不執行測試）
npm test -- --coverage --watchAll=false
```

### 查看報告

**HTML 報告：**
```bash
# 生成後自動開啟
open coverage/index.html
```

**終端機報告：**
執行 `npm test -- --coverage` 後會直接顯示摘要。

**CI 報告：**
覆蓋率會自動上傳到 Codecov（透過 GitHub Actions）。

---

## CI/CD 整合

### GitHub Actions Workflow

我們的 CI/CD pipeline 會自動執行所有測試並上傳覆蓋率報告。

**觸發條件：**
- Push 到 `main` 或 `develop` 分支
- 建立或更新 Pull Request

**執行流程：**

1. **E2E 測試 Job**
   - 安裝 Playwright 和依賴
   - 執行 E2E 測試
   - 上傳 Playwright 報告和覆蓋率

2. **單元測試 Job**
   - 執行 Jest 單元測試
   - 生成覆蓋率報告
   - 上傳到 Codecov

3. **覆蓋率檢查 Job**
   - 驗證覆蓋率是否達到閾值 (90%)
   - 失敗時阻擋 PR 合併

4. **Lint Job**
   - ESLint 程式碼檢查
   - TypeScript 型別檢查

### 本地模擬 CI

```bash
# 執行 CI 會跑的完整測試
CI=true npm test -- --coverage --watchAll=false
CI=true npm run test:e2e
```

---

## 故障排除

### 常見問題

#### 1. Playwright 測試失敗：`Page closed` 或 `Navigation timeout`

**原因：** 開發伺服器未啟動或回應太慢

**解決：**
```bash
# 手動啟動開發伺服器
npm run dev

# 在另一個 terminal 執行測試
npx playwright test --headed
```

或調整 timeout：
```typescript
// playwright.config.ts
export default defineConfig({
  timeout: 60000, // 增加到 60 秒
});
```

#### 2. Jest 測試失敗：`Cannot find module '@/...'`

**原因：** Module alias 設定問題

**解決：**
檢查 `jest.config.js` 的 `moduleNameMapper`：
```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
}
```

#### 3. MSW Mock 不生效

**原因：** Mock server 未啟動或 handlers 設定錯誤

**解決：**
```bash
# 檢查 jest.setup.js 是否正確載入
# 驗證 handlers 是否正確註冊

# Debug MSW
import { server } from './tests/mocks/server';
server.printHandlers(); // 印出所有註冊的 handlers
```

#### 4. 覆蓋率未達標

**原因：** 部分程式碼缺少測試

**解決：**
```bash
# 查看詳細覆蓋率報告
npm test -- --coverage
open coverage/index.html

# 找出未覆蓋的檔案，補充測試
```

#### 5. E2E 測試在 CI 通過但本地失敗（或相反）

**原因：** 環境差異

**解決：**
```bash
# 使用與 CI 相同的設定
CI=true npm run test:e2e

# 檢查 playwright.config.ts 的 CI 特定設定
```

#### 6. `TypeError: Cannot read property 'mockReturnValue' of undefined`

**原因：** Mock 設定在元件 import 之後

**解決：**
```typescript
// ❌ 錯誤
import { MyComponent } from './MyComponent';
jest.mock('./api');

// ✅ 正確
jest.mock('./api');
import { MyComponent } from './MyComponent';
```

---

## 最佳實踐

### 1. 測試命名

```typescript
// ✅ 好的命名
describe('Button component', () => {
  it('應該在點擊時觸發 onClick 回調', () => {});
  it('應該在 disabled 時不觸發 onClick', () => {});
});

// ❌ 不好的命名
describe('Button', () => {
  it('test 1', () => {});
  it('works', () => {});
});
```

### 2. 測試隔離

**每個測試應該獨立，不依賴其他測試的狀態：**

```typescript
// ✅ 好的做法
describe('Counter', () => {
  let counter;

  beforeEach(() => {
    counter = new Counter(); // 每次都重新建立
  });

  it('應該從 0 開始', () => {
    expect(counter.value).toBe(0);
  });

  it('應該正確增加', () => {
    counter.increment();
    expect(counter.value).toBe(1);
  });
});

// ❌ 不好的做法（測試之間有依賴）
describe('Counter', () => {
  const counter = new Counter();

  it('應該從 0 開始', () => {
    expect(counter.value).toBe(0);
  });

  it('應該正確增加', () => {
    counter.increment(); // 依賴前一個測試的狀態
    expect(counter.value).toBe(1);
  });
});
```

### 3. 使用 data-testid

**在元件中加入 `data-testid` 便於測試選擇：**

```tsx
// Component
<button data-testid="submit-button">提交</button>

// Test
const button = screen.getByTestId('submit-button');
```

### 4. 避免過度 Mock

**只 mock 必要的部分，保持真實性：**

```typescript
// ✅ 好的做法：只 mock 外部 API
jest.mock('@/services/api');

// ❌ 不好的做法：過度 mock 導致測試失去意義
jest.mock('@/components/Button');
jest.mock('@/hooks/useState');
```

### 5. 測試使用者行為，而非實作細節

```typescript
// ✅ 好的做法：測試使用者看到的結果
it('應該顯示錯誤訊息', () => {
  render(<Form />);
  fireEvent.click(screen.getByText('提交'));
  expect(screen.getByText('請填寫必填欄位')).toBeVisible();
});

// ❌ 不好的做法：測試內部狀態
it('應該設定 error state', () => {
  const { result } = renderHook(() => useForm());
  result.current.submit();
  expect(result.current.error).toBe('請填寫必填欄位');
});
```

### 6. 使用 waitFor 處理非同步

```typescript
// ✅ 好的做法
await waitFor(() => {
  expect(screen.getByText('載入完成')).toBeInTheDocument();
});

// ❌ 不好的做法
setTimeout(() => {
  expect(screen.getByText('載入完成')).toBeInTheDocument();
}, 1000);
```

---

## 參考資源

- [Jest 官方文件](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright 文件](https://playwright.dev/)
- [MSW 文件](https://mswjs.io/docs/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**如有任何問題或建議，請在專案 Issue 中提出。**
