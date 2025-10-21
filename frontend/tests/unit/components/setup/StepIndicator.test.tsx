import { render, screen } from '@testing-library/react'
import { StepIndicator } from '@/components/setup/StepIndicator'

describe('StepIndicator', () => {
  it('should display current step correctly', () => {
    const steps = [
      { title: '歡迎' },
      { title: 'Gemini API' },
      { title: 'Stability AI' },
      { title: 'D-ID API' },
      { title: 'YouTube 授權' },
    ]

    render(<StepIndicator current={2} total={5} steps={steps} />)

    // 驗證第 0-1 步為已完成狀態 (✓)
    const step0 = screen.getByTestId('step-0')
    const step1 = screen.getByTestId('step-1')
    expect(step0.querySelector('.step-circle')).toHaveClass('completed')
    expect(step1.querySelector('.step-circle')).toHaveClass('completed')

    // 驗證第 2 步為當前狀態 (藍色圓點)
    const step2 = screen.getByTestId('step-2')
    expect(step2.querySelector('.step-circle')).toHaveClass('current')

    // 驗證第 3-4 步為未開始狀態 (灰色圓點)
    const step3 = screen.getByTestId('step-3')
    const step4 = screen.getByTestId('step-4')
    expect(step3.querySelector('.step-circle')).toHaveClass('pending')
    expect(step4.querySelector('.step-circle')).toHaveClass('pending')
  })

  it('should display step titles correctly', () => {
    const steps = [
      { title: '歡迎' },
      { title: 'Gemini API' },
      { title: 'Stability AI' },
    ]

    render(<StepIndicator current={1} total={3} steps={steps} />)

    expect(screen.getByText('歡迎')).toBeInTheDocument()
    expect(screen.getByText('Gemini API')).toBeInTheDocument()
    expect(screen.getByText('Stability AI')).toBeInTheDocument()
  })

  it('should show check icon for completed steps', () => {
    const steps = [
      { title: '歡迎' },
      { title: 'Gemini API' },
      { title: 'Stability AI' },
    ]

    render(<StepIndicator current={2} total={3} steps={steps} />)

    const step0 = screen.getByTestId('step-0')
    const step1 = screen.getByTestId('step-1')

    // 已完成的步驟應該顯示勾選圖示
    expect(step0.querySelector('svg')).toBeInTheDocument()
    expect(step1.querySelector('svg')).toBeInTheDocument()
  })

  it('should show step number for current and pending steps', () => {
    const steps = [
      { title: '歡迎' },
      { title: 'Gemini API' },
      { title: 'Stability AI' },
    ]

    render(<StepIndicator current={1} total={3} steps={steps} />)

    const step1 = screen.getByTestId('step-1')
    const step2 = screen.getByTestId('step-2')

    // 當前和未開始的步驟應該顯示步驟編號
    expect(step1).toHaveTextContent('2')
    expect(step2).toHaveTextContent('3')
  })

  it('should render connector lines between steps', () => {
    const steps = [
      { title: '歡迎' },
      { title: 'Gemini API' },
      { title: 'Stability AI' },
    ]

    render(<StepIndicator current={1} total={3} steps={steps} />)

    // 應該有 2 條連接線 (total - 1)
    const connectors = screen.getAllByTestId(/^connector-/)
    expect(connectors).toHaveLength(2)
  })

  it('should highlight connector lines for completed steps', () => {
    const steps = [
      { title: '歡迎' },
      { title: 'Gemini API' },
      { title: 'Stability AI' },
    ]

    render(<StepIndicator current={2} total={3} steps={steps} />)

    const connector0 = screen.getByTestId('connector-0')
    const connector1 = screen.getByTestId('connector-1')

    // 已完成步驟後的連接線應該是綠色
    expect(connector0).toHaveClass('bg-green-500')
    // 當前步驟後的連接線應該是灰色
    expect(connector1).toHaveClass('bg-gray-300')
  })
})
