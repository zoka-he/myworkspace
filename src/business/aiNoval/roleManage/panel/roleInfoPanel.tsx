import { Card, Select, Button, Space, Typography, Descriptions, Dropdown, Alert, MenuProps, Modal, Divider, Row, Col, Radio, Pagination, message, Input, Form } from 'antd'
import { PlusOutlined, DownOutlined, EditOutlined, DeleteOutlined, SafetyCertificateFilled, SearchOutlined, CopyOutlined, RetweetOutlined } from '@ant-design/icons'
import { useState, useEffect, useCallback } from 'react'
import { IRoleData, IRoleInfo, IWorldViewData, IFactionDefData } from '@/src/types/IAiNoval'
import apiCalls from '../apiCalls'
import factionApiCalls from '@/src/business/aiNoval/factionManage/apiCalls'
import fetch from '@/src/fetch'
import DifyApi from '@/src/utils/dify/dify_api'

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
            <div className='f-flex-two-side'>
              <Title level={5} style={{ margin: 0 }}>版本信息</Title>

              {/* 版本操作按钮 */}
              <Space style={{ marginBottom: 10}} align='center'>
                <Button type="primary" icon={<EditOutlined />} onClick={() => handleEditRoleInfo(role)}>编辑版本</Button>
                <Button type="primary" icon={<DeleteOutlined />} onClick={() => handleDeleteRoleInfo(role)} danger>删除版本</Button>
              </Space>
            </div>
            
            {/* 版本详细信息 */}
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
            
            <DifyDocumentForRole roleInfo={role} onRequestUpdate={loadRoleVersions} />
          </>
        )}
      </Card>
    </div>
  )
}


interface IDifyDocumentForRoleProps {
  roleInfo: IRoleInfo
  onRequestUpdate?: () => void
}

function DifyDocumentForRole(props: IDifyDocumentForRoleProps) {

  let [difyDocumentContent, setDifyDocumentContent] = useState<string | null>(null)

  let [difyDatasetId, setDifyDatasetId] = useState<string | null>(null)

  let [difyDocumentId, setDifyDocumentId] = useState<string | null>(null)

  let [worldViewId, setWorldViewId] = useState<number | null>(null)

  let [difyDocumentModalOpen, setDifyDocumentModalOpen] = useState<boolean>(false)

  let [difyDocumentEditModalOpen, setDifyDocumentEditModalOpen] = useState<boolean>(false)

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

        let res = await createDifyDocument(difyDatasetId, title, content)
        console.debug('createDifyDocument res: ', res)
        if (res.document.id) {
          await bindRoleInfoDocument(props.roleInfo.id, difyDatasetId, res.document.id)
        }
      } else {
        if (!difyDocumentId) {
          message.error('文档ID为空，请检查程序');
          return;
        }

        await updateDifyDocument(difyDatasetId, difyDocumentId, title, content)
      }

      if (props.onRequestUpdate) {
        props.onRequestUpdate()
      }
    } catch (error) {
      message.error('编辑失败，请检查程序');
    }
  }, [props.roleInfo, difyDocumentContent, difyDatasetId, difyDocumentId])

  const handleCreateDifyDocument = useCallback(async () => {

  }, [props.roleInfo])

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
      await deleteDifyDocument(datasetId, documentId)
      await bindRoleInfoDocument(props.roleInfo.id, '', '');
      message.success('删除成功');

      if (props.onRequestUpdate) {
        props.onRequestUpdate()
      }
    } catch (error) {
      message.error('删除失败，请检查程序');
    }
  }, [props.roleInfo])

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

  useEffect(() => {
    if (!difyDatasetId || !difyDocumentId) {
      return
    }

    loadDocumentContent(difyDatasetId, difyDocumentId).then((res) => {
      setDifyDocumentContent(res!.content)
    })
  }, [difyDatasetId, difyDocumentId])


  let hasDifyDocument = false;
  if (props.roleInfo?.dify_document_id && props.roleInfo?.dify_document_id) {
    hasDifyDocument = true;
  }

  return (
    <>
      <div className='f-flex-two-side'>
        <Title level={5} style={{ margin: 0 }}>Dify文档</Title>
        <Space> 
          <Button type="default" size="small" icon={<RetweetOutlined />} onClick={() => {}}>召回</Button>
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
      {/* <div>
        <p>debug</p>
        <p>worldViewId: {worldViewId}</p>
        <p>difyDatasetId: {difyDatasetId}</p>
        <p>difyDocumentId: {difyDocumentId}</p>
      </div> */}
      <div style={{ marginTop: 16, backgroundColor: '#f5f5f5', padding: 16, borderRadius: 4, border: '1px solid #e0e0e0' }}>
        <Typography.Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
          {difyDocumentContent || '暂无内容'}
        </Typography.Paragraph>
      </div>

      <BindDifyDocumentModal
        open={difyDocumentModalOpen}
        datasetId={difyDatasetId}
        roleData={props.roleInfo}
        onOk={handleBindDifyDocument}
        onCancel={() => setDifyDocumentModalOpen(false)}
      />

      <DifyDocumentEditModal
        open={difyDocumentEditModalOpen}
        roleInfo={props.roleInfo}
        difyContent={difyDocumentContent || ''}
        onOk={handleEditDifyDocument}
        onCancel={() => setDifyDocumentEditModalOpen(false)}
      />
    </>
  )
}

interface IBindDifyDocumentModalProps {
  open: boolean
  datasetId: string | null
  roleData: IRoleInfo | null
  onOk: (datasetId: string, documentId: string) => void
  onCancel: () => void
}

function BindDifyDocumentModal(props: IBindDifyDocumentModalProps) {
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [fileList, setFileList] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [total, setTotal] = useState(0)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('')
  const [difyDocumentContent, setDifyDocumentContent] = useState<string | null>(null)


  useEffect(() => {
    loadDocumentList(props.datasetId);
  }, [])

  useEffect(() => {
    loadDocumentList(props.datasetId);
  }, [props.datasetId])

  useEffect(() => {
    if (!props.datasetId || !selectedDocumentId) {
      setDifyDocumentContent(null);
      return
    }

    loadDocumentContent(props.datasetId, selectedDocumentId).then((res) => {
      setDifyDocumentContent(res!.content)
    })
  }, [props.datasetId, selectedDocumentId])

  function loadDocumentList(datasetId?: string | null, page: number = 1, pageSize: number = 10, keyword: string = '') {
    if (!datasetId) {
      return
    }

    const difyApi = new DifyApi()
    difyApi.getDocumentList(datasetId, page, pageSize, keyword).then((res) => {
      setFileList(res.data)
      setTotal(res.total)
    })
  }

  const handlePageChange = useCallback((page: number, pageSize: number) => {
    setPage(page)
    setPageSize(pageSize)
    loadDocumentList(props.datasetId, page, pageSize, keyword)
  }, [props.datasetId, keyword])

  const handleOk = useCallback(() => {
    if (!props.datasetId || !selectedDocumentId) {
      message.error('文档ID或数据集ID为空，请检查程序');
      return;
    }

    props.onOk(props.datasetId, selectedDocumentId)
  }, [props.onOk, props.datasetId, selectedDocumentId])

  const handleKeywordChange = useCallback((value: string) => {
    setKeyword(value)
    _.debounce(() => {
      loadDocumentList(props.datasetId, 1, pageSize, value)
    }, 300)()
  }, [props.datasetId, pageSize])

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
      <div style={{ marginBottom: 16 }}>
        <Input placeholder='请输入文档名称' value={keyword} onChange={e => handleKeywordChange(e.target.value)} prefix={<SearchOutlined />}></Input>
      </div>
      <Row gutter={16}>
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
          <Pagination
            size="small"
            align='center'
            total={total}
            pageSize={pageSize}
            current={page}
            onChange={handlePageChange}
            />
        </Col>
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
            <Button onClick={() => props.onCancel()}>取消</Button>
            <Button type="primary" onClick={() => handleOk()}>确定</Button>
          </div>
        </Col>
      </Row>
    </Modal>
  )
}

interface IDifyDocumentEditModalProps {
  open: boolean
  roleInfo: IRoleInfo
  difyContent: string
  onOk: (isCreateMode: boolean, title: string, content: string) => void
  onCancel: () => void
}

function DifyDocumentEditModal(props: IDifyDocumentEditModalProps) {

  const [isCreateMode, setIsCreateMode] = useState<boolean>(false)

  const [modalTitle, setModalTitle] = useState<string>(props.roleInfo.name_in_worldview || '')

  const [form] = Form.useForm()

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

  useEffect(() => {
    if (props.open) {

      let roleName = props.roleInfo.name_in_worldview || '';

      let documentContent = '', documentTitle = `角色设定：${roleName}`;

      if (isCreateMode) {
        documentContent = [
          '角色名称：' + props.roleInfo.name_in_worldview,
          '角色性别：' + (props.roleInfo.gender_in_worldview === 'male' ? '男' : '女'),
          '角色背景：' + props.roleInfo.background,
          '角色详情：' + props.roleInfo.personality,
        ].join('\n')
      } else {
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

interface IRecallDifyDocumentProps {
  open: boolean
  roleInfo: IRoleInfo
  onOk: () => void
  onCancel: () => void
}

function RecallDifyDocument(props: IRecallDifyDocumentProps) {

  const [difyDatasetId, setDifyDatasetId] = useState<string>('');

  const modalTitle = `召回Dify文档 - ${props.roleInfo.name_in_worldview}`;

  useEffect(() => {
    setDifyDatasetId(props.roleInfo.dify_dataset_id || '')
  }, [props.roleInfo.dify_dataset_id])
  
  const handleRefresh = useCallback(() => {
    
  }, [props.roleInfo, difyDatasetId])

  return (
    <Modal
      width={'70vw'}
      title={<><span>{modalTitle}</span><Button type="link" icon={<RetweetOutlined />} onClick={() => props.onOk()}>刷新</Button></>}
      open={props.open}
      onCancel={props.onCancel}
      footer={null}
    >
    </Modal>
  )
}

async function loadToolConfig(worldViewId: number) {
  let res = await fetch.get('/api/aiNoval/toolConfig/params');

  let roleDatasetId = res?.data?.find((item: any) => item.cfg_name === `DIFY_ROLE_DATASET_ID_${worldViewId}`)?.cfg_value_string;

  return {
    roleDatasetId
  }
}

async function loadDocumentContent(difyDatasetId: string, documentId: string) {
  if (!documentId || !difyDatasetId) {
    message.error('文档ID或数据集ID为空，请检查程序');
    return;
  }

  const difyApi = new DifyApi();
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

async function createDifyDocument(datasetId: string, documentTitle: string, documentContent: string) {
  const difyApi = new DifyApi();
  return await difyApi.createDocument(datasetId, documentTitle, documentContent);
}

async function updateDifyDocument(datasetId: string, documentId: string, documentTitle: string, documentContent: string) {
  const difyApi = new DifyApi();
  return await difyApi.updateDocument(datasetId, documentId, documentTitle, documentContent);
}

async function deleteDifyDocument(datasetId: string, documentId: string) {
  const difyApi = new DifyApi();
  let res = await difyApi.deleteDocument(datasetId, documentId);
  return res.data;
}





