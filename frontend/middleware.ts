// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

/**
 * Next.js Middleware - 導航守衛
 *
 * 職責:
 * 1. 檢查首次設定是否完成 (setup_completed cookie)
 * 2. 未完成時重定向到 /setup
 * 3. 完成後禁止訪問 /setup (重定向回 /)
 */
export function middleware(request: NextRequest) {
  const setupCompleted = checkSetupCompleted(request)
  const { pathname } = request.nextUrl

  // 首次啟動檢查
  if (!setupCompleted && !pathname.startsWith('/setup')) {
    // 未完成設定,重定向到 /setup
    return NextResponse.redirect(new URL('/setup', request.url))
  }

  // 如果已完成設定,不允許再訪問 /setup
  if (setupCompleted && pathname.startsWith('/setup')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 其他情況正常通過
  return NextResponse.next()
}

/**
 * 檢查是否完成首次設定
 */
function checkSetupCompleted(request: NextRequest): boolean {
  // 從 Cookie 檢查
  const setupCookie = request.cookies.get('setup_completed')
  return setupCookie?.value === 'true'
}

/**
 * Middleware 配置
 * - matcher: 定義哪些路由需要經過 middleware
 * - 排除 _next/static, _next/image, favicon.ico 等靜態資源
 */
export const config = {
  matcher: [
    /*
     * 匹配所有路徑,除了:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
