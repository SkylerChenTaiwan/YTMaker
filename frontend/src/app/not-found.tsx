// src/app/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">找不到頁面</h2>
        <p className="text-gray-600 mb-8">您訪問的頁面不存在,可能已被移除或 URL 不正確。</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors no-underline"
        >
          返回主控台
        </Link>
      </div>
    </div>
  )
}
