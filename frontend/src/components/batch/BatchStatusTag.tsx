import { Badge } from '@/components/ui/badge'
import type { BatchTask } from '@/types/api'

interface BatchStatusTagProps {
  status: BatchTask['status']
}

const statusConfig: Record<
  BatchTask['status'],
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; text: string }
> = {
  QUEUED: { variant: 'secondary', text: '排隊中' },
  RUNNING: { variant: 'default', text: '執行中' },
  PAUSED: { variant: 'outline', text: '已暫停' },
  COMPLETED: { variant: 'default', text: '已完成' },
  FAILED: { variant: 'destructive', text: '失敗' },
}

export function BatchStatusTag({ status }: BatchStatusTagProps) {
  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} className="whitespace-nowrap">
      {config.text}
    </Badge>
  )
}
