/**
 * cn - Class Name utility
 *
 * 合併 Tailwind CSS class names
 * 使用 clsx 和 tailwind-merge
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
