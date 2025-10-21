import { formatDate } from '@/lib/date'

describe('formatDate', () => {
  beforeEach(() => {
    // 固定當前時間為 2025-01-20 12:00:00
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-01-20T12:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should return "剛剛" for dates less than 1 minute ago', () => {
    const date = new Date('2025-01-20T11:59:30Z').toISOString()
    expect(formatDate(date)).toBe('剛剛')
  })

  it('should return "X 分鐘前" for dates less than 1 hour ago', () => {
    const date = new Date('2025-01-20T11:30:00Z').toISOString()
    expect(formatDate(date)).toBe('30 分鐘前')
  })

  it('should return "X 小時前" for dates less than 24 hours ago', () => {
    const date = new Date('2025-01-20T08:00:00Z').toISOString()
    expect(formatDate(date)).toBe('4 小時前')
  })

  it('should return "X 天前" for dates less than 7 days ago', () => {
    const date = new Date('2025-01-18T12:00:00Z').toISOString()
    expect(formatDate(date)).toBe('2 天前')
  })

  it('should return formatted date for dates more than 7 days ago', () => {
    const date = new Date('2025-01-10T10:30:00Z').toISOString()
    const result = formatDate(date)
    expect(result).toMatch(/2025/)
    expect(result).toMatch(/01/)
    expect(result).toMatch(/10/)
  })
})
