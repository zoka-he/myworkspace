import { Modal, Form, Input, InputNumber, Select, Button, Row, Col } from 'antd'
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { IRoleInfo, IRoleData, IWorldViewData } from '@/src/types/IAiNoval'

interface RoleInfoEditModalProps {
  open: boolean
  onCancel: () => void
  onSubmit: (data: IRoleInfo) => void | Promise<void>
  initialData?: IRoleInfo
  roleData?: IRoleData
  worldViewList: IWorldViewData[]
}

export interface RoleInfoEditModalRef {
  openAndEdit: (presetData: IRoleInfo) => void
}

export const RoleInfoEditModal = forwardRef<RoleInfoEditModalRef, RoleInfoEditModalProps>(({
  open,
  onCancel,
  onSubmit,
  initialData,
  roleData,
  worldViewList
}, ref) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [presetValues, setPresetValues] = useState<IRoleInfo | undefined>()

  useImperativeHandle(ref, () => ({
    openAndEdit: (presetData: IRoleInfo) => {
      setPresetValues(presetData)
      form.setFieldsValue(presetData)
    }
  }))

  useEffect(() => {
    if (open && initialData) {
      form.setFieldsValue(initialData)
      setPresetValues(initialData)
    } else {
      form.resetFields()
      setPresetValues(undefined)
    }
  }, [open, initialData, form])

  const handleSubmit = async () => {
    try {
      setLoading(true)
      const values = await form.validateFields()
      await onSubmit({
        ...presetValues,
        ...values,
        role_id: roleData?.id
      })
      form.resetFields()
      setPresetValues(undefined)
    } catch (error) {
      console.error('Form validation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const modalTitle = roleData?.name 
    ? `编辑角色属性 - ${roleData.name}`
    : '编辑角色属性'

  return (
    <Modal
      title={modalTitle}
      open={open}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
          确定
        </Button>
      ]}
    >
      <Form
        form={form}
        layout="horizontal"
        initialValues={initialData}
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="version_name"
              label="版本名"
              rules={[{ required: true, message: '请输入版本名' }]}
            >
              <Input placeholder="请输入版本名" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="worldview_id"
              label="世界观"
              rules={[{ required: true, message: '请选择世界观' }]}
            >
              <Select placeholder="请选择世界观">
                {(worldViewList || []).map(worldView => (
                  <Select.Option key={worldView.id} value={worldView.id}>
                    {worldView.title}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="name_in_worldview"
              label="角色名称"
              rules={[{ required: true, message: '请输入角色名称' }]}
            >
              <Input placeholder="请输入角色名称" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="gender_in_worldview"
              label="角色性别"
            >
              <Select placeholder="请选择角色性别">
                <Select.Option value="male">男</Select.Option>
                <Select.Option value="female">女</Select.Option>
                <Select.Option value="other">其他</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="age_in_worldview"
              label="角色年龄"
            >
              <InputNumber min={0} max={1000} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="race_id"
              label="角色种族"
            >
              <Select placeholder="请选择角色种族">
                {/* TODO: 添加种族选项 */}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="faction_id"
              label="角色阵营"
            >
              <Select placeholder="请选择角色阵营">
                {/* TODO: 添加阵营选项 */}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="background"
              label="角色背景"
              labelCol={{ span: 3 }}
              wrapperCol={{ span: 21 }}
            >
              <Input.TextArea rows={4} placeholder="请输入角色背景" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="personality"
              label="角色详情"
              labelCol={{ span: 3 }}
              wrapperCol={{ span: 21 }}
            >
              <Input.TextArea rows={4} placeholder="请输入角色详情" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  )
})
