// src/components/templates/VisualTemplatesTab.tsx
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Button, Modal, Skeleton, Empty, Row, Col } from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import * as api from '@/lib/api/configurationsApi'
import type { VisualTemplate } from '@/types/models'

export default function VisualTemplatesTab() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<VisualTemplate | null>(null)

  // 查詢視覺模板列表
  const { data, isLoading } = useQuery({
    queryKey: ['visual-templates'],
    queryFn: api.getVisualTemplates,
  })

  // 刪除模板
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteVisualTemplate(id),
    onSuccess: () => {
      toast.success('模板已刪除')
      queryClient.invalidateQueries({ queryKey: ['visual-templates'] })
      setDeleteModalVisible(false)
    },
    onError: (error: any) => {
      toast.error(error.message || '刪除失敗')
    },
  })

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 4 }} />
  }

  const templates = data?.data?.templates || []

  if (templates.length === 0) {
    return (
      <Empty description="還沒有任何視覺配置模板">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => router.push('/project/new/configure/visual')}
        >
          新增第一個模板
        </Button>
      </Empty>
    )
  }

  return (
    <>
      <div className="mb-4">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => router.push('/project/new/configure/visual')}
        >
          新增模板
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {templates.map((template) => (
          <Col xs={24} sm={12} lg={8} key={template.id}>
            <Card
              hoverable
              cover={
                <div className="h-48 bg-gray-100 flex items-center justify-center">
                  {template.thumbnail_url ? (
                    <img
                      src={template.thumbnail_url}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400">無預覽圖</span>
                  )}
                </div>
              }
              actions={[
                <Button
                  key="use"
                  type="link"
                  onClick={() =>
                    router.push(`/project/new?templateId=${template.id}`)
                  }
                >
                  使用
                </Button>,
                <Button
                  key="edit"
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() =>
                    router.push(`/project/new/configure/visual?templateId=${template.id}`)
                  }
                >
                  編輯
                </Button>,
                <Button
                  key="delete"
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    setTemplateToDelete(template)
                    setDeleteModalVisible(true)
                  }}
                >
                  刪除
                </Button>,
              ]}
            >
              <Card.Meta
                title={template.name}
                description={
                  <>
                    <p className="text-sm text-gray-500 mb-1">{template.description}</p>
                    <p className="text-xs text-gray-400">使用次數: {template.usage_count}</p>
                  </>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Modal
        title="確認刪除"
        open={deleteModalVisible}
        onOk={() => {
          if (templateToDelete) {
            deleteMutation.mutate(templateToDelete.id)
          }
        }}
        onCancel={() => {
          setDeleteModalVisible(false)
          setTemplateToDelete(null)
        }}
        okText="確定"
        cancelText="取消"
        confirmLoading={deleteMutation.isPending}
      >
        <p>確定要刪除模板『{templateToDelete?.name}』嗎？</p>
      </Modal>
    </>
  )
}
