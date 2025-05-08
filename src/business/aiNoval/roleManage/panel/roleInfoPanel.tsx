import { Card, Select, Button, Space, Typography, Descriptions, Dropdown, Alert } from 'antd'
import { PlusOutlined, DownOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import { IRoleData, IRoleInfo } from '@/src/types/IAiNoval'

const { Title, Text } = Typography

interface RoleInfoPanelProps {
  roleDef: IRoleData | null
  active_version_id?: string
  versions: { label: string; value: string }[]
  onVersionChange: (version: string) => void | Promise<void>
  onVersionManage: () => void
  onOpenRoleInfoEditModal: (data: IRoleInfo) => void | Promise<void>
}

const labelStyle = {
  width: '100px',
  fontSize: '14px',
  fontWeight: 500,
  color: '#666'
}

export function RoleInfoPanel({
  roleDef,
  active_version_id,
  versions,
  onVersionChange,
  onVersionManage,
  onOpenRoleInfoEditModal
}: RoleInfoPanelProps) {
  const [role, setRole] = useState<IRoleInfo | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<string | undefined>(active_version_id)
  const [isLoading, setIsLoading] = useState(true)
  const [editModalVisible, setEditModalVisible] = useState(false)

  useEffect(() => {
    const fetchRoleData = async () => {
      if (!roleDef?.id) {
        setRole(null)
        setIsLoading(false)
        return
      }
      
      setIsLoading(true)
      try {
        // TODO: 替换为实际的API调用
        const response = await fetch(`/api/roles/${roleDef.id}${selectedVersion ? `?version=${selectedVersion}` : ''}`)
        const data = await response.json()
        setRole(data)
      } catch (error) {
        console.error('Failed to fetch role data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRoleData()
  }, [roleDef, selectedVersion])

  const handleVersionChange = (value: string) => {
    setSelectedVersion(value)
    onVersionChange(value)
  }

  const handleCreateRoleInfo = () => {
    if (!roleDef) {
      return;
    }
    onOpenRoleInfoEditModal(roleDef);
  }

  if (!roleDef) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#999',
        fontSize: '14px'
      }}>
        请选择角色
      </div>
    )
  }

  if (isLoading || !role) {
    return <Card loading={true} />
  }

  // 如果没有版本，显示简化版界面
  if (!roleDef.version_count) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 0' }}>
          <Title level={4} style={{ margin: 0 }}>{roleDef.name}</Title>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <Alert
            message="提示"
            description="该角色尚未创建属性版本，请点击下方按钮添加版本"
            type="warning"
            showIcon
            style={{ width: '100%' }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateRoleInfo}
          >
            添加角色版本
          </Button>
        </div>
      </div>
    )
  }

  const versionItems = versions.map(version => ({
    key: version.value,
    label: version.label,
    onClick: () => handleVersionChange(version.value)
  }))

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>{roleDef.name}</Title>
          <Text type="secondary">v{role.version_name}</Text>
          <Dropdown menu={{ items: versionItems }} trigger={['click']}>
            <a style={{ cursor: 'pointer' }}>
              切换 <DownOutlined />
            </a>
          </Dropdown>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onVersionManage}
        >
          版本管理
        </Button>
      </div>

      <Card>
        <Descriptions bordered column={1} labelStyle={labelStyle}>
          <Descriptions.Item label="版本名">
            {role.version_name}
          </Descriptions.Item>
          <Descriptions.Item label="世界观">
            {role.worldview_id}
          </Descriptions.Item>
          <Descriptions.Item label="角色名称">
            {role.name_in_worldview}
          </Descriptions.Item>
          <Descriptions.Item label="角色性别">
            {role.gender_in_worldview}
          </Descriptions.Item>
          <Descriptions.Item label="角色年龄">
            {role.age_in_worldview}
          </Descriptions.Item>
          <Descriptions.Item label="角色种族">
            {role.race_id}
          </Descriptions.Item>
          <Descriptions.Item label="角色阵营">
            {role.faction_id}
          </Descriptions.Item>
          <Descriptions.Item label="角色背景">
            {role.background}
          </Descriptions.Item>
          <Descriptions.Item label="角色详情">
            {role.personality}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  )
}
