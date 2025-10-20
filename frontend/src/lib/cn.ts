// src/lib/cn.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 合併 Tailwind CSS 類別
 *
 * 使用 clsx 處理條件類別
 * 使用 tailwind-merge 處理衝突的 utility classes
 *
 * 範例:
 * cn('p-4', 'p-6') => 'p-6' (後者覆蓋前者)
 * cn('p-4', isActive && 'bg-primary') => 'p-4 bg-primary' (條件類別)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
