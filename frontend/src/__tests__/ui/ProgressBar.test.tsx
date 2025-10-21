/**
 * ProgressBar UI 組件單元測試
 *
 * 測試進度條組件的核心功能：
 * - 正確顯示進度
 * - 數值限制（0-100）
 * - 百分比顯示
 * - 不同狀態顏色
 * - 無障礙屬性
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ProgressBar } from '@/components/ui/ProgressBar'

describe('ProgressBar', () => {
  it('應該正確顯示進度', () => {
    render(<ProgressBar value={50} data-testid="progress-bar" />)

    const progressBar = screen.getByTestId('progress-bar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '50')
    expect(progressBar).toHaveAttribute('aria-valuemin', '0')
    expect(progressBar).toHaveAttribute('aria-valuemax', '100')
  })

  it('應該限制進度在 0-100 範圍內', () => {
    const { rerender } = render(<ProgressBar value={150} data-testid="progress-bar" />)

    // 超過 100 應該被限制為 100
    let progressBar = screen.getByTestId('progress-bar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '100')

    // 低於 0 應該被限制為 0
    rerender(<ProgressBar value={-20} data-testid="progress-bar" />)
    progressBar = screen.getByTestId('progress-bar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '0')
  })

  it('應該在 showPercentage=true 時顯示百分比', () => {
    render(<ProgressBar value={75} showPercentage data-testid="progress-bar" />)

    // 應該顯示百分比文字
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('應該在 showPercentage=false 時不顯示百分比', () => {
    render(<ProgressBar value={75} showPercentage={false} data-testid="progress-bar" />)

    // 不應該顯示百分比文字
    expect(screen.queryByText('75%')).not.toBeInTheDocument()
  })

  it('應該為 normal 狀態使用藍色', () => {
    render(<ProgressBar value={50} status="normal" data-testid="progress-bar" />)

    const progressBar = screen.getByTestId('progress-bar')
    const innerBar = progressBar.querySelector('div')

    expect(innerBar).toHaveClass('bg-blue-500')
  })

  it('應該為 success 狀態使用綠色', () => {
    render(<ProgressBar value={100} status="success" data-testid="progress-bar" />)

    const progressBar = screen.getByTestId('progress-bar')
    const innerBar = progressBar.querySelector('div')

    expect(innerBar).toHaveClass('bg-green-500')
  })

  it('應該為 error 狀態使用紅色', () => {
    render(<ProgressBar value={50} status="error" data-testid="progress-bar" />)

    const progressBar = screen.getByTestId('progress-bar')
    const innerBar = progressBar.querySelector('div')

    expect(innerBar).toHaveClass('bg-red-500')
  })

  it('應該正確設置進度條寬度', () => {
    render(<ProgressBar value={65} data-testid="progress-bar" />)

    const progressBar = screen.getByTestId('progress-bar')
    const innerBar = progressBar.querySelector('div')

    expect(innerBar).toHaveStyle({ width: '65%' })
  })

  it('應該有正確的 ARIA role', () => {
    render(<ProgressBar value={50} data-testid="progress-bar" />)

    const progressBar = screen.getByTestId('progress-bar')
    expect(progressBar).toHaveAttribute('role', 'progressbar')
  })

  it('應該支援自訂 className', () => {
    render(<ProgressBar value={50} className="my-custom-class" data-testid="progress-bar" />)

    const container = screen.getByTestId('progress-bar').parentElement
    expect(container).toHaveClass('my-custom-class')
  })

  it('應該在進度為 0 時顯示空進度條', () => {
    render(<ProgressBar value={0} showPercentage data-testid="progress-bar" />)

    const progressBar = screen.getByTestId('progress-bar')
    const innerBar = progressBar.querySelector('div')

    expect(progressBar).toHaveAttribute('aria-valuenow', '0')
    expect(innerBar).toHaveStyle({ width: '0%' })
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('應該在進度為 100 時顯示滿進度條', () => {
    render(<ProgressBar value={100} showPercentage data-testid="progress-bar" />)

    const progressBar = screen.getByTestId('progress-bar')
    const innerBar = progressBar.querySelector('div')

    expect(progressBar).toHaveAttribute('aria-valuenow', '100')
    expect(innerBar).toHaveStyle({ width: '100%' })
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('應該正確處理小數進度', () => {
    render(<ProgressBar value={33.33} showPercentage data-testid="progress-bar" />)

    const progressBar = screen.getByTestId('progress-bar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '33.33')
    expect(screen.getByText('33.33%')).toBeInTheDocument()
  })

  it('應該在進度變化時有過渡動畫', () => {
    render(<ProgressBar value={50} data-testid="progress-bar" />)

    const progressBar = screen.getByTestId('progress-bar')
    const innerBar = progressBar.querySelector('div')

    // 應該有 transition class
    expect(innerBar).toHaveClass('transition-all')
    expect(innerBar).toHaveClass('duration-300')
    expect(innerBar).toHaveClass('ease-in-out')
  })
})
