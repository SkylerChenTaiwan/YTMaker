// src/app/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App, ConfigProvider } from 'antd'
import zhTW from 'antd/locale/zh_TW'
import { ReactNode, useState } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  // TanStack Query 配置
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 分鐘
            gcTime: 10 * 60 * 1000, // 10 分鐘 (原 cacheTime)
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {/* Ant Design 配置 (繁體中文) */}
      <ConfigProvider
        locale={zhTW}
        theme={{
          token: {
            colorPrimary: '#1E88E5',
            borderRadius: 8,
          },
        }}
      >
        <App>
          {children}
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  )
}
