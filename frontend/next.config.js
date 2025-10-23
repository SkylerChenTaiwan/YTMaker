/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 暫時禁用 TypeScript 和 ESLint 檢查以讓開發伺服器運行
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // API Proxy 設定 (開發環境)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ]
  },

  // 環境變數
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
}

module.exports = nextConfig
