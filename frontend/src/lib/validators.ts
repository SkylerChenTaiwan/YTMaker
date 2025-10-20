// src/lib/validators.ts

/**
 * 驗證專案 ID (UUID v4)
 * @param id - 專案 ID
 * @returns 是否有效
 */
export function validateProjectId(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false

  // UUID v4 正則表達式
  // 格式: 8-4-4-4-12 個十六進制字元
  // 第 3 組必須以 4 開頭 (v4)
  // 第 4 組必須以 8, 9, a, b 開頭 (variant)
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  return uuidV4Regex.test(id)
}

/**
 * 驗證批次任務 ID (UUID v4)
 * @param id - 批次任務 ID
 * @returns 是否有效
 */
export function validateBatchId(id: string | null | undefined): boolean {
  return validateProjectId(id) // 使用相同的驗證邏輯
}
