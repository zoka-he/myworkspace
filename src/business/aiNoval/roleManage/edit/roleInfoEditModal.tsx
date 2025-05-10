import { Modal, Form, Input, InputNumber, Select, Button, Row, Col, Divider, TreeSelect } from 'antd'
import { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react'
import { IRoleInfo, IRoleData, IWorldViewData, IFactionDefData } from '@/src/types/IAiNoval'
import factionApiCalls from '@/src/business/aiNoval/factionManage/apiCalls'

interface RoleInfoEditModalProps {
  open: boolean
  onCancel: () => void
  onSubmit: (roleDef: IRoleData, data: IRoleInfo) => void | Promise<void>
  roleData?: IRoleData
  worldViewList: IWorldViewData[]
}

export interface RoleInfoEditModalRef {
  openAndEdit: (roleDef: IRoleData, presetData?: IRoleInfo) => void
}

export const RoleInfoEditModal = forwardRef<RoleInfoEditModalRef, RoleInfoEditModalProps>(({
  open,
  onCancel,
  onSubmit,
  roleData,
  worldViewList
}, ref) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [roleDef, setRoleDef] = useState<IRoleData | undefined>()
  const [presetValues, setPresetValues] = useState<IRoleInfo | undefined>()
  const [factionList, setFactionList] = useState<IFactionDefData[]>([])

  // Transform faction data into tree structure using useMemo
  const factionTreeData = useMemo(() => {
    const buildTree = (parentId: number | null = null): any[] => {
      return factionList
        .filter(faction => faction.parent_id === parentId)
        .map(faction => ({
          title: faction.name,
          value: faction.id,
          children: buildTree(faction.id)
        }))
    }
    return buildTree()
  }, [factionList])

  // Find root faction ID for a given faction ID
  const findRootFactionId = (factionId: number | null): number | null => {
    if (!factionId) return null

    const findParent = (id: number): number => {
      const faction = factionList.find(f => f.id === id)
      if (!faction || !faction.parent_id) return id
      return findParent(faction.parent_id)
    }

    return findParent(factionId)
  }

  useImperativeHandle(ref, () => ({
    openAndEdit: (roleDef: IRoleData, presetData?: IRoleInfo) => {
      setRoleDef(roleDef)
      setPresetValues(presetData)
      form.setFieldsValue(presetData)
    }
  }))

  useEffect(() => {
    if (!open) {
      form.resetFields()
      setPresetValues(undefined)
    }
  }, [open, form])

  // Fetch faction data when worldview changes
  useEffect(() => {
    const fetchFactionData = async () => {
      const worldviewId = form.getFieldValue('worldview_id')
      if (worldviewId) {
        try {
          const response = await factionApiCalls.getFactionList(worldviewId)
          setFactionList(response.data || [])
        } catch (error) {
          console.error('Failed to fetch faction data:', error)
        }
      }
    }

    fetchFactionData()
  }, [form.getFieldValue('worldview_id')])

  const handleSubmit = async () => {
    try {
      setLoading(true)
      const values = await form.validateFields()
      const factionId = values.faction_id
      const rootFactionId = findRootFactionId(factionId)

      await onSubmit(
        roleDef || {}, 
        {
          ...presetValues,
          ...values,
          role_id: roleData?.id,
          root_faction_id: rootFactionId
        }
      )
    } catch (error) {
      console.error('Form validation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const modalTitle = roleDef?.name 
    ? `编辑角色属性 - ${roleDef.name}`
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
        initialValues={{}}
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
      >
        <Divider orientation="left">设定版本</Divider>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="version_name"
              label="版本"
              labelCol={{ span: 3 }}
              wrapperCol={{ span: 21 }}
              rules={[{ required: true, message: '请输入版本' }]}
            >
              <Input placeholder="请输入版本" />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">角色属性</Divider>

        <Row gutter={16}>
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
          <Col span={12}>
            <Form.Item
              name="name_in_worldview"
              label="角色名称"
              rules={[{ required: true, message: '请输入角色名称' }]}
            >
              <Input placeholder="请输入角色名称" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
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
          <Col span={12}>
            <Form.Item
              name="age_in_worldview"
              label="角色年龄"
            >
              <InputNumber min={0} max={1000} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
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
          <Col span={12}>
            <Form.Item
              name="faction_id"
              label="角色阵营"
            >
              <TreeSelect
                placeholder="请选择角色阵营"
                treeData={factionTreeData}
                allowClear
                treeDefaultExpandAll
                showSearch
                treeNodeFilterProp="title"
              />
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
