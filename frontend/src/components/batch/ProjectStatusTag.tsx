import { Badge } from '@/components/ui/badge'

interface ProjectStatusTagProps {
  status: string
}

const statusConfig: Record<
  string,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; text: string }
> = {
  QUEUED: { variant: 'secondary', text: '排隊' },
  RUNNING: { variant: 'default', text: '進行中' },
  COMPLETED: { variant: 'default', text: '完成' },
  FAILED: { variant: 'destructive', text: '失敗' },
  PAUSED: { variant: 'outline', text: '已暫停' },
}

export function ProjectStatusTag({ status }: ProjectStatusTagProps) {
  const config = statusConfig[status] || { variant: 'secondary' as const, text: status }

  return (
    <Badge variant={config.variant} className="whitespace-nowrap">
      {config.text}
    </Badge>
  )
}
