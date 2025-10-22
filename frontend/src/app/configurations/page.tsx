// src/app/configurations/page.tsx
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Modal, Skeleton, Empty } from 'antd'
import { EyeOutlined, EditOutlined, CopyOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { AppLayout } from '@/components/layout/AppLayout'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { toast } from 'sonner'
import * as api from '@/lib/api/configurationsApi'
import type { Configuration } from '@/types/models'

export default function ConfigurationsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [previewConfig, setPreviewConfig] = useState<Configuration | null>(null)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [configToDelete, setConfigToDelete] = useState<Configuration | null>(null)

  // 查詢配置列表
  const { data, isLoading, error } = useQuery({
    queryKey: ['configurations'],
    queryFn: api.getConfigurations,
  })

  // 刪除配置 mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteConfiguration(id),
    onSuccess: () => {
      toast.success('配置已刪除')
      queryClient.invalidateQueries({ queryKey: ['configurations'] })
      setDeleteModalVisible(false)
    },
    onError: (error: any) => {
      toast.error(error.message || '刪除失敗')
    },
  })

  // 複製配置 mutation
  const copyMutation = useMutation({
    mutationFn: (id: string) => api.copyConfiguration(id),
    onSuccess: (data) => {
      toast.success('配置已複製')
      // 跳轉到視覺化配置頁面,載入複製的配置
      router.push(`/project/new/configure/visual?templateId=${data.data?.id}`)
    },
    onError: (error: any) => {
      toast.error(error.message || '複製失敗')
    },
  })

  // 表格欄位定義
  const columns = [
    {
      title: '配置名稱',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Configuration, b: Configuration) => a.name.localeCompare(b.name),
    },
    {
      title: '創建時間',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a: Configuration, b: Configuration) =>
        dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
    {
      title: '最後使用時間',
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      render: (date: string | null) =>
        date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '未使用',
      sorter: (a: Configuration, b: Configuration) => {
        if (!a.last_used_at) return 1
        if (!b.last_used_at) return -1
        return dayjs(a.last_used_at).unix() - dayjs(b.last_used_at).unix()
      },
      defaultSortOrder: 'descend' as const,
    },
    {
      title: '使用次數',
      dataIndex: 'usage_count',
      key: 'usage_count',
      sorter: (a: Configuration, b: Configuration) => a.usage_count - b.usage_count,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Configuration) => (
        <div className="flex gap-2">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => setPreviewConfig(record)}
          >
            預覽
          </Button>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => router.push(`/project/new/configure/visual?configId=${record.id}`)}
          >
            編輯
          </Button>
          <Button
            type="text"
            icon={<CopyOutlined />}
            onClick={() => copyMutation.mutate(record.id)}
            loading={copyMutation.isPending}
          >
            複製
          </Button>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              setConfigToDelete(record)
              setDeleteModalVisible(true)
            }}
          >
            刪除
          </Button>
        </div>
      ),
    },
  ]

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <Breadcrumb items={[{ label: '主控台', href: '/' }, { label: '配置管理' }]} />
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6">
          <Breadcrumb items={[{ label: '主控台', href: '/' }, { label: '配置管理' }]} />
          <div className="text-red-500">載入失敗: {(error as Error).message}</div>
        </div>
      </AppLayout>
    )
  }

  const configurations = data?.data?.configurations || []

  return (
    <AppLayout>
      <div className="p-6">
        <Breadcrumb items={[{ label: '主控台', href: '/' }, { label: '配置管理' }]} />

        <div className="flex justify-between items-center mb-6 mt-4">
          <h1 className="text-3xl font-bold">配置管理</h1>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push('/project/new/configure/visual')}
          >
            新增配置
          </Button>
        </div>

        {configurations.length === 0 ? (
          <Empty
            description="還沒有任何配置"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              onClick={() => router.push('/project/new/configure/visual')}
            >
              新增第一個配置
            </Button>
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={configurations}
            rowKey="id"
            pagination={{
              pageSize: 20,
              showSizeChanger: false,
              showTotal: (total) => `共 ${total} 個配置`,
            }}
          />
        )}

        {/* 刪除確認 Modal */}
        <Modal
          title="確認刪除"
          open={deleteModalVisible}
          onOk={() => {
            if (configToDelete) {
              deleteMutation.mutate(configToDelete.id)
            }
          }}
          onCancel={() => {
            setDeleteModalVisible(false)
            setConfigToDelete(null)
          }}
          okText="確定"
          cancelText="取消"
          confirmLoading={deleteMutation.isPending}
        >
          <p>確定要刪除配置『{configToDelete?.name}』嗎？</p>
          <p className="text-gray-500 text-sm">此操作無法復原。</p>
        </Modal>
      </div>
    </AppLayout>
  )
}
