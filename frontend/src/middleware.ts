import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * 導航守衛 Middleware
 *
 * 功能：
 * 1. 檢查用戶是否完成首次設定
 * 2. 未完成時重定向到 /setup
 * 3. 已完成時阻止訪問 /setup
 */
export function middleware(request: NextRequest) {
  const setupCompleted = request.cookies.get('setup-completed')
  const isSetupPage = request.nextUrl.pathname === '/setup'

  // 如果未完成設定且不在設定頁,重定向到設定頁
  if (!setupCompleted && !isSetupPage) {
    return NextResponse.redirect(new URL('/setup', request.url))
  }

  // 如果已完成設定且在設定頁,重定向到主控台
  if (setupCompleted && isSetupPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

/**
 * 配置 Middleware 匹配路徑
 *
 * 排除：
 * - /api/* - API 路由
 * - /_next/static/* - 靜態文件
 * - /_next/image/* - 圖片優化
 * - /favicon.ico - 網站圖示
 */
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
