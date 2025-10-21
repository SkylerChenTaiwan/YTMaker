import { Button, Modal } from 'antd'
import type { YouTubeChannel } from '@/types/system'

interface Props {
  channel: YouTubeChannel
  onRemove: (channelId: string) => void
  onReauthorize: (channelId: string) => void
}

export const YouTubeChannelCard = ({ channel, onRemove, onReauthorize }: Props) => {
  const isExpired = channel.auth_status === 'expired'

  const handleRemove = () => {
    Modal.confirm({
      title: '確認移除授權',
      content: `確定要移除「${channel.name}」的授權嗎？移除後將無法上傳影片到此頻道，需重新授權。`,
      okText: '確認移除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => onRemove(channel.id),
    })
  }

  return (
    <div className="border rounded-lg p-4 flex items-start gap-4">
      {/* 頻道頭像 */}
      <img src={channel.thumbnail} alt={channel.name} className="w-16 h-16 rounded-full" />

      {/* 頻道資訊 */}
      <div className="flex-1">
        <h3 className="font-semibold text-lg">{channel.name}</h3>
        <p className="text-sm text-gray-600">
          訂閱數：{channel.subscriber_count.toLocaleString()}
        </p>
        <p className="text-sm mt-1">
          {isExpired ? (
            <span className="text-yellow-600">✗ 授權已過期</span>
          ) : (
            <span className="text-green-600">✓ 已授權</span>
          )}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          授權時間：{new Date(channel.authorized_at).toLocaleString('zh-TW')}
        </p>
      </div>

      {/* 操作按鈕 */}
      <div className="flex flex-col gap-2">
        {isExpired && (
          <Button size="small" onClick={() => onReauthorize(channel.id)}>
            重新授權
          </Button>
        )}
        <Button size="small" danger onClick={handleRemove}>
          移除授權
        </Button>
      </div>
    </div>
  )
}
