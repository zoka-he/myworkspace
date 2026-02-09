import { Modal, Form, Input, InputNumber, Select, Button, Row, Col, Divider, TreeSelect, Space, Radio, message } from 'antd'
import { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react'
import { IRoleInfo, IRoleData, IWorldViewData, IFactionDefData } from '@/src/types/IAiNoval'
import factionApiCalls from '@/src/business/aiNoval/factionManage/apiCalls'
import { CopyOutlined } from '@ant-design/icons'
import { useFactionList, useLoadRoleInfoList, useRoleDefList, useRoleId, useWorldViewList } from '../roleManageContext'
import apiCalls from '../apiCalls'
import { generateRoleEmbedText } from '@/src/api/aiNovel'

interface RoleInfoEditModalProps {
  open: boolean
  onCancel: () => void
  // onSubmit: (roleDef: IRoleData, data: IRoleInfo) => void | Promise<void>
  // roleData?: IRoleData
  // worldViewList: IWorldViewData[]
}

export interface RoleInfoEditModalRef {
  openAndEdit: (roleDef: IRoleData, presetData?: IRoleInfo) => void
}

export const RoleInfoEditModal = forwardRef<RoleInfoEditModalRef, RoleInfoEditModalProps>(({
  open,
  onCancel,
  // onSubmit,
  // roleData,
  // worldViewList
}, ref) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [embedLoading, setEmbedLoading] = useState(false)
  // const [roleDef, setRoleDef] = useState<IRoleData | undefined>()

  const [worldviewList] = useWorldViewList();

  const [roleDefId] = useRoleId();
  const [roleDefList] = useRoleDefList();
  const roleDef = useMemo(() => {
    return roleDefList.find(info => info.id === roleDefId) || null;
  }, [roleDefId])


  const [presetValues, setPresetValues] = useState<IRoleInfo | undefined>()
  // const [factionList, setFactionList] = useState<IFactionDefData[]>([])

  const [factionList] = useFactionList();

  const loadRoleInfoList = useLoadRoleInfoList();

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
      // setRoleDef(roleDef)
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
  // useEffect(() => {
  //   const fetchFactionData = async () => {
  //     const worldviewId = form.getFieldValue('worldview_id')
  //     if (worldviewId) {
  //       try {
  //         const response = await factionApiCalls.getFactionList(worldviewId)
  //         setFactionList(response.data || [])
  //       } catch (error) {
  //         console.error('Failed to fetch faction data:', error)
  //       }
  //     }
  //   }

  //   fetchFactionData()
  // }, [form.getFieldValue('worldview_id')])

  const copyName = () => {
    const name = roleDef?.name;
    if (!name) {
      message.error('没有可参考的角色名称！')
      return
    }

    form.setFieldsValue({
      name_in_worldview: name
    })
  }

  const fastVersion = (s: string) => {
    form.setFieldsValue({
      version_name: s
    })
  }

  const handleGenerateEmbedDocument = async () => {
    try {
      const values = form.getFieldsValue([
        'name_in_worldview',
        'gender_in_worldview',
        'age_in_worldview',
        'personality',
        'background'
      ])
      
      // 组合角色信息为单一文本
      const roleTextParts: string[] = []
      
      if (values.name_in_worldview) {
        roleTextParts.push(`角色名称：${values.name_in_worldview}`)
      }
      if (values.gender_in_worldview) {
        const genderMap: Record<string, string> = {
          'male': '男',
          'female': '女',
          'other': '其他'
        }
        roleTextParts.push(`性别：${genderMap[values.gender_in_worldview] || values.gender_in_worldview}`)
      }
      if (values.age_in_worldview) {
        roleTextParts.push(`年龄：${values.age_in_worldview}`)
      }
      if (values.personality) {
        roleTextParts.push(`性格特征：${values.personality}`)
      }
      if (values.background) {
        roleTextParts.push(`背景故事：${values.background}`)
      }
      
      const roleText = roleTextParts.join('\n')
      
      if (!roleText.trim()) {
        message.warning('请先填写角色基本信息（名称、性别、年龄、性格或背景）')
        return
      }
      
      setEmbedLoading(true)
      const embedText = await generateRoleEmbedText(roleText)
      form.setFieldsValue({ embed_document: embedText })
      message.success('嵌入文档生成成功')
    } catch (e: any) {
      console.error('生成嵌入文档失败：', e)
      message.error(e?.message || '生成嵌入文档失败')
    } finally {
      setEmbedLoading(false)
    }
  }

  const handleSubmit = async () => {

    let values = null;
    try {
      setLoading(true)
      values = await form.validateFields()
      
    } catch (error) {
      console.error('Form validation failed:', error)
      setLoading(false)
      return;
    }

    const factionId = values.faction_id
    const rootFactionId = findRootFactionId(factionId)

    const data = {
      ...presetValues,
      ...values,
      role_id: roleDefId,
      root_faction_id: rootFactionId
    }


    try {
      let response = null;
  
      delete data.created_at;
      
      if (data.id) {
          response = await apiCalls.updateRoleInfo(data);
      } else {
          response = await apiCalls.createRoleInfo(data);
      }
  
      message.success(data.id ? '更新角色版本成功' : '创建角色版本成功');
      // setEditModalVisible(false);
      onCancel();
  
      // 刷新角色列表
      loadRoleInfoList();
      // console.debug('handleCreateOrUpdateRoleInfo updateTimestamp --->> ', Date.now());
      // setUpdateTimestamp(Date.now());
    
    } catch (error) {
        console.error('Failed to create role info:', error);
        message.error('创建角色版本失败');
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
              name="is_enabled"
              label="启用状态"
              initialValue="Y"
              rules={[{ required: true }]}
              labelCol={{ span: 3 }}
              wrapperCol={{ span: 21 }}
            >
              <Radio.Group>
                <Radio value="Y">启用</Radio>
                <Radio value="N">禁用</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>

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
          <Col span={24}>
            <Form.Item
              label={'快速版本'}
              labelCol={{ span: 3 }}
              wrapperCol={{ span: 21 }}
            >
              <Space>
                <Button type="primary" onClick={() => fastVersion('1.0')}>1.0</Button>
                <Button onClick={() => fastVersion('2.0')}>2.0</Button>
                <Button onClick={() => fastVersion('3.0')}>3.0</Button>
              </Space>
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
                {(worldviewList || []).map(worldView => (
                  <Select.Option key={worldView.id} value={worldView.id}>
                    {worldView.title}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="角色名称"
            >
              <Space.Compact>
                <Form.Item name="name_in_worldview" noStyle rules={[{ required: true, message: '请输入角色名称' }]}>
                  <Input placeholder="请输入角色名称" />
                </Form.Item>
                <Button type="primary" icon={<CopyOutlined />} onClick={copyName}>复制</Button>
              </Space.Compact>
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
              name="personality"
              label="角色详情"
              labelCol={{ span: 3 }}
              wrapperCol={{ span: 21 }}
            >
              <Input.TextArea autoSize={{ minRows: 4 }} placeholder="请输入角色详情" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="background"
              label="背景故事"
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
              name="embed_document"
              label="嵌入内容"
              labelCol={{ span: 3 }}
              wrapperCol={{ span: 21 }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Button loading={embedLoading} onClick={handleGenerateEmbedDocument}>生成嵌入文档</Button>
                <Form.Item name="embed_document" noStyle>
                  <Input.TextArea rows={4} placeholder="请输入嵌入内容" />
                </Form.Item>
              </Space>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  )
})
