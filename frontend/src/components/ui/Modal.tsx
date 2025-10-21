import React, { useEffect } from 'react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

export interface ModalProps {
  /** 是否顯示 Modal */
  visible: boolean
  /** Modal 標題 */
  title?: string
  /** 確認按鈕文字 */
  okText?: string
  /** 取消按鈕文字 */
  cancelText?: string
  /** 確認按鈕點擊事件 */
  onOk?: () => void
  /** 取消按鈕點擊事件 */
  onCancel?: () => void
  /** 子元素 */
  children: React.ReactNode
  /** 自訂 className */
  className?: string
  /** 是否顯示取消按鈕 */
  showCancelButton?: boolean
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  title,
  okText = '確定',
  cancelText = '取消',
  onOk,
  onCancel,
  children,
  className,
  showCancelButton = true,
}) => {
  // 防止背景滾動
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [visible])

  // ESC 鍵關閉
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible && onCancel) {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [visible, onCancel])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal 內容 */}
      <div
        className={cn(
          'relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 transform transition-all',
          className
        )}
      >
        {/* 標題 */}
        {title && (
          <div className="px-6 py-4 border-b border-gray-200">
            <h3
              id="modal-title"
              className="text-lg font-semibold text-gray-900"
            >
              {title}
            </h3>
          </div>
        )}

        {/* 內容 */}
        <div className="px-6 py-4">{children}</div>

        {/* 底部按鈕 */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          {showCancelButton && (
            <Button variant="secondary" onClick={onCancel}>
              {cancelText}
            </Button>
          )}
          <Button variant="primary" onClick={onOk}>
            {okText}
          </Button>
        </div>
      </div>
    </div>
  )
}
