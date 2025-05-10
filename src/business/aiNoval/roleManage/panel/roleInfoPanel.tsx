import { Card, Select, Button, Space, Typography, Descriptions, Dropdown, Alert, MenuProps, Modal } from 'antd'
import { PlusOutlined, DownOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useState, useEffect } from 'react'
import { IRoleData, IRoleInfo, IWorldViewData, IFactionDefData } from '@/src/types/IAiNoval'
import apiCalls from '../apiCalls'
import factionApiCalls from '@/src/business/aiNoval/factionManage/apiCalls'

const { Title, Text } = Typography

interface RoleInfoPanelProps {
  roleDef: IRoleData | null
  updateTimestamp?: number | null
  onVersionChange: (version: IRoleData) => void | Promise<void>
  onOpenRoleInfoEditModal: (roleDef: IRoleData, data?: IRoleInfo) => void | Promise<void>
  onDeleteRoleInfo: (roleDef: IRoleData, data: IRoleInfo) => void | Promise<void>
  worldviewMap: Map<number, IWorldViewData>
}

const labelStyle = {
  width: '100px',
  fontSize: '14px',
  fontWeight: 500,
  color: '#666'
}

export function RoleInfoPanel({
  roleDef,
  onVersionChange,
  onOpenRoleInfoEditModal,
  onDeleteRoleInfo,
  worldviewMap
}: RoleInfoPanelProps) {

  const [role, setRole] = useState<IRoleInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [roleVersions, setRoleVersions] = useState<IRoleInfo[]>([])
  const [factionMap, setFactionMap] = useState<Map<number, IFactionDefData>>(new Map())
  
  async function loadRoleVersions() {
    if (!roleDef?.id) {
      setIsLoading(false)
      return
    }
    
    try {
      setIsLoading(true)
      const res = await apiCalls.getRoleInfoList(roleDef.id)
      setRoleVersions(res.data)
      
      // 如果当前有选中的版本ID，则设置对应的版本
      if (roleDef.version) {
        const selectedVersion = res.data.find((v: IRoleInfo) => v.id === roleDef.version)
        if (selectedVersion) {
          setRole(selectedVersion)
          // 如果有世界观ID，加载阵营数据
          if (selectedVersion.worldview_id) {
            loadFactionData(selectedVersion.worldview_id)
          }
        }
      } else {
        setRole(null)
      }

    } catch (error) {
      console.error('Failed to load role versions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadFactionData(worldviewId: number) {
    try {
      const res = await factionApiCalls.getFactionList(worldviewId)
      const factions = res.data as IFactionDefData[]
      const newFactionMap = new Map<number, IFactionDefData>()
      factions.forEach(faction => {
        if (faction.id) {
          newFactionMap.set(faction.id, faction)
        }
      })
      setFactionMap(newFactionMap)
    } catch (error) {
      console.error('Failed to load faction data:', error)
    }
  }

  useEffect(() => {
    console.debug('roleInfoPanel roleDef change --->> ', roleDef)
    loadRoleVersions()
  }, [roleDef])

  const handleVersionChange = (version: IRoleInfo) => {
    if (!roleDef?.id) return
    setRole(version)
    onVersionChange({
      id: roleDef.id,
      version: version.id
    })
    // 如果有世界观ID，加载阵营数据
    if (version.worldview_id) {
      loadFactionData(version.worldview_id)
    }
  }

  // 处理创建新版本
  const handleCreateRoleInfo = () => {
    if (!roleDef) {
      return
    }
    onOpenRoleInfoEditModal(roleDef)
  }

  // 处理编辑版本
  const handleEditRoleInfo = (data: IRoleInfo) => {
    if (!roleDef) {
      return
    }

    onOpenRoleInfoEditModal(roleDef, data)
  }

  // 处理删除版本
  const handleDeleteRoleInfo = (version: IRoleInfo) => {
    if (!roleDef) {
      return
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除该角色版本吗？`,
      okText: '确认',
      okType: 'danger', 
      cancelText: '取消',
      onOk: async () => {
        onDeleteRoleInfo(roleDef, version)
      }
    });
  }

  // 未选择角色时显示提示
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

  // 加载中显示加载状态
  if (isLoading) {
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

  // 版本切换下拉菜单
  const versionItems: MenuProps['items'] = roleVersions.map(version => ({
    key: version.id || '',
    label: version.version_name || '',
    onClick: () => handleVersionChange(version)
  }))

  // 渲染主结构
  return (
    <div>
      {/* 顶部标题栏 */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>{roleDef.name}</Title>
          {role && <Text type="secondary">v{role.version_name}</Text>}
          <Dropdown menu={{ items: versionItems }} trigger={['click']}>
            <a style={{ cursor: 'pointer' }}>
              切换 <DownOutlined />
            </a>
          </Dropdown>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreateRoleInfo}
        >
          创建新版本
        </Button>
      </div>

      {/* 版本详情卡片 */}
      <Card>
        {!role ? (
          <Alert
            message="提示"
            description="请从上方下拉菜单选择一个版本"
            type="info"
            showIcon
          />
        ) : (
          <>
            {/* 版本操作按钮 */}
            <Space style={{ marginBottom: 10, width: '100%'}} align='center'>
              <Button type="primary" icon={<EditOutlined />} onClick={() => handleEditRoleInfo(role)}>编辑版本</Button>
              <Button type="primary" icon={<DeleteOutlined />} onClick={() => handleDeleteRoleInfo(role)} danger>删除版本</Button>
            </Space>
            {/* 版本详细信息 */}
            <Descriptions bordered column={1} labelStyle={labelStyle}>
              <Descriptions.Item label="版本名">
                {role.version_name}
              </Descriptions.Item>
              <Descriptions.Item label="世界观">
                {role.worldview_id ? worldviewMap.get(role.worldview_id)?.title : '未设置世界观'}
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
                {role.faction_id ? factionMap.get(role.faction_id)?.name || '未知阵营' : '未设置阵营'}
              </Descriptions.Item>
              <Descriptions.Item label="角色背景">
                {role.background}
              </Descriptions.Item>
              <Descriptions.Item label="角色详情">
                {role.personality}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Card>
    </div>
  )
}
