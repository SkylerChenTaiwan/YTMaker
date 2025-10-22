// src/components/templates/PromptTemplatesTab.tsx
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Modal, Form, Input, Tag } from 'antd'
import { EyeOutlined, EditOutlined, CopyOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import * as api from '@/lib/api/promptTemplatesApi'
import type { PromptTemplate } from '@/types/models'

const { TextArea } = Input

export default function PromptTemplatesTab() {
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const [isModalVisible, setIsModalVisible] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create')
  const [currentTemplate, setCurrentTemplate] = useState<PromptTemplate | null>(null)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<PromptTemplate | null>(null)

  // 查詢 Prompt 範本列表
  const { data, isLoading } = useQuery({
    queryKey: ['prompt-templates'],
    queryFn: api.getPromptTemplates,
  })

  // 建立範本
  const createMutation = useMutation({
    mutationFn: (values: { name: string; content: string }) =>
      api.createPromptTemplate(values),
    onSuccess: () => {
      toast.success('範本已建立')
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] })
      setIsModalVisible(false)
      form.resetFields()
    },
  })

  // 更新範本
  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: any }) =>
      api.updatePromptTemplate(id, values),
    onSuccess: () => {
      toast.success('範本已更新')
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] })
      setIsModalVisible(false)
      form.resetFields()
    },
  })

  // 刪除範本
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deletePromptTemplate(id),
    onSuccess: () => {
      toast.success('範本已刪除')
      queryClient.invalidateQueries({ queryKey: ['prompt-templates'] })
      setDeleteModalVisible(false)
    },
    onError: (error: any) => {
      toast.error(error.message || '刪除失敗')
    },
  })

  const handleCreate = () => {
    setModalMode('create')
    setCurrentTemplate(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (template: PromptTemplate) => {
    setModalMode('edit')
    setCurrentTemplate(template)
    form.setFieldsValue({
      name: template.name,
      content: template.content,
    })
    setIsModalVisible(true)
  }

  const handleView = (template: PromptTemplate) => {
    setModalMode('view')
    setCurrentTemplate(template)
    form.setFieldsValue({
      name: template.name,
      content: template.content,
    })
    setIsModalVisible(true)
  }

  const handleCopy = (template: PromptTemplate) => {
    setModalMode('create')
    setCurrentTemplate(null)
    form.setFieldsValue({
      name: `${template.name} (副本)`,
      content: template.content,
    })
    setIsModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (modalMode === 'create') {
        createMutation.mutate(values)
      } else if (modalMode === 'edit' && currentTemplate) {
        updateMutation.mutate({ id: currentTemplate.id, values })
      }
    } catch (error) {
      console.error('表單驗證失敗:', error)
    }
  }

  const columns = [
    {
      title: '範本名稱',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: PromptTemplate) => (
        <span>
          {name}
          {record.is_default && (
            <Tag color="blue" className="ml-2">
              預設
            </Tag>
          )}
        </span>
      ),
    },
    {
      title: 'Prompt 預覽',
      dataIndex: 'content',
      key: 'content',
      render: (content: string) => (
        <div className="truncate max-w-md">{content.substring(0, 100)}...</div>
      ),
    },
    {
      title: '創建時間',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '使用次數',
      dataIndex: 'usage_count',
      key: 'usage_count',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: PromptTemplate) => (
        <div className="flex gap-2">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            查看
          </Button>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編輯
          </Button>
          <Button
            type="text"
            icon={<CopyOutlined />}
            onClick={() => handleCopy(record)}
          >
            複製
          </Button>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            disabled={record.is_default}
            onClick={() => {
              setTemplateToDelete(record)
              setDeleteModalVisible(true)
            }}
          >
            刪除
          </Button>
        </div>
      ),
    },
  ]

  const templates = data?.data?.templates || []

  return (
    <>
      <div className="mb-4">
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新增範本
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={templates}
        rowKey="id"
        loading={isLoading}
        pagination={{
          pageSize: 10,
          showTotal: (total) => `共 ${total} 個範本`,
        }}
      />

      {/* 新增/編輯/查看 Modal */}
      <Modal
        title={
          modalMode === 'create'
            ? '新增 Prompt 範本'
            : modalMode === 'edit'
            ? '編輯 Prompt 範本'
            : '查看 Prompt 範本'
        }
        open={isModalVisible}
        onOk={modalMode === 'view' ? () => setIsModalVisible(false) : handleSubmit}
        onCancel={() => {
          setIsModalVisible(false)
          form.resetFields()
        }}
        okText={modalMode === 'view' ? '關閉' : '儲存'}
        cancelText={modalMode === 'view' ? undefined : '取消'}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={800}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label="範本名稱"
            rules={[{ required: true, message: '請輸入範本名稱' }]}
          >
            <Input placeholder="輸入範本名稱" disabled={modalMode === 'view'} />
          </Form.Item>
          <Form.Item
            name="content"
            label="Prompt 內容"
            rules={[
              { required: true, message: '請輸入 Prompt 內容' },
              { min: 50, message: 'Prompt 內容至少需要 50 個字元' },
            ]}
          >
            <TextArea
              rows={12}
              placeholder="請輸入 Prompt 內容，可包含變數佔位符如 {content}、{duration} 等"
              disabled={modalMode === 'view'}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 刪除確認 Modal */}
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
        <p>確定要刪除範本『{templateToDelete?.name}』嗎？</p>
        <p className="text-gray-500 text-sm">此操作無法復原。</p>
      </Modal>
    </>
  )
}
