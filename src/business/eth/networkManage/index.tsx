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
    ExclamationCircleFilled, 
    PlusOutlined, 
    EditOutlined, 
    DeleteOutlined, 
    EyeOutlined, 
    GlobalOutlined, 
    LinkOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    CopyOutlined
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

    function renderRpcUrl(url?: string) {
        if (!url) {
            return '-';
        }else{
            return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Tooltip title={url}>
                        <span className={styles.urlDisplay}>
                            {url.length > urlLimit ? `${url.substring(0, urlLimit)}...` : url}
                        </span>
                    </Tooltip>
                    <Tooltip title="复制URL">
                        <Button 
                            type="text" 
                            size="small" 
                            icon={<CopyOutlined />} 
                            onClick={() => copyToClipboard(url)}
                            style={{ 
                                padding: '4px', 
                                marginLeft: '8px',
                                color: 'inherit'
                            }}
                        />
                    </Tooltip>
                </div>
            );
        }
    }

    function renderExplorerUrl(url?: string) {
        if (!url) {
            return '-';
        }else{
            return (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Tooltip title={url}>
                        <span className={styles.urlDisplay}>
                            {url.length > urlLimit ? `${url.substring(0, urlLimit)}...` : url}
                        </span>
                    </Tooltip>
                    <Tooltip title="复制URL">
                        <Button 
                            type="text" 
                            size="small" 
                            icon={<CopyOutlined />} 
                            onClick={() => copyToClipboard(url)}
                            style={{ 
                                padding: '4px', 
                                marginLeft: '8px',
                                color: 'inherit'
                            }}
                        />
                    </Tooltip>
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

    function renderStatus(network: IEthNetwork) {
        // 这里可以添加网络连接状态检查逻辑
        return (
            <Tag color="green" icon={<CheckCircleOutlined />}>
                正常
            </Tag>
        );
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
                <QueryBar onChange={setUserParams} spinning={spinning} className={styles.queryBar}>
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
                        title="RPC URL" 
                        dataIndex="rpc_url" 
                        key="rpcUrl" 
                        render={renderRpcUrl}
                        width={200}
                    />
                    <Column 
                        title="浏览器URL" 
                        dataIndex="explorer_url" 
                        key="explorerUrl" 
                        render={renderExplorerUrl}
                        width={200}
                    />
                    <Column 
                        title="网络类型" 
                        dataIndex="is_testnet" 
                        key="isTestnet" 
                        render={renderTestnet}
                        width={100}
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
                        width={200} 
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
                        name="rpc_url"
                        label="RPC URL"
                        rules={[
                            { required: true, message: '请输入RPC URL' },
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

                    <Form.Item
                        name="is_testnet"
                        label="是否为测试网"
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
