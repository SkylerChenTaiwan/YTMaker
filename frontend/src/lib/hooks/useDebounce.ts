import { useEffect, useState } from 'react'

/**
 * useDebounce Hook
 *
 * 延遲更新值,用於自動儲存等場景
 *
 * @param value - 要 debounce 的值
 * @param delay - 延遲時間(毫秒)
 * @returns debounced 值
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // 設定定時器
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // 清除定時器
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
