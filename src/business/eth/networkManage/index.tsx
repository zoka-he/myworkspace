import { useState, useEffect } from 'react';
import fetch from '@/src/fetch';
import { 
    Button, 
    Input, 
    Space, 
    Table, 
    message, 
    Tag, 
    Modal, 
    Form, 
    InputNumber, 
    Select, 
    Card, 
    Row, 
    Col, 
    Statistic,
    Switch,
    Tooltip
} from 'antd';
import { 
    PlusOutlined, 
    EditOutlined, 
    DeleteOutlined, 
    EyeOutlined, 
    GlobalOutlined, 
    LinkOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    CopyOutlined,
    WarningOutlined,
    ExclamationCircleFilled
} from '@ant-design/icons';
import confirm from "antd/es/modal/confirm";
import { IEthNetwork } from '../../../types/IEthAccount';
import QueryBar from '@/src/components/queryBar';
import usePagination from '@/src/utils/hooks/usePagination';
import dayjs from 'dayjs';
import styles from './index.module.scss';

const { Column } = Table;
const { Option } = Select;

const urlLimit = 60;

export default function EthNetworkManage() {
    let [userParams, setUserParams] = useState({});
    let [listData, updateListData] = useState<IEthNetwork[]>([]);
    let [spinning, updateSpinning] = useState(false);
    let [isModalVisible, setIsModalVisible] = useState(false);
    let [editingNetwork, setEditingNetwork] = useState<IEthNetwork | null>(null);
    let [form] = Form.useForm();

    let pagination = usePagination();

    useEffect(() => {
        onQuery();
    }, []);

    useEffect(() => {
        onQuery();
    }, [userParams, pagination.page, pagination.pageSize]);

    async function onQuery() {
        try {
            updateSpinning(true);

            let params: any = {
                ...userParams,
                page: pagination.page,
                limit: pagination.pageSize
            }

            // @ts-ignore
            let {data, count} = await fetch.get('/api/eth/network', { params })

            updateListData(data || []);
            pagination.setTotal(count || 0);
        } catch (e:any) {
            console.error(e);
            message.error(e.message || '查询失败');
        } finally {
            updateSpinning(false);
        }
    }

    function onCreateNetwork() {
        setEditingNetwork(null);
        form.resetFields();
        setIsModalVisible(true);
    }

    function onEditNetwork(network: IEthNetwork) {
        setEditingNetwork(network);
        form.setFieldsValue({
            ...network,
            chainId: network.chain_id
        });
        setIsModalVisible(true);
    }

    function onDeleteNetwork(network: IEthNetwork) {
        confirm({
            title: '删除确认',
            icon: <ExclamationCircleFilled />,
            content: `确定要删除网络 "${network.name}" 吗？`,
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            async onOk() {
                try {
                    await fetch.delete('/api/eth/network', { 
                        params: { id: network.id } 
                    });
                    message.success('删除成功');
                    onQuery();
                } catch (e: any) {
                    message.error(e.message || '删除失败');
                }
            },
        });
    }

    function onViewNetwork(network: IEthNetwork) {
        Modal.info({
            title: '网络详情',
            width: 600,
            content: (
                <div>
                    <p><strong>网络名称：</strong>{network.name}</p>
                    <p><strong>链ID：</strong>{network.chain_id}</p>
                    <p><strong>RPC URL：</strong>{network.rpc_url}</p>
                    <p><strong>浏览器URL：</strong>{network.explorer_url}</p>
                    <p><strong>测试网：</strong>{network.is_testnet ? '是' : '否'}</p>
                </div>
            )
        });
    }

    async function handleModalOk() {
        try {
            const values = await form.validateFields();
            
            if (editingNetwork) {
                await fetch.put('/api/eth/network', { 
                    ...values, 
                    id: editingNetwork.id 
                });
                message.success('更新成功');
            } else {
                await fetch.post('/api/eth/network', values);
                message.success('创建成功');
            }
            
            setIsModalVisible(false);
            onQuery();
        } catch (e: any) {
            message.error(e.message || '操作失败');
        }
    }

    function renderAction(cell: any, row: IEthNetwork) {
        return (
            <div className={styles.actionButtons}>
                {/* <Button 
                    size="small" 
                    icon={<EyeOutlined />} 
                    onClick={() => onViewNetwork(row)}
                >
                    查看
                </Button> */}
                <Button 
                    size="small" 
                    type="primary" 
                    icon={<EditOutlined />} 
                    onClick={() => onEditNetwork(row)}
                >
                    编辑
                </Button>
                <Button 
                    size="small" 
                    danger 
                    icon={<DeleteOutlined />} 
                    onClick={() => onDeleteNetwork(row)}
                >
                    删除
                </Button>
            </div>
        )
    }

    function renderRpcUrl(url?: string, row: IEthNetwork) {
        if (!url) {
            return '-';
        }else{
            return (
                <div className={[styles.urlInfo, styles.urlDisplay, row.vendor !== 'custom' ? styles.isNotCustom : ''].join(' ')}>
                    { row.vendor === 'custom' ? (<CopyOutlined />) : null}
                    { row.vendor !== 'custom' ? (
                        <Tooltip title="当前网络供应商不是自定义，不使用此URL">
                            <span>
                                <ExclamationCircleFilled />
                            </span>
                        </Tooltip>
                    ) : null}
                    <Button 
                        className={[styles.urlValue].join(' ')}
                        type="text"
                        size="small"
                        disabled={row.vendor !== 'custom'}
                        onClick={() => copyToClipboard(url)}
                    >{url.length > urlLimit ? `${url.substring(0, urlLimit)}...` : url}</Button>
                </div>
            );
        }
    }

    function renderExplorerUrl(url?: string, row: IEthNetwork) {
        if (!url) {
            return '-';
        } else {
            return (
                <div className={[styles.urlInfo, styles.urlDisplay].join(' ')}>
                    <CopyOutlined />
                    <Button 
                        className={[styles.urlValue].join(' ')}
                        type="text"
                        size="small"
                        onClick={() => copyToClipboard(url)}
                    >{url.length > urlLimit ? `${url.substring(0, urlLimit)}...` : url}</Button>
                </div>
            );
        }
    }

    function renderTestnet(isTestnet: boolean) {
        return (
            <Tag color={isTestnet ? 'orange' : 'green'}>
                {isTestnet ? '测试网' : '主网'}
            </Tag>
        );
    }

    function renderIsEnable(is_enable: boolean | 0 | 1, network: IEthNetwork) {
        // 这里可以添加网络连接状态检查逻辑
        return (
            <Switch checked={is_enable === true || is_enable === 1} onChange={(checked) => onToggleNetwork(network, checked)} />
        );
    }

    async function onToggleNetwork(network: IEthNetwork, checked: boolean) {
        try {
            await fetch.put('/api/eth/network', { 
                ...network, 
                is_enable: checked ? 1 : 0 
            });

            await onQuery();
            message.success('操作成功');
        } catch (e: any) {
            message.error(e.message || '操作失败');
        }
    }

    // 复制到剪贴板的函数
    async function copyToClipboard(text: string) {
        try {
            await navigator.clipboard.writeText(text);
            message.success('已复制到剪贴板');
        } catch (err) {
            // 如果现代API失败，使用传统方法
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            message.success('已复制到剪贴板');
        }
    }

    // 计算统计数据
    const totalNetworks = listData.length;
    const testnetCount = listData.filter(network => network.is_testnet).length;
    const mainnetCount = listData.filter(network => !network.is_testnet).length;

    return (
        <div className={`f-fit-height f-flex-col ${styles.ethNetworkManage}`}>
            {/* 统计卡片 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                    <Card className={styles.statsCard}>
                        <Statistic
                            title="总网络数"
                            value={totalNetworks}
                            prefix={<GlobalOutlined />}
                            valueStyle={{ color: '#fff' }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card className={styles.statsCard}>
                        <Statistic
                            title="主网数量"
                            value={mainnetCount}
                            prefix={<GlobalOutlined />}
                            valueStyle={{ color: '#fff' }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card className={styles.statsCard}>
                        <Statistic
                            title="测试网数量"
                            value={testnetCount}
                            prefix={<GlobalOutlined />}
                            valueStyle={{ color: '#fff' }}
                        />
                    </Card>
                </Col>
            </Row>

            <div className="f-flex-two-side">
                <QueryBar onChange={onQuery} spinning={spinning} className={styles.queryBar}>
                    <QueryBar.QueryItem name="name" label="网络名称">
                        <Input allowClear placeholder="请输入网络名称"/>
                    </QueryBar.QueryItem>

                    <QueryBar.QueryItem name="chainId" label="链ID">
                        <InputNumber placeholder="请输入链ID" style={{ width: '100%' }}/>
                    </QueryBar.QueryItem>

                    <QueryBar.QueryItem name="isTestnet" label="网络类型">
                        <Select allowClear placeholder="请选择网络类型">
                            <Option value="true">测试网</Option>
                            <Option value="false">主网</Option>
                        </Select>
                    </QueryBar.QueryItem>
                </QueryBar>

                <Space>
                    <Button type="primary" icon={<PlusOutlined />} onClick={onCreateNetwork}>
                        新增网络
                    </Button>
                </Space>
            </div>

            <div className={`f-flex-1 ${styles.tableContainer}`} style={{ margin: '12px 0' }}>
                <Table 
                    dataSource={listData} 
                    size="small" 
                    pagination={{
                        current: pagination.page,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        onChange: (page, pageSize) => {
                            pagination.setPage(page);
                            pagination.setPageSize(pageSize);
                        },
                        showTotal: (total) => `共 ${total} 条记录`,
                        showSizeChanger: true,
                        showQuickJumper: true
                    }}
                    rowKey="id"
                    scroll={{ x: 1200 }}
                >
                    <Column title="网络名称" dataIndex="name" key="name" width={120}/>
                    <Column 
                        title="链ID" 
                        dataIndex="chain_id" 
                        key="chainId" 
                        width={80}
                    />
                    <Column 
                        title="供应商" 
                        dataIndex="vendor" 
                        key="vendor" 
                        width={100}
                    />
                    <Column 
                        title="单位" 
                        dataIndex="unit" 
                        key="unit" 
                        width={60}
                    />
                    <Column 
                        title="RPC URL" 
                        dataIndex="rpc_url" 
                        key="rpcUrl" 
                        render={renderRpcUrl}
                        width={240}
                    />
                    <Column 
                        title="浏览器URL" 
                        dataIndex="explorer_url" 
                        key="explorerUrl" 
                        render={renderExplorerUrl}
                        width={160}
                    />
                    <Column 
                        title="网络类型" 
                        dataIndex="is_testnet" 
                        key="isTestnet" 
                        render={renderTestnet}
                        width={60}
                    />
                    <Column 
                        title="是否启用" 
                        dataIndex="is_enable" 
                        key="isEnable" 
                        render={renderIsEnable}
                        width={60}
                    />
                    
                    

                    {/* <Column 
                        title="状态" 
                        dataIndex="status" 
                        key="status" 
                        render={(_, record: IEthNetwork) => renderStatus(record)}
                        width={100}
                    /> */}
                    <Column 
                        title="操作" 
                        dataIndex="action" 
                        key="action" 
                        fixed="right" 
                        width={100} 
                        render={renderAction}
                    />
                </Table>
            </div>

            <Modal
                title={editingNetwork ? '编辑ETH网络' : '新增ETH网络'}
                open={isModalVisible}
                onOk={handleModalOk}
                onCancel={() => setIsModalVisible(false)}
                width={600}
                className={styles.modalForm}
            >
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{
                        isTestnet: false
                    }}
                >
                    <Form.Item
                        name="name"
                        label="网络名称"
                        rules={[{ required: true, message: '请输入网络名称' }]}
                    >
                        <Input placeholder="请输入网络名称"/>
                    </Form.Item>

                    <Form.Item
                        name="chain_id"
                        label="链ID"
                        rules={[{ required: true, message: '请输入链ID' }]}
                    >
                        <InputNumber 
                            min={1} 
                            style={{ width: '100%' }}
                            placeholder="请输入链ID"
                        />
                    </Form.Item>

                    <Form.Item
                        name="vendor"
                        label="供应商"
                    >
                        <Select placeholder="请输入供应商" allowClear>
                            <Option value="etherscan">Etherscan</Option>
                            <Option value="infura">Infura</Option>
                            <Option value="alchemy">Alchemy</Option>
                            <Option value="ankr">Ankr</Option>
                            <Option value="quicknode">Quicknode</Option>
                            <Option value="ankr">Ankr</Option>
                            <Option value="custom">自定义</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="rpc_url"
                        label="RPC URL（供应商为自定义时必填，否则会自动使用供应商的默认URL）"
                        dependencies={['vendor']}
                        rules={[
                            ({ getFieldValue }) => ({
                                required: getFieldValue('vendor') === 'custom',
                                message: '请输入RPC URL'
                            }),
                            { type: 'url', message: '请输入有效的URL' }
                        ]}
                    >
                        <Input placeholder="https://..." />
                    </Form.Item>

                    <Form.Item
                        name="explorer_url"
                        label="浏览器URL"
                        rules={[
                            { required: true, message: '请输入浏览器URL' },
                            { type: 'url', message: '请输入有效的URL' }
                        ]}
                    >
                        <Input placeholder="https://..." />
                    </Form.Item>

                    <Row>
                        <Col span={12}>
                            <Form.Item
                                name="is_testnet"
                                label="是否为测试网"
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="is_enable"
                                label="是否启用"
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item
                                name="unit"
                                label="单位"
                            >
                                <Input placeholder="请输入单位"/>
                            </Form.Item>
                        </Col>
                        
                        <Col span={8}>
                            <Form.Item
                                name="unit_full"
                                label="单位全称"
                            >
                                <Input placeholder="请输入单位全称"/>
                            </Form.Item>
                        </Col>

                        <Col span={8}>
                            <Form.Item
                                name="decimals"
                                label="小数位数"
                            >
                                <InputNumber placeholder="请输入小数位数"/>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </div>
    )
}
