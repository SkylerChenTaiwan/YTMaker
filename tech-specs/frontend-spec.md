# 前端技術規格 (Frontend Specification)

> **建立日期：** [日期]
> **最後更新：** [日期]
> **關聯文件：** `framework.md`, `product-design/pages.md`

---

## 1. 專案架構

### 技術棧
**框架：** [React / Vue / Angular / Next.js]
**語言：** [TypeScript / JavaScript]
**UI 框架：** [Tailwind CSS / Material-UI / Ant Design]
**狀態管理：** [Redux / Zustand / Context API]
**路由：** [React Router / Next.js Router]

---

### 資料夾結構

```
src/
├── components/           # 元件
│   ├── common/          # 通用元件
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   ├── Button.styles.ts
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Modal/
│   │   └── ...
│   ├── layout/          # 佈局元件
│   │   ├── Header/
│   │   ├── Footer/
│   │   ├── Sidebar/
│   │   └── Layout/
│   └── features/        # 功能特定元件
│       ├── auth/
│       ├── dashboard/
│       └── ...
├── pages/               # 頁面元件
│   ├── Home/
│   ├── Login/
│   ├── Dashboard/
│   └── ...
├── hooks/               # 自定義 Hooks
│   ├── useAuth.ts
│   ├── useApi.ts
│   └── ...
├── store/               # 狀態管理
│   ├── slices/         # Redux slices 或 Zustand stores
│   ├── actions/
│   ├── selectors/
│   └── index.ts
├── services/            # API 服務
│   ├── api.ts          # API client 設定
│   ├── authService.ts
│   ├── userService.ts
│   └── ...
├── utils/               # 工具函數
│   ├── formatters.ts   # 格式化函數
│   ├── validators.ts   # 驗證函數
│   ├── constants.ts    # 常數
│   └── ...
├── types/               # TypeScript 類型定義
│   ├── models.ts       # 資料模型
│   ├── api.ts          # API 類型
│   └── ...
├── assets/              # 靜態資源
│   ├── images/
│   ├── icons/
│   └── fonts/
├── styles/              # 全域樣式
│   ├── globals.css
│   ├── variables.css
│   └── theme.ts
└── App.tsx              # 主應用程式
```

---

## 2. 元件設計規範

### 元件命名規範

**檔案命名：** PascalCase
- 元件檔案: `Button.tsx`
- 測試檔案: `Button.test.tsx`
- 樣式檔案: `Button.styles.ts` 或 `Button.module.css`

**元件命名：** PascalCase
```typescript
export const UserProfile: React.FC<UserProfileProps> = ({ ... }) => {
  // ...
}
```

---

### 元件結構範本

```typescript
import React from 'react';
import { ComponentProps } from './types';
import styles from './Component.module.css';

/**
 * Component 元件說明
 * @param {ComponentProps} props - 元件屬性
 */
export const Component: React.FC<ComponentProps> = ({
  prop1,
  prop2,
  onAction,
}) => {
  // 1. Hooks
  const [state, setState] = useState();
  const customHook = useCustomHook();

  // 2. Effects
  useEffect(() => {
    // ...
  }, []);

  // 3. Handlers
  const handleClick = () => {
    // ...
  };

  // 4. Render helpers
  const renderItem = () => {
    // ...
  };

  // 5. Main render
  return (
    <div className={styles.container}>
      {/* JSX */}
    </div>
  );
};
```

---

### Props 定義

**使用 TypeScript 定義 Props：**
```typescript
interface ButtonProps {
  /** 按鈕文字 */
  label: string;
  /** 按鈕樣式變體 */
  variant?: 'primary' | 'secondary' | 'outline';
  /** 是否為載入狀態 */
  loading?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 點擊事件處理器 */
  onClick?: () => void;
  /** 自定義 className */
  className?: string;
  /** 子元素 */
  children?: React.ReactNode;
}
```

**必填與選填：**
- 必填屬性: 不加 `?`
- 選填屬性: 加 `?`
- 提供預設值: 在元件內或使用 `defaultProps`

---

## 3. 通用元件庫

### Button 元件

**檔案位置：** `components/common/Button/`

**Props：**
```typescript
interface ButtonProps {
  label?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  children?: React.ReactNode;
}
```

**使用範例：**
```tsx
<Button
  variant="primary"
  size="medium"
  loading={isLoading}
  onClick={handleSubmit}
>
  提交
</Button>
```

**樣式變體：**
- `primary`: 主要按鈕，品牌色背景
- `secondary`: 次要按鈕，灰色背景
- `outline`: 外框按鈕，透明背景
- `text`: 文字按鈕，無背景

---

### Input 元件

**Props：**
```typescript
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number';
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}
```

**使用範例：**
```tsx
<Input
  label="信箱"
  type="email"
  value={email}
  onChange={setEmail}
  error={emailError}
  required
/>
```

---

### Modal 元件

**Props：**
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
}
```

**使用範例：**
```tsx
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="確認刪除"
  footer={
    <>
      <Button variant="outline" onClick={handleClose}>取消</Button>
      <Button variant="primary" onClick={handleDelete}>確認</Button>
    </>
  }
>
  <p>確定要刪除這個項目嗎？</p>
</Modal>
```

---

### Card 元件
### Select 元件
### Checkbox 元件
### Radio 元件
### Toast/Notification 元件
### Loading 元件

[繼續定義其他通用元件...]

---

## 4. 頁面元件

### 頁面結構範本

```typescript
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout';
import { PageTitle } from '@/components/common';

export const PageName: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  // State management
  const [data, setData] = useState();

  // Data fetching
  useEffect(() => {
    fetchData();
  }, []);

  // Handlers
  const handleAction = () => {
    // ...
  };

  return (
    <Layout>
      <PageTitle>頁面標題</PageTitle>
      <div className="container">
        {/* 頁面內容 */}
      </div>
    </Layout>
  );
};
```

---

### 頁面 1: 登入頁 (Login)

**路由：** `/login`
**關聯文件：** `product-design/pages.md#登入頁`

**狀態管理：**
```typescript
interface LoginState {
  email: string;
  password: string;
  rememberMe: boolean;
  isLoading: boolean;
  error: string | null;
}
```

**主要功能：**
- 表單驗證
- 登入 API 呼叫
- 錯誤處理
- 登入成功後導航

**驗證規則：**
- Email: 必填, 有效格式
- Password: 必填, 至少 8 字元

**使用元件：**
- `Input`
- `Button`
- `Checkbox`
- `Toast`

**API 呼叫：**
```typescript
const handleLogin = async () => {
  setIsLoading(true);
  try {
    const response = await authService.login(email, password);
    // 儲存 token
    // 導航到 dashboard
  } catch (error) {
    setError(error.message);
  } finally {
    setIsLoading(false);
  }
};
```

---

### 頁面 2: 主控台 (Dashboard)

**路由：** `/dashboard`
**權限：** 需要登入
**關聯文件：** `product-design/pages.md#主控台`

**狀態管理：**
```typescript
interface DashboardState {
  stats: DashboardStats;
  recentItems: Item[];
  isLoading: boolean;
}
```

**主要功能：**
- 載入統計資料
- 顯示最近項目
- 快速操作按鈕

**使用元件：**
- `StatsCard`
- `Table`
- `Button`
- `Loading`

---

## 5. 狀態管理

### 全域狀態設計

**使用 Redux Toolkit (範例)：**

#### authSlice
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
  },
});
```

---

#### uiSlice
```typescript
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  notifications: Notification[];
}
```

---

### Local State vs Global State

**使用 Local State (useState)：**
- 表單輸入值
- UI 顯示/隱藏狀態
- 僅單一元件使用的資料

**使用 Global State：**
- 用戶認證資訊
- 主題設定
- 多個元件共用的資料

---

## 6. API 整合

### API Client 設定

**檔案位置：** `services/api.ts`

```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // 處理未授權，導航到登入頁
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

### Service 層設計

**檔案位置：** `services/authService.ts`

```typescript
import api from './api';
import { LoginRequest, LoginResponse, User } from '@/types';

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async register(data: RegisterRequest): Promise<User> {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
    localStorage.removeItem('token');
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get('/auth/me');
    return response.data;
  },
};
```

---

## 7. 自定義 Hooks

### useAuth Hook

**檔案位置：** `hooks/useAuth.ts`

```typescript
export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated, isLoading } = useSelector(
    (state: RootState) => state.auth
  );

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password);
      dispatch(setUser(response.user));
      localStorage.setItem('token', response.token);
      return true;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    dispatch(logoutAction());
    authService.logout();
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };
};
```

---

### useApi Hook

**用途：** 簡化 API 呼叫與狀態管理

```typescript
export const useApi = <T>(apiFunc: () => Promise<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFunc();
      setData(result);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, execute };
};
```

**使用範例：**
```typescript
const { data, loading, error, execute } = useApi(() =>
  userService.getUsers()
);

useEffect(() => {
  execute();
}, []);
```

---

### useForm Hook

**用途：** 表單處理與驗證

```typescript
export const useForm = <T extends Record<string, any>>(
  initialValues: T,
  validationSchema?: ValidationSchema
) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const handleChange = (name: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (name: keyof T) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    // 驗證該欄位
  };

  const validate = () => {
    // 執行驗證邏輯
  };

  const resetForm = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validate,
    resetForm,
  };
};
```

---

## 8. 路由設計

### 路由配置

**檔案位置：** `App.tsx` or `routes.tsx`

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* 公開路由 */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* 需要認證的路由 */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};
```

---

### 受保護路由

```typescript
export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
```

---

## 9. 樣式設計

### CSS 方案選擇

**選項：**
- CSS Modules
- Styled Components
- Tailwind CSS
- Emotion

**本專案使用：** [選擇一個]

---

### 主題設計

**色彩變數：**
```css
:root {
  /* 主色 */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-primary-light: #dbeafe;

  /* 語意色 */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;

  /* 中性色 */
  --color-text: #1f2937;
  --color-text-secondary: #6b7280;
  --color-background: #ffffff;
  --color-border: #e5e7eb;

  /* 間距 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* 字體 */
  --font-family: 'Inter', sans-serif;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 24px;

  /* 圓角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* 陰影 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
}
```

---

### 響應式斷點

```css
/* Mobile first approach */
/* Extra small devices (phones, 0px and up) */
@media (min-width: 0px) { }

/* Small devices (landscape phones, 576px and up) */
@media (min-width: 576px) { }

/* Medium devices (tablets, 768px and up) */
@media (min-width: 768px) { }

/* Large devices (desktops, 1024px and up) */
@media (min-width: 1024px) { }

/* Extra large devices (large desktops, 1280px and up) */
@media (min-width: 1280px) { }
```

---

## 10. 表單驗證

### 驗證庫

**使用：** [Zod / Yup / Joi]

### 驗證 Schema 範例

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, '請輸入 Email')
    .email('請輸入有效的 Email'),
  password: z
    .string()
    .min(8, '密碼至少需要 8 個字元')
    .regex(/[A-Z]/, '密碼必須包含大寫字母')
    .regex(/[a-z]/, '密碼必須包含小寫字母')
    .regex(/[0-9]/, '密碼必須包含數字'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
```

---

### 表單元件整合

```typescript
const LoginForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    // 處理登入
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        {...register('email')}
        label="Email"
        error={errors.email?.message}
      />
      <Input
        {...register('password')}
        type="password"
        label="密碼"
        error={errors.password?.message}
      />
      <Button type="submit">登入</Button>
    </form>
  );
};
```

---

## 11. 錯誤處理

### 錯誤邊界 (Error Boundary)

```typescript
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 記錄錯誤到錯誤追蹤服務
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }

    return this.props.children;
  }
}
```

---

### Toast 通知

```typescript
export const useToast = () => {
  const dispatch = useDispatch();

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    dispatch(addNotification({ message, type }));
  };

  return { showToast };
};
```

---

## 12. 效能優化

### 優化策略

**Code Splitting：**
```typescript
const Dashboard = lazy(() => import('./pages/Dashboard'));

<Suspense fallback={<Loading />}>
  <Dashboard />
</Suspense>
```

**Memoization：**
```typescript
const MemoizedComponent = React.memo(ExpensiveComponent);

const memoizedValue = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);

const memoizedCallback = useCallback(() => {
  doSomething(a, b);
}, [a, b]);
```

**虛擬列表：**
- 使用 `react-window` 或 `react-virtualized`
- 適用於長列表渲染

---

## 13. 可訪問性 (A11y)

### ARIA 標籤
```tsx
<button
  aria-label="關閉對話框"
  aria-pressed={isPressed}
  aria-expanded={isExpanded}
>
  X
</button>
```

### 鍵盤導航
- Tab 順序正確
- Enter/Space 觸發按鈕
- Escape 關閉 Modal

### 語意化 HTML
- 使用正確的 HTML 標籤
- `<button>` vs `<div>`
- `<nav>`, `<main>`, `<article>`

---

## 14. 測試策略

### 單元測試

```typescript
describe('Button', () => {
  it('應該渲染正確的文字', () => {
    render(<Button>點擊我</Button>);
    expect(screen.getByText('點擊我')).toBeInTheDocument();
  });

  it('點擊時應該呼叫 onClick', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>點擊</Button>);
    fireEvent.click(screen.getByText('點擊'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

---

### E2E 測試

```typescript
test('用戶應該能夠登入', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

---

## 更新記錄

| 日期 | 版本 | 修改內容 | 修改人 |
|------|------|----------|--------|
| [日期] | 1.0 | 初始版本 | [名字] |
| | | | |
