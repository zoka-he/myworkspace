/**
 * 角色信息面板组件
 * 用于显示和管理AI小说角色的详细信息、版本管理和Dify文档集成
 */

import { Card, Select, Button, Space, Typography, Descriptions, Dropdown, Alert, MenuProps, Modal, Divider, Row, Col, Radio, Pagination, message, Input, Form } from 'antd'
import { PlusOutlined, DownOutlined, EditOutlined, DeleteOutlined, SafetyCertificateFilled, SearchOutlined, CopyOutlined, RetweetOutlined } from '@ant-design/icons'
import { useState, useEffect, useCallback } from 'react'
import { IRoleData, IRoleInfo, IWorldViewData, IFactionDefData } from '@/src/types/IAiNoval'
import apiCalls from '../apiCalls'
import factionApiCalls from '@/src/business/aiNoval/factionManage/apiCalls'
import fetch from '@/src/fetch'
import DifyApi from '@/src/utils/dify/dify_api'
// 导入lodash的debounce函数
import { debounce } from 'lodash'
import store from '@/src/store'
import { setFrontHost } from '@/src/store/difySlice'
import { connect } from 'react-redux'

const { Title, Text } = Typography

function mapStateToProps(state: any) {
  return {
    difyFrontHost: state.difySlice.frontHost,
    difyFrontHostOptions: state.difySlice.difyFrontHostOptions
  }
}

/**
 * 角色信息面板组件的属性接口
 */
interface RoleInfoPanelProps {
  roleDef: IRoleData | null                    // 角色定义数据
  updateTimestamp?: number | null              // 更新时间戳
  onVersionChange: (version: IRoleData) => void | Promise<void>  // 版本变更回调
  onOpenRoleInfoEditModal: (roleDef: IRoleData, data?: IRoleInfo) => void | Promise<void>  // 打开编辑模态框回调
  onDeleteRoleInfo: (roleDef: IRoleData, data: IRoleInfo) => void | Promise<void>  // 删除角色信息回调
  worldviewMap: Map<number, IWorldViewData>    // 世界观数据映射
  difyFrontHost: string
  difyFrontHostOptions: string[]
}

/**
 * 描述项标签样式配置
 */
const labelStyle = {
  width: '100px',
  fontSize: '14px',
  fontWeight: 500,
  color: '#666'
}

/**
 * 角色信息面板主组件
 * 负责显示角色信息、版本管理、阵营信息和Dify文档集成
 */
export const RoleInfoPanel = connect(mapStateToProps)(function RoleInfoPanel({
  roleDef,
  onVersionChange,
  onOpenRoleInfoEditModal,
  onDeleteRoleInfo,
  worldviewMap,
  difyFrontHost,
  difyFrontHostOptions
}: RoleInfoPanelProps) {

  // 当前选中的角色版本信息
  const [role, setRole] = useState<IRoleInfo | null>(null)
  // 加载状态
  const [isLoading, setIsLoading] = useState(true)
  // 角色版本列表
  const [roleVersions, setRoleVersions] = useState<IRoleInfo[]>([])
  // 阵营数据映射
  const [factionMap, setFactionMap] = useState<Map<number, IFactionDefData>>(new Map())
  
  /**
   * 加载角色版本列表
   * 获取指定角色的所有版本信息
   */
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

  /**
   * 加载阵营数据
   * 根据世界观ID获取对应的阵营信息
   */
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

  // 监听角色定义变化，重新加载版本数据
  useEffect(() => {
    console.debug('roleInfoPanel roleDef change --->> ', roleDef)
    loadRoleVersions()
  }, [roleDef])

  /**
   * 处理版本切换
   * 当用户选择不同版本时更新当前角色信息
   */
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

  /**
   * 处理创建新版本
   * 打开创建角色版本的编辑模态框
   */
  const handleCreateRoleInfo = () => {
    if (!roleDef) {
      return
    }
    onOpenRoleInfoEditModal(roleDef)
  }

  /**
   * 处理编辑版本
   * 打开编辑指定角色版本的模态框
   */
  const handleEditRoleInfo = (data: IRoleInfo) => {
    if (!roleDef) {
      return
    }

    onOpenRoleInfoEditModal(roleDef, data)
  }

  /**
   * 处理删除版本
   * 显示确认对话框并执行删除操作
   */
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

  // 版本切换下拉菜单配置
  const versionItems: MenuProps['items'] = roleVersions.map(version => ({
    key: version.id || '',
    label: version.version_name || '',
    onClick: () => handleVersionChange(version)
  }))

  // 渲染主结构
  return (
    <div>
      {/* 顶部标题栏 - 显示角色名称、版本信息和操作按钮 */}
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

      {/* 版本详情卡片 - 显示当前版本的详细信息 */}
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
            <div className='f-flex-two-side'>
              <Title level={5} style={{ margin: 0 }}>版本信息</Title>

              {/* 版本操作按钮 */}
              <Space style={{ marginBottom: 10}} align='center'>
                <Button type="primary" icon={<EditOutlined />} onClick={() => handleEditRoleInfo(role)}>编辑版本</Button>
                <Button type="primary" icon={<DeleteOutlined />} onClick={() => handleDeleteRoleInfo(role)} danger>删除版本</Button>
              </Space>
            </div>
            
            {/* 版本详细信息展示 */}
            <Descriptions size='small' bordered column={1} labelStyle={labelStyle}>
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
                <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }} ellipsis={{ rows: 3 }}>
                  {role.background}
                </Typography.Paragraph>
              </Descriptions.Item>
              <Descriptions.Item label="角色详情">
                <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }} ellipsis={{ rows: 3 }}>
                  {role.personality}
                </Typography.Paragraph>
              </Descriptions.Item>
            </Descriptions>

            <Divider />
            
            {/* Dify文档管理组件 */}
            <DifyDocumentForRole roleInfo={role} onRequestUpdate={loadRoleVersions} />
          </>
        )}
      </Card>
    </div>
  )
})

/**
 * Dify文档管理组件的属性接口
 */
interface IDifyDocumentForRoleProps {
  roleInfo: IRoleInfo                    // 角色信息
  onRequestUpdate?: () => void           // 请求更新回调
  difyFrontHost: string
}

/**
 * Dify文档管理组件
 * 负责角色的Dify文档创建、编辑、删除和绑定功能
 */
const DifyDocumentForRole = connect(mapStateToProps)(function (props: IDifyDocumentForRoleProps) {

  // Dify文档内容
  let [difyDocumentContent, setDifyDocumentContent] = useState<string | null>(null)
  // Dify数据集ID
  let [difyDatasetId, setDifyDatasetId] = useState<string | null>(null)
  // Dify文档ID
  let [difyDocumentId, setDifyDocumentId] = useState<string | null>(null)
  // 世界观ID
  let [worldViewId, setWorldViewId] = useState<number | null>(null)
  // 绑定文档模态框显示状态
  let [difyDocumentModalOpen, setDifyDocumentModalOpen] = useState<boolean>(false)
  // 编辑文档模态框显示状态
  let [difyDocumentEditModalOpen, setDifyDocumentEditModalOpen] = useState<boolean>(false)
  // 召回文档模态框显示状态
  let [difyDocumentRecallModalOpen, setDifyDocumentRecallModalOpen] = useState<boolean>(false)


  /**
   * 处理编辑Dify文档
   * 支持创建新文档和更新现有文档
   */
  const handleEditDifyDocument = useCallback(async (isCreateMode: boolean, title: string, content: string) => {
    
    if (!difyDatasetId) {
      message.error('数据集ID为空，请检查程序');
      return;
    }

    if (!title) {
      message.error('标题为空，请检查程序');
      return;
    }

    if (!content) {
      message.error('内容为空，请检查程序');
      return;
    }

    try {
      if (isCreateMode) {
        if (!props.roleInfo.id) {
          message.error('角色ID为空，请检查程序或数据');
          return;
        }

        let res = await createDifyDocument(props.difyFrontHost, difyDatasetId, title, content)
        console.debug('createDifyDocument res: ', res)
        if (res.document.id) {
          await bindRoleInfoDocument(props.roleInfo.id, difyDatasetId, res.document.id)
        }
      } else {
        if (!difyDocumentId) {
          message.error('文档ID为空，请检查程序');
          return;
        }

        await updateDifyDocument(props.difyFrontHost, difyDatasetId, difyDocumentId, title, content)
      }

      if (props.onRequestUpdate) {
        props.onRequestUpdate()
      }
    } catch (error) {
      message.error('编辑失败，请检查程序');
    }
  }, [props.roleInfo, difyDocumentContent, difyDatasetId, difyDocumentId])

  /**
   * 处理创建Dify文档
   * 预留接口，当前未实现具体逻辑
   */
  const handleCreateDifyDocument = useCallback(async () => {

  }, [props.roleInfo])

  /**
   * 处理绑定Dify文档
   * 将现有文档绑定到角色信息
   */
  const handleBindDifyDocument = useCallback(async (datasetId: string, documentId: string) => {
    try {
      if (!props.roleInfo.id) {
        message.error('角色ID为空，请检查程序');
        return;
      }

      if (!datasetId || !documentId) {
        message.error('dify文档数据不全，请检查程序');
        return;
      }

      await bindRoleInfoDocument(props.roleInfo.id, datasetId, documentId)
      setDifyDocumentModalOpen(false)
      message.success('绑定成功');

      if (props.onRequestUpdate) {
        props.onRequestUpdate()
      }

    } catch (error) {
      message.error('绑定失败，请检查程序');
    }
  }, [props.roleInfo])

  /**
   * 处理删除Dify文档
   * 删除文档并解除绑定关系
   */
  const handleDeleteDifyDocument = useCallback(async () => {
    const datasetId = props.roleInfo.dify_dataset_id
    const documentId = props.roleInfo.dify_document_id

    if (!props.roleInfo.id) {
      message.error('角色ID为空，请检查程序');
      return;
    }

    if (!datasetId || !documentId) {
      message.error('数据集ID或文档ID为空，请检查程序');
      return;
    }

    try {
      await deleteDifyDocument(props.difyFrontHost, datasetId, documentId)
      await bindRoleInfoDocument(props.roleInfo.id, '', '');
      message.success('删除成功');

      if (props.onRequestUpdate) {
        props.onRequestUpdate()
      }
    } catch (error) {
      message.error('删除失败，请检查程序');
    }
  }, [props.roleInfo])

  // 监听角色信息变化，初始化Dify相关数据
  useEffect(() => {
    if (!props.roleInfo) {
      return
    }

    if (props.roleInfo.worldview_id) {
      setWorldViewId(props.roleInfo.worldview_id)
    }

    if (props.roleInfo.dify_dataset_id && props.roleInfo.dify_document_id) {
      setDifyDatasetId(props.roleInfo.dify_dataset_id)
      setDifyDocumentId(props.roleInfo.dify_document_id)
    } else if (props.roleInfo.worldview_id) {
      loadToolConfig(props.roleInfo.worldview_id).then((res) => {
        setDifyDatasetId(res.roleDatasetId)
      })
    }
    
  }, [props.roleInfo])

  // 监听数据集ID和文档ID变化，加载文档内容
  useEffect(() => {
    if (!difyDatasetId || !difyDocumentId) {
      return
    }

    loadDocumentContent(props.difyFrontHost, difyDatasetId, difyDocumentId).then((res) => {
      setDifyDocumentContent(res!.content)
    })
    .catch((err) => {
      message.error('加载文档内容失败，请检查程序');
    })
  }, [difyDatasetId, difyDocumentId, props.difyFrontHost])

  // 判断是否有Dify文档
  let hasDifyDocument = false;
  if (props.roleInfo?.dify_document_id && props.roleInfo?.dify_document_id) {
    hasDifyDocument = true;
  }

  return (
    <>
      <div className='f-flex-two-side'>
        <Title level={5} style={{ margin: 0 }}>Dify文档</Title>
        <Space> 
          <Button type="default" size="small" icon={<RetweetOutlined />} onClick={() => setDifyDocumentRecallModalOpen(true)}>召回</Button>
          {hasDifyDocument ? (
            <>
              <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => setDifyDocumentEditModalOpen(true)}>编辑</Button>
              <Button type="primary" size="small" icon={<DeleteOutlined />} onClick={() => handleDeleteDifyDocument()} danger>删除</Button>
            </>
          ) : (
            <>
              <Button type="default" size="small" icon={<SafetyCertificateFilled />} onClick={() => setDifyDocumentModalOpen(true)}>绑定</Button>
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setDifyDocumentEditModalOpen(true)}>创建</Button>
            </>
          )}
        </Space>
      </div>
      {/* 调试信息区域 - 已注释 */}
      {/* <div>
        <p>debug</p>
        <p>worldViewId: {worldViewId}</p>
        <p>difyDatasetId: {difyDatasetId}</p>
        <p>difyDocumentId: {difyDocumentId}</p>
      </div> */}
      
      {/* Dify文档内容显示区域 */}
      <div style={{ marginTop: 16, backgroundColor: '#f5f5f5', padding: 16, borderRadius: 4, border: '1px solid #e0e0e0' }}>
        <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {difyDocumentContent || '暂无内容'}
        </Typography.Paragraph>
      </div>

      {/* 绑定Dify文档模态框 */}
      <BindDifyDocumentModal
        open={difyDocumentModalOpen}
        datasetId={difyDatasetId}
        roleData={props.roleInfo}
        onOk={handleBindDifyDocument}
        onCancel={() => setDifyDocumentModalOpen(false)}
      />

      {/* 编辑Dify文档模态框 */}
      <DifyDocumentEditModal
        open={difyDocumentEditModalOpen}
        roleInfo={props.roleInfo}
        difyContent={difyDocumentContent || ''}
        onOk={handleEditDifyDocument}
        onCancel={() => setDifyDocumentEditModalOpen(false)}
      />

      {/* 召回Dify文档模态框 */}
      <RecallDifyDocument
        open={difyDocumentRecallModalOpen}
        roleInfo={props.roleInfo}
        datasetId={difyDatasetId}
        onOk={() => setDifyDocumentRecallModalOpen(false)}
        onCancel={() => setDifyDocumentRecallModalOpen(false)}
      />
    </>
  )
})

/**
 * 绑定Dify文档模态框的属性接口
 */
interface IBindDifyDocumentModalProps {
  open: boolean                                    // 模态框显示状态
  datasetId: string | null                         // 数据集ID
  roleData: IRoleInfo | null                       // 角色数据
  onOk: (datasetId: string, documentId: string) => void  // 确认绑定回调
  onCancel: () => void                             // 取消回调
  difyFrontHost: string
  difyFrontHostOptions: string[]
}

/**
 * 绑定Dify文档模态框组件
 * 用于选择并绑定现有的Dify文档到角色
 */
const BindDifyDocumentModal = connect(mapStateToProps)(function(props: IBindDifyDocumentModalProps) {
  // 选中的文件
  const [selectedFile, setSelectedFile] = useState<string>('')
  // 文件列表
  const [fileList, setFileList] = useState<any[]>([])
  // 当前页码
  const [page, setPage] = useState(1)
  // 每页大小
  const [pageSize, setPageSize] = useState(10)
  // 搜索关键词
  const [keyword, setKeyword] = useState('')
  // 总数量
  const [total, setTotal] = useState(0)
  // 选中的文档ID
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('')
  // Dify文档内容
  const [difyDocumentContent, setDifyDocumentContent] = useState<string | null>(null)

  // 组件挂载时加载文档列表
  useEffect(() => {
    loadDocumentList(props.difyFrontHost, props.datasetId);
  }, [])

  // 数据集ID变化时重新加载文档列表
  useEffect(() => {
    loadDocumentList(props.difyFrontHost, props.datasetId);
  }, [props.datasetId])

  // 选中的文档ID变化时加载文档内容
  useEffect(() => {
    if (!props.datasetId || !selectedDocumentId) {
      setDifyDocumentContent(null);
      return
    }

    console.debug('----------------- loadDocumentContent useEffect: ', props.difyFrontHost, props.datasetId, selectedDocumentId)
    loadDocumentContent(props.difyFrontHost, props.datasetId, selectedDocumentId).then((res) => {
      setDifyDocumentContent(res!.content)
    })
  }, [props.datasetId, selectedDocumentId, props.difyFrontHost])

  /**
   * 加载文档列表
   * 从Dify API获取指定数据集的文档列表
   */
  function loadDocumentList(difyFrontHost: string, datasetId?: string | null, page: number = 1, pageSize: number = 10, keyword: string = '') {
    if (!datasetId) {
      return
    }

    const difyBaseUrl = `http://${difyFrontHost}/v1`;
    const difyApi = new DifyApi(store.getState().difySlice.datasetsApiKey!, difyBaseUrl);
    difyApi.getDocumentList(datasetId, page, pageSize, keyword).then((res) => {
      setFileList(res.data)
      setTotal(res.total)
    })
  }

  /**
   * 处理分页变化
   */
  const handlePageChange = useCallback((page: number, pageSize: number) => {
    setPage(page)
    setPageSize(pageSize)
    loadDocumentList(props.difyFrontHost, props.datasetId, page, pageSize, keyword)
  }, [props.difyFrontHost, props.datasetId, keyword])

  /**
   * 处理确认绑定
   */
  const handleOk = useCallback(() => {
    if (!props.datasetId || !selectedDocumentId) {
      message.error('文档ID或数据集ID为空，请检查程序');
      return;
    }

    props.onOk(props.datasetId, selectedDocumentId)
  }, [props.onOk, props.datasetId, selectedDocumentId])

  /**
   * 处理关键词搜索变化
   * 使用防抖优化搜索性能
   */
  const handleKeywordChange = useCallback((value: string) => {
    setKeyword(value)
    debounce(() => {
      loadDocumentList(props.difyFrontHost, props.datasetId, 1, pageSize, value)
    }, 300)()
  }, [props.difyFrontHost, props.datasetId, pageSize])

  // 构建模态框标题，包含角色名称和复制按钮
  let modalTitle = <span>绑定Dify文档</span>;
  if (props.roleData?.name_in_worldview) {
    modalTitle = <>
      <span>绑定Dify文档 - {props.roleData.name_in_worldview}</span>
      <Button type="link" icon={<CopyOutlined />} onClick={() => handleKeywordChange(props.roleData?.name_in_worldview || '')}>复制</Button>
    </>
  }

  return (
    <Modal
      width={'70vw'}
      title={modalTitle}
      open={props.open}
      onCancel={props.onCancel}
      footer={null}
    >
      {/* 搜索输入框 */}
      <div className="f-flex-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text>Dify主机：</Text>
          <Select style={{width: '140px'}} options={props.difyFrontHostOptions.map(option => ({ label: option, value: option }))} value={props.difyFrontHost} onChange={e => store.dispatch(setFrontHost(e))} />
          <Input style={{flex: 1, marginLeft: '16px'}} placeholder='请输入文档名称' value={keyword} onChange={e => handleKeywordChange(e.target.value)} prefix={<SearchOutlined />}></Input>
      </div>
      <Row gutter={16}>
        {/* 左侧文档列表 */}
        <Col span={10}>
          <div style={{ marginBottom: 16 }}>
            <Typography.Text strong>选择文档</Typography.Text>
          </div>

          <div style={{ 
            marginBottom: 16, 
            border: '1px solid #f0f0f0', 
            padding: '8px 16px', 
            height: '50vh', 
            borderRadius: 4,
            overflow: 'auto'
          }}>
            <Radio.Group 
              value={selectedFile} 
              onChange={(e) => setSelectedFile(e.target.value)}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {fileList.map(file => (
                  <div
                    style={{
                      padding: '4px 12px',
                      borderBottom: '1px solid #f5f5f5',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      marginBottom: '0',
                      backgroundColor: selectedDocumentId === file.id ? '#f6ffed' : 'transparent',
                      border: selectedDocumentId === file.id ? '1px solid #b7eb8f' : '1px solid transparent'
                    }}

                    onClick={() => setSelectedDocumentId(file.id)}
                  >
                    <Radio value={file.id} style={{ width: '100%' }}>
                        <div style={{ marginLeft: '8px' }}>
                            <div style={{ 
                                fontWeight: 500, 
                                color: '#262626',
                                marginBottom: '4px'
                            }}>
                                {file.name}
                            </div>
                            <div style={{ 
                                fontSize: '12px', 
                                color: '#bfbfbf',
                                marginTop: '4px'
                            }}>
                                创建时间: {new Date(Number(file.created_at) * 1000).toLocaleString('zh-CN')}
                            </div>
                        </div>
                    </Radio>
                  </div>
                ))}
              </Space>
            </Radio.Group>
            
          </div>
          {/* 分页组件 */}
          <Pagination
            size="small"
            align='center'
            total={total}
            pageSize={pageSize}
            current={page}
            onChange={handlePageChange}
            />
        </Col>
        {/* 右侧文档内容预览 */}
        <Col span={14}>
          <p>Dify文档</p>
          <div style={{
            marginBottom: 16, 
            border: '1px solid #f0f0f0', 
            padding: '8px 16px', 
            height: '50vh', 
            borderRadius: 4,
            overflow: 'auto'
          }}>
            <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {difyDocumentContent || '暂无内容'}
            </Typography.Paragraph>
          </div>
          {/* 操作按钮 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
            <Button onClick={() => props.onCancel()}>取消</Button>
            <Button type="primary" onClick={() => handleOk()}>确定</Button>
          </div>
        </Col>
      </Row>
    </Modal>
  )
})

/**
 * Dify文档编辑模态框的属性接口
 */
interface IDifyDocumentEditModalProps {
  open: boolean                                    // 模态框显示状态
  roleInfo: IRoleInfo                              // 角色信息
  difyContent: string                              // Dify文档内容
  onOk: (isCreateMode: boolean, title: string, content: string) => void  // 确认编辑回调
  onCancel: () => void                             // 取消回调
}

/**
 * Dify文档编辑模态框组件
 * 用于创建新文档或编辑现有文档
 */
function DifyDocumentEditModal(props: IDifyDocumentEditModalProps) {

  // 是否为创建模式
  const [isCreateMode, setIsCreateMode] = useState<boolean>(false)
  // 模态框标题
  const [modalTitle, setModalTitle] = useState<string>(props.roleInfo.name_in_worldview || '')
  // 表单实例
  const [form] = Form.useForm()

  // 监听角色信息变化，设置模态框标题和模式
  useEffect(() => {
    let isCreateMode = false;

    if (!props.roleInfo.dify_document_id) {
      isCreateMode = true;
    }

    setIsCreateMode(isCreateMode)

    let roleName = props.roleInfo.name_in_worldview || '';
    let modalTitle = `编辑Dify文档`;

    if (isCreateMode) {
      modalTitle = `创建Dify文档`
    }

    if (roleName) {
      modalTitle += ` - ${roleName}`
    }

    setModalTitle(modalTitle)

  }, [props.roleInfo])

  // 监听模态框打开状态，初始化表单数据
  useEffect(() => {
    if (props.open) {

      let roleName = props.roleInfo.name_in_worldview || '';

      let documentContent = '', documentTitle = `角色设定：${roleName}`;

      if (isCreateMode) {
        // 创建模式下，根据角色信息生成默认内容
        documentContent = [
          '角色名称：' + props.roleInfo.name_in_worldview,
          '角色性别：' + (props.roleInfo.gender_in_worldview === 'male' ? '男' : '女'),
          '角色背景：' + props.roleInfo.background,
          '角色详情：' + props.roleInfo.personality,
        ].join('\n')
      } else {
        // 编辑模式下，使用现有内容
        documentContent = props.difyContent
      }

      form.setFieldsValue({
        title: documentTitle,
        content: documentContent
      })
    } else {
      form.resetFields()
    }
  }, [props.open])

  /**
   * 处理表单提交
   */
  const handleSubmit = useCallback(async () => {
    let values = await form.validateFields()
    props.onOk(isCreateMode, values.title, values.content)
  }, [isCreateMode, form, props.onOk])
  

  return (
    <Modal
      width={'70vw'}
      title={<span>{modalTitle}</span>}
      open={props.open}
      onCancel={props.onCancel}
      cancelText='取消'
      okText='提交'
      onOk={handleSubmit}
    >
      <Form form={form}>
        <Form.Item label="文档标题" name="title">
          <Input placeholder='请输入文档标题'/>
        </Form.Item>
        <Form.Item label="文档正文" name="content">
          <Input.TextArea
            placeholder='请输入文档正文'
            autoSize={{ minRows: 10 }}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

/**
 * 召回Dify文档组件的属性接口
 */
interface IRecallDifyDocumentProps {
  open: boolean                    // 模态框显示状态
  roleInfo: IRoleInfo              // 角色信息
  datasetId: string | null         // 数据集ID
  onOk: () => void                 // 确认回调
  onCancel: () => void             // 取消回调
  difyFrontHost: string
  difyFrontHostOptions: string[]
}

/**
 * 召回Dify文档组件
 * 用于刷新和召回Dify文档内容（当前功能未完全实现）
 */
const RecallDifyDocument = connect(mapStateToProps)(function(props: IRecallDifyDocumentProps) {

  // Dify数据集ID
  const [difyDatasetId, setDifyDatasetId] = useState<string>('');

  const [keyword, setKeyword] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);

  const [recallResult, setRecallResult] = useState<any[]>([]);

  const modalTitle = `召回Dify文档 - ${props.roleInfo.name_in_worldview}`;

  // 监听角色信息变化，设置数据集ID
  useEffect(() => {
    setDifyDatasetId(props.roleInfo.dify_dataset_id || props.datasetId || '')
  }, [props.roleInfo.dify_dataset_id, props.datasetId])

  useEffect(() => {
    if (props.open) {
      let keyword = props.roleInfo.name_in_worldview || '';
      setKeyword(keyword)
      handleRefresh(keyword)
    } else {
      setKeyword('')
    }
  }, [props.open])
  
  /**
   * 处理刷新操作
   * 当前功能未完全实现
   */
  const handleRefresh = useCallback(async (keyword: string) => {
    if (!difyDatasetId || !keyword) {
      message.error('数据集ID或召回关键词为空，请检查程序')
      return;
    }

    try {
      setLoading(true)
      let res = await recallDifyDocument(props.difyFrontHost, difyDatasetId, keyword)

      if (res.records.length > 0) {
        setRecallResult(res.records)
      } else {
        setRecallResult([])
        message.error('召回格式有误，请检查程序')
      }
    } catch (error) {
      message.error('召回失败，请检查程序')
    } finally {
      setLoading(false)
    }
  }, [props.roleInfo, difyDatasetId])

  function getColorOfScore(score: number, startColor: string = '#ff4d4f', endColor: string = '#52c41a'): string {
    // Convert hex to RGB
    const start = {
        r: parseInt(startColor.slice(1,3), 16),
        g: parseInt(startColor.slice(3,5), 16),
        b: parseInt(startColor.slice(5,7), 16)
    };
    
    const end = {
        r: parseInt(endColor.slice(1,3), 16),
        g: parseInt(endColor.slice(3,5), 16),
        b: parseInt(endColor.slice(5,7), 16)
    };

    // Interpolate between colors
    const r = Math.round(start.r + (end.r - start.r) * score);
    const g = Math.round(start.g + (end.g - start.g) * score);
    const b = Math.round(start.b + (end.b - start.b) * score);

    // Convert back to hex
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  }

  function renderScore(score: number) {
    return <span style={{ backgroundColor: getColorOfScore(score) }}>{score.toFixed(2)}</span>
  }

  return (
    <Modal
      width={'70vw'}
      title={<><span>{modalTitle}</span><Button type="link" icon={<RetweetOutlined />} onClick={() => handleRefresh(keyword)}>刷新</Button></>}
      open={props.open}
      onCancel={props.onCancel}
      footer={null}
    >
      <div className="f-flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Text>Dify主机：</Text>
        <Select options={props.difyFrontHostOptions.map(option => ({ label: option, value: option }))} value={props.difyFrontHost} onChange={e => store.dispatch(setFrontHost(e))}></Select>
        <Input style={{flex: 1, marginLeft: '16px'}} placeholder='请输入召回关键词' value={keyword} onChange={e => setKeyword(e.target.value)} prefix={<SearchOutlined />}></Input>
      </div>
      <Divider />
      <div style={{ minHeight: '50vh', overflow: 'auto' }}>
        <Space direction='vertical' style={{ width: '100%' }}>
        {
          loading ? (
            <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }} align='center'>
              正在召回...
            </Typography.Paragraph>
          ) : (!loading && !recallResult.length) ? (
            <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }} align='center'>
              暂无召回结果
            </Typography.Paragraph>
          ) : (
            recallResult.map((item: any) => (
              
              <Card size='small' title={<Space>
                <span>来源：{item.segment?.document?.name}</span> 
                {renderScore(item.score)}
              </Space>}>
                <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {item.segment.content}
                </Typography.Paragraph>
              </Card>
            ))
          )
        }
        </Space>
      </div>
    </Modal>
  )
})

/**
 * 加载工具配置
 * 根据世界观ID获取相关的Dify数据集配置
 */
async function loadToolConfig(worldViewId: number) {
  let res = await fetch.get('/api/aiNoval/toolConfig/params');

  let roleDatasetId = res?.data?.find((item: any) => item.cfg_name === `DIFY_ROLE_DATASET_ID_${worldViewId}`)?.cfg_value_string;

  return {
    roleDatasetId
  }
}

/**
 * 加载文档内容
 * 从Dify API获取指定文档的内容
 */
async function loadDocumentContent(difyFrontHost: string, difyDatasetId: string, documentId: string) {
  if (!documentId || !difyDatasetId) {
    message.error('文档ID或数据集ID为空，请检查程序');
    return;
  }

  console.debug('----------------- loadDocumentContent difyFrontHost: ', difyFrontHost, difyDatasetId, documentId)

  const difyBaseUrl = `http://${difyFrontHost}/v1`;
  const difyApi = new DifyApi(store.getState().difySlice.datasetsApiKey!, difyBaseUrl);
  let res = await difyApi.getDocumentContent(
      difyDatasetId, 
      documentId
  );

  let content: string[] = [];
  let createdAt: number = Infinity;
  let updatedAt: number = Infinity;

  let data = res?.data;
  if (data?.length > 0) {
      data.forEach((item: any) => {
          content.push(item.content);
          createdAt = Math.min(createdAt, item.created_at);
          updatedAt = Math.min(updatedAt, item.updated_at);
      });
  }

  return {
      content: content.join('\n\n'),
      createdAt: createdAt,
      updatedAt: updatedAt
  };
}

/**
 * 绑定角色信息文档
 * 将Dify文档绑定到角色信息
 */
async function bindRoleInfoDocument(roleInfoId: number, datasetId: string, documentId: string) {
  await fetch.post(
    '/api/aiNoval/role/info', 
    {
      dify_dataset_id: datasetId,
      dify_document_id: documentId
    },
    {
      params: {
        id: roleInfoId
      }
    }
  )
}

/**
 * 创建Dify文档
 * 在指定数据集中创建新的文档
 */
async function createDifyDocument(difyFrontHost: string, datasetId: string, documentTitle: string, documentContent: string) {
  const difyBaseUrl = `http://${difyFrontHost}/v1`;
  const difyApi = new DifyApi(store.getState().difySlice.datasetsApiKey!, difyBaseUrl);
  return await difyApi.createDocument(datasetId, documentTitle, documentContent);
}

/**
 * 更新Dify文档
 * 更新指定文档的内容
 */
async function updateDifyDocument(difyFrontHost: string, datasetId: string, documentId: string, documentTitle: string, documentContent: string) {
  const difyBaseUrl = `http://${difyFrontHost}/v1`;
  const difyApi = new DifyApi(store.getState().difySlice.datasetsApiKey!, difyBaseUrl);
  return await difyApi.updateDocument(datasetId, documentId, documentTitle, documentContent);
}

/**
 * 删除Dify文档
 * 删除指定的文档
 */
async function deleteDifyDocument(difyFrontHost: string, datasetId: string, documentId: string) {
  const difyBaseUrl = `http://${difyFrontHost}/v1`;
  const difyApi = new DifyApi(store.getState().difySlice.datasetsApiKey!, difyBaseUrl);
  let res = await difyApi.deleteDocument(datasetId, documentId);
  return res.data;
}


async function recallDifyDocument(difyFrontHost: string, datasetId: string, keyword: string) {
  const difyBaseUrl = `http://${difyFrontHost}/v1`;
  const difyApi = new DifyApi(store.getState().difySlice.datasetsApiKey!, difyBaseUrl);
  return await difyApi.queryDataset(datasetId, keyword);
}


