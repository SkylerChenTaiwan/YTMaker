// src/components/configurations/ConfigurationPreviewModal.tsx
import { Modal } from 'antd'
import type { Configuration } from '@/types/models'

interface Props {
  configuration: Configuration | null
  visible: boolean
  onClose: () => void
}

export default function ConfigurationPreviewModal({ configuration, visible, onClose }: Props) {
  if (!configuration) return null

  const config = configuration.configuration_data

  return (
    <Modal
      title={`預覽配置: ${configuration.name}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
    >
      <div className="space-y-4">
        {/* 字幕設定預覽 */}
        {config.subtitle && (
          <div className="border p-4 rounded">
            <h3 className="font-semibold mb-2">字幕設定</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>位置: {config.subtitle.position === 'top' ? '頂部' : config.subtitle.position === 'center' ? '中間' : '底部'}</div>
              <div>字體大小: {config.subtitle.font_size}px</div>
              <div>
                字體顏色:
                <span className="ml-2 inline-block w-6 h-6 border rounded" style={{ backgroundColor: config.subtitle.color }}></span>
                <span className="ml-1">{config.subtitle.color}</span>
              </div>
              <div>
                背景顏色:
                <span className="ml-2 inline-block w-6 h-6 border rounded" style={{ backgroundColor: config.subtitle.bg_color }}></span>
                <span className="ml-1">{config.subtitle.bg_color}</span>
              </div>
              <div>
                透明度: {((config.subtitle.bg_opacity || 0.7) * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        )}

        {/* Logo 設定預覽 */}
        {config.logo && (
          <div className="border p-4 rounded">
            <h3 className="font-semibold mb-2">Logo 設定</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>位置: {config.logo.position}</div>
              <div>大小: {config.logo.size}px</div>
              <div>
                偏移: X={config.logo.offset_x}px, Y={config.logo.offset_y}px
              </div>
              <div>透明度: {(config.logo.opacity * 100).toFixed(0)}%</div>
              {config.logo.url && (
                <div className="col-span-2">
                  URL: <a href={config.logo.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{config.logo.url}</a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 疊加元素預覽 */}
        {config.overlays && config.overlays.length > 0 && (
          <div className="border p-4 rounded">
            <h3 className="font-semibold mb-2">疊加元素 ({config.overlays.length})</h3>
            <div className="space-y-2">
              {config.overlays.map((overlay, idx) => (
                <div key={idx} className="text-sm bg-gray-50 p-2 rounded">
                  <div className="font-medium">
                    {overlay.type === 'text' ? '文字' : overlay.type === 'shape' ? '形狀' : '圖片'}
                  </div>
                  <div className="text-gray-600">
                    位置: ({overlay.x}, {overlay.y})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 視覺預覽區 (簡化版) */}
        <div className="border p-4 rounded bg-gray-900">
          <h3 className="font-semibold mb-2 text-white">預覽效果</h3>
          <div className="bg-gray-800 aspect-video relative flex items-center justify-center">
            <span className="text-gray-400 text-sm">
              (實際配置需在視覺化配置頁面查看完整效果)
            </span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
