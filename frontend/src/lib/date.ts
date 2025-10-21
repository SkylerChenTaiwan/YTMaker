/**
 * 格式化日期時間為相對時間格式
 * @param dateString ISO 8601 格式的日期字串
 * @returns 相對時間字串（剛剛、X 分鐘前等）或絕對時間（超過7天）
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  // 小於 1 分鐘
  if (diffMinutes < 1) {
    return '剛剛'
  }

  // 小於 1 小時
  if (diffHours < 1) {
    return `${diffMinutes} 分鐘前`
  }

  // 小於 24 小時
  if (diffDays < 1) {
    return `${diffHours} 小時前`
  }

  // 小於 7 天
  if (diffDays < 7) {
    return `${diffDays} 天前`
  }

  // 超過 7 天，顯示絕對時間
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}
