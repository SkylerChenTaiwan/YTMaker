/**
 * 格式化日期時間
 * @param dateString ISO 8601 格式的日期字串
 * @returns 格式化後的日期時間字串 (YYYY-MM-DD HH:mm)
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}
