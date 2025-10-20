// tests/unit/validators.test.ts
import { validateProjectId, validateBatchId } from '@/lib/validators'

describe('Route Parameter Validation', () => {
  describe('validateProjectId', () => {
    it('should accept valid UUID v4', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'
      expect(validateProjectId(validUuid)).toBe(true)
    })

    it('should accept another valid UUID v4', () => {
      const validUuid = '123e4567-e89b-42d3-a456-426614174000'
      expect(validateProjectId(validUuid)).toBe(true)
    })

    it('should reject invalid UUID format', () => {
      expect(validateProjectId('123')).toBe(false)
      expect(validateProjectId('not-a-uuid')).toBe(false)
      expect(validateProjectId('550e8400-e29b-41d4-a716')).toBe(false) // 不完整
    })

    it('should reject UUID v1 (only accept v4)', () => {
      const uuidV1 = '550e8400-e29b-11d4-a716-446655440000' // version 1
      expect(validateProjectId(uuidV1)).toBe(false)
    })

    it('should reject UUID v3 (only accept v4)', () => {
      const uuidV3 = '550e8400-e29b-31d4-a716-446655440000' // version 3
      expect(validateProjectId(uuidV3)).toBe(false)
    })

    it('should reject UUID v5 (only accept v4)', () => {
      const uuidV5 = '550e8400-e29b-51d4-a716-446655440000' // version 5
      expect(validateProjectId(uuidV5)).toBe(false)
    })

    it('should reject empty string', () => {
      expect(validateProjectId('')).toBe(false)
    })

    it('should reject null', () => {
      expect(validateProjectId(null)).toBe(false)
    })

    it('should reject undefined', () => {
      expect(validateProjectId(undefined)).toBe(false)
    })

    it('should reject UUID with wrong case (must be case-insensitive)', () => {
      // UUID should be case-insensitive
      const upperCaseUuid = '550E8400-E29B-41D4-A716-446655440000'
      expect(validateProjectId(upperCaseUuid)).toBe(true)
    })

    it('should reject UUID with invalid characters', () => {
      expect(validateProjectId('550e8400-e29b-41d4-g716-446655440000')).toBe(false)
      expect(validateProjectId('550e8400-e29b-41d4-a716-44665544000z')).toBe(false)
    })

    it('should reject UUID with wrong format (wrong number of segments)', () => {
      expect(validateProjectId('550e8400-e29b-41d4-a716-446655440000-extra')).toBe(false)
      expect(validateProjectId('550e8400-e29b-41d4-446655440000')).toBe(false)
    })
  })

  describe('validateBatchId', () => {
    it('should accept valid UUID v4', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'
      expect(validateBatchId(validUuid)).toBe(true)
    })

    it('should reject invalid UUID format', () => {
      expect(validateBatchId('123')).toBe(false)
      expect(validateBatchId('not-a-uuid')).toBe(false)
    })

    it('should reject empty or null', () => {
      expect(validateBatchId('')).toBe(false)
      expect(validateBatchId(null)).toBe(false)
      expect(validateBatchId(undefined)).toBe(false)
    })

    it('should use same validation logic as validateProjectId', () => {
      const testCases = [
        '550e8400-e29b-41d4-a716-446655440000', // valid v4
        '123e4567-e89b-42d3-a456-426614174000', // valid v4
        '550e8400-e29b-11d4-a716-446655440000', // invalid v1
        'invalid-uuid',
        '',
        null,
        undefined,
      ]

      testCases.forEach((testCase) => {
        expect(validateBatchId(testCase)).toBe(validateProjectId(testCase))
      })
    })
  })
})
