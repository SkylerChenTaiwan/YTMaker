// tests/unit/pages/project/new.test.tsx
import { describe, it, expect } from '@jest/globals'
import { z } from 'zod'

/**
 * 測試 1：專案名稱驗證
 *
 * 目的：驗證專案名稱的長度和格式要求
 */
describe('測試 1：專案名稱驗證', () => {
  // 定義 schema (這裡先定義,實作時會移到實際檔案中)
  const projectFormSchema = z.object({
    project_name: z
      .string()
      .min(1, '專案名稱不能為空')
      .max(100, '專案名稱不能超過 100 字元'),

    content_source: z.enum(['upload', 'paste']).default('paste'),

    content_text: z
      .string()
      .min(500, '文字長度必須在 500-10000 字之間')
      .max(10000, '文字長度必須在 500-10000 字之間')
      .optional(),
  })

  it('1.1 成功：有效的專案名稱', () => {
    const input = {
      project_name: '我的第一個影片專案',
      content_source: 'paste' as const,
      content_text: '測試文字'.repeat(125), // 500 字
    }

    const result = projectFormSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('1.2 失敗：專案名稱為空', () => {
    const input = {
      project_name: '',
      content_source: 'paste' as const,
      content_text: '測試文字'.repeat(125),
    }

    const result = projectFormSchema.safeParse(input)
    expect(result.success).toBe(false)

    if (!result.success) {
      const nameError = result.error.issues.find(
        (issue) => issue.path[0] === 'project_name'
      )
      expect(nameError?.message).toBe('專案名稱不能為空')
    }
  })

  it('1.3 失敗：專案名稱超過 100 字元', () => {
    const input = {
      project_name: 'a'.repeat(101),
      content_source: 'paste' as const,
      content_text: '測試文字'.repeat(125),
    }

    const result = projectFormSchema.safeParse(input)
    expect(result.success).toBe(false)

    if (!result.success) {
      const nameError = result.error.issues.find(
        (issue) => issue.path[0] === 'project_name'
      )
      expect(nameError?.message).toBe('專案名稱不能超過 100 字元')
    }
  })
})

/**
 * 測試 2：文字內容長度驗證
 *
 * 目的：驗證文字內容必須在 500-10000 字之間
 */
describe('測試 2：文字內容長度驗證', () => {
  const projectFormSchema = z.object({
    project_name: z
      .string()
      .min(1, '專案名稱不能為空')
      .max(100, '專案名稱不能超過 100 字元'),

    content_source: z.enum(['upload', 'paste']).default('paste'),

    content_text: z
      .string()
      .min(500, '文字長度必須在 500-10000 字之間')
      .max(10000, '文字長度必須在 500-10000 字之間')
      .optional(),
  })

  it('2.1 失敗：文字少於 500 字', () => {
    const input = {
      project_name: '測試專案',
      content_source: 'paste' as const,
      content_text: '這是一段很短的文字。'.repeat(20), // 約 240 字
    }

    const result = projectFormSchema.safeParse(input)
    expect(result.success).toBe(false)

    if (!result.success) {
      const textError = result.error.issues.find(
        (issue) => issue.path[0] === 'content_text'
      )
      expect(textError?.message).toBe('文字長度必須在 500-10000 字之間')
    }
  })

  it('2.2 成功：文字正好 500 字', () => {
    const input = {
      project_name: '測試專案',
      content_source: 'paste' as const,
      content_text: '測試文字'.repeat(125), // 正好 500 字
    }

    const result = projectFormSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('2.3 成功：文字 5000 字（中間值）', () => {
    const input = {
      project_name: '測試專案',
      content_source: 'paste' as const,
      content_text: '測試文字'.repeat(1250), // 5000 字
    }

    const result = projectFormSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('2.4 成功：文字正好 10000 字', () => {
    const input = {
      project_name: '測試專案',
      content_source: 'paste' as const,
      content_text: '測試文字'.repeat(2500), // 10000 字
    }

    const result = projectFormSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('2.5 失敗：文字超過 10000 字', () => {
    const input = {
      project_name: '測試專案',
      content_source: 'paste' as const,
      content_text: '測試文字'.repeat(2501), // 10004 字
    }

    const result = projectFormSchema.safeParse(input)
    expect(result.success).toBe(false)

    if (!result.success) {
      const textError = result.error.issues.find(
        (issue) => issue.path[0] === 'content_text'
      )
      expect(textError?.message).toBe('文字長度必須在 500-10000 字之間')
    }
  })
})
