import { Button } from '@/components/ui/Button'

interface DownloadButtonProps {
  label: string
  onClick: () => void
  progress?: number
  disabled?: boolean
}

export function DownloadButton({
  label,
  onClick,
  progress = 0,
  disabled = false,
}: DownloadButtonProps) {
  const isDownloading = progress > 0 && progress < 100

  return (
    <div className="relative">
      <Button
        variant="secondary"
        onClick={onClick}
        disabled={isDownloading || disabled}
        className="w-full"
      >
        {isDownloading ? `下載中 ${progress}%` : label}
      </Button>

      {isDownloading && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded">
          <div
            className="h-full bg-blue-500 transition-all rounded"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      )}
    </div>
  )
}
