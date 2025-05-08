import { Modal, Form, Input, message } from 'antd'
import { useEffect, useRef, useState } from 'react'

interface RoleDefModalProps {
  open: boolean
  onCancel: () => void
  onOk: (values: { name: string }) => Promise<void> | void
  initialValues?: { name: string }
  title: string
}

export function RoleDefModal({ open, onCancel, onOk, initialValues, title }: RoleDefModalProps) {
  const [form] = Form.useForm()
  const backupValues = useRef<{ name: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open && initialValues) {
      // 备份预置值
      backupValues.current = { ...initialValues }
      form.setFieldsValue(initialValues)
    }
  }, [open, initialValues, form])

  const handleOk = async () => {
    try {
      const formValues = await form.validateFields()
      // 合并预置值和表单值，以表单值为优先
      const mergedValues = {
        ...backupValues.current,
        ...formValues
      }
      
      setSubmitting(true)
      try {
        await onOk(mergedValues)
        // 只有在 onOk 成功执行后才清空表单和关闭窗口
        form.resetFields()
        backupValues.current = null
        onCancel()
      } catch (error) {
        console.error(error);
        message.error('操作失败，请重试')
      } finally {
        setSubmitting(false)
      }
    } catch (error) {
      message.error('请填写角色名称')
    }
  }

  const handleCancel = () => {
    form.resetFields()
    backupValues.current = null
    onCancel()
  }

  return (
    <Modal
      title={title}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      destroyOnClose
      confirmLoading={submitting}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
      >
        <Form.Item
          name="name"
          label="角色名称"
          rules={[{ required: true, message: '请输入角色名称' }]}
        >
          <Input placeholder="请输入角色名称" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// 提供给父组件使用的接口
export const useRoleDefModal = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [presetValues, setPresetValues] = useState<{ name: string } | undefined>()

  const openModal = (values?: { name: string }) => {
    setPresetValues(values)
    setIsOpen(true)
  }

  const closeModal = () => {
    setIsOpen(false)
    setPresetValues(undefined)
  }

  return {
    isOpen,
    presetValues,
    openModal,
    closeModal
  }
}
