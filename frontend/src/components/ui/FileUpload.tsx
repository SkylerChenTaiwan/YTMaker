import React, { useRef } from 'react'
import { cn } from '@/lib/cn'

export interface FileUploadProps {
  /** 接受的檔案類型 */
  accept?: string
  /** 是否允許多檔案上傳 */
  multiple?: boolean
  /** 檔案選擇回調 */
  onFileSelect: (files: File[]) => void
  /** 錯誤訊息 */
  errorMessage?: string
  /** 標籤 */
  label?: string
  /** 幫助文字 */
  helperText?: string
  /** 自訂類名 */
  className?: string
}

export const FileUpload: React.FC<FileUploadProps> = ({
  accept,
  multiple = false,
  onFileSelect,
  errorMessage,
  label,
  helperText,
  className,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragActive, setIsDragActive] = React.useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFileSelect(Array.from(files))
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      onFileSelect(Array.from(files))
    }
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block mb-2 text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400',
          errorMessage && 'border-red-500',
          className
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="flex flex-col items-center">
          <svg
            className="w-12 h-12 text-gray-400 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm text-gray-600">
            拖放檔案到這裡，或點擊選擇檔案
          </p>
          {accept && (
            <p className="text-xs text-gray-500 mt-1">
              支援格式: {accept}
            </p>
          )}
        </div>
      </div>
      {errorMessage && (
        <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
      )}
      {helperText && !errorMessage && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  )
}

FileUpload.displayName = 'FileUpload'
