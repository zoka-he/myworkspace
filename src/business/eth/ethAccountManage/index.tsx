import { useState, useRef, useEffect, useCallback } from 'react';
import fetch from '@/src/fetch';
import { Button, Input, Space, Table, message, Tag, Modal, Form, InputNumber, Select, Card, Row, Col, Statistic, Alert } from 'antd';
import { ExclamationCircleFilled, CopyOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, WalletOutlined, DollarOutlined, ReloadOutlined } from '@ant-design/icons';
import confirm from "antd/es/modal/confirm";
import { IEthAccount, IEthNetwork } from '../../../types/IEthAccount';
import QueryBar from '@/src/components/queryBar';
import usePagination from '@/src/utils/hooks/usePagination';
import copyToClip from '@/src/utils/common/copy';
import dayjs from 'dayjs';
import styles from './index.module.scss';
import _ from 'lodash';

const { Column } = Table;
const { Option } = Select;

const balanceRefreshInterval = 30 * 1000;

export default function EthAccountManage() {
    let [userParams, setUserParams] = useState({});
    let [listData, updateListData] = useState<IEthAccount[]>([]);
    let [networkList, setNetworkList] = useState<IEthNetwork[]>([]);
    let [spinning, updateSpinning] = useState(false);
    let [isModalVisible, setIsModalVisible] = useState(false);
    let [editingAccount, setEditingAccount] = useState<IEthAccount | null>(null);
    let [form] = Form.useForm();
    let pagination = usePagination();

    // let [balanceRefreshTime, setBalanceRefreshTime] = useState(0);
    let [balanceRefreshCount, setBalanceRefreshCount] = useState(0);

    let balanceRefreshTime = useRef(0);
    let timer = useRef<NodeJS.Timeout>();

    useEffect(() => {
        onQuery();
        loadNetworks();
        balanceRefreshTime.current = Date.now() + balanceRefreshInterval;

        timer.current = setInterval(() => {
            let dt = Math.floor((balanceRefreshTime.current - Date.now()) / 1000);
            setBalanceRefreshCount(dt);

            if (dt <= 0) {
                refreshAllBalances();
                balanceRefreshTime.current = Date.now() + balanceRefreshInterval;
            }
        }, 500);

        return () => {
            clearInterval(timer.current);
            timer.current = undefined;
        }
    }, []);

    useEffect(() => {
        onQuery();
    }, [userParams, pagination.page, pagination.pageSize]);

    async function loadNetworks() {
        try {
            // @ts-ignore
            let {data} = await fetch.get('/api/eth/network', { params: { page: 1, limit: 100 } });
            setNetworkList(data || []);
        } catch (e: any) {
            console.error('加载网络列表失败:', e);
            message.error('加载网络列表失败');
        }
    }

    async function onQuery() {
        try {
            updateSpinning(true);

            let params: any = {
                ...userParams,
                page: pagination.page,
                limit: pagination.pageSize
            }

            // @ts-ignore
            let {data, count} = await fetch.get('/api/eth/account', { params })

            updateListData(data || []);
            pagination.setTotal(count || 0);
        } catch (e:any) {
            console.error(e);
            message.error(e.message || '查询失败');
        } finally {
            updateSpinning(false);
        }
    }

    function onCreateAccount() {
        setEditingAccount(null);
        form.resetFields();
        setIsModalVisible(true);
    }

    function onEditAccount(account: IEthAccount) {
        setEditingAccount(account);
        form.setFieldsValue({
            ...account,
            balance: account.balance ? parseFloat(account.balance.toString()) : 0
        });
        setIsModalVisible(true);
    }

    function onDeleteAccount(account: IEthAccount) {
        confirm({
            title: '删除确认',
            icon: <ExclamationCircleFilled />,
            content: `确定要删除账户 "${account.name}" 吗？`,
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            async onOk() {
                try {
                    await fetch.delete('/api/eth/account', { 
                        params: { id: account.id } 
                    });
                    message.success('删除成功');
                    onQuery();
                } catch (e: any) {
                    message.error(e.message || '删除失败');
                }
            },
        });
    }

    function onViewAccount(account: IEthAccount) {
        Modal.info({
            title: '账户详情',
            width: 600,
            content: (
                <div>
                    <dl><dt>账户名称：</dt><dd>{account.name}</dd></dl>
                    <dl><dt>钱包地址：</dt><dd>{account.address}</dd></dl>
                    <dl><dt>私钥：</dt><dd>{account.private_key || '未设置'}</dd></dl>
                    <dl><dt>余额：</dt><dd>{account.balance} ETH</dd></dl>
                    <dl><dt>网络：</dt><dd>{account.network}</dd></dl>
                    <dl><dt>备注：</dt><dd>{account.remark || '无'}</dd></dl>
                    <dl><dt>创建时间：</dt><dd>{dayjs(account.create_time).format('YYYY-MM-DD HH:mm:ss')}</dd></dl>
                </div>
            )
        });
    }

    async function handleModalOk() {
        try {
            const values = await form.validateFields();
            if (!values.private_key) {
                values.private_key = '';
            }

            if (!values.remark) {
                values.remark = '';
            }
            
            if (editingAccount) {
                await fetch.put('/api/eth/account', { 
                    ...values, 
                    id: editingAccount.id 
                });
                message.success('更新成功');
            } else {
                await fetch.post('/api/eth/account', values);
                message.success('创建成功');
            }
            
            setIsModalVisible(false);
            onQuery();
        } catch (e: any) {
            message.error(e.message || '操作失败');
        }
    }

    function renderAction(cell: any, row: IEthAccount) {
        return (
            <div className={styles.actionButtons}>
                <Button 
                    size="small" 
                    type="primary" 
                    icon={<EditOutlined />} 
                    onClick={() => onEditAccount(row)}
                >
                    编辑
                </Button>
                <Button 
                    size="small" 
                    danger 
                    icon={<DeleteOutlined />} 
                    onClick={() => onDeleteAccount(row)}
                >
                    删除
                </Button>
            </div>
        )
    }

    function renderCopyableCell(cell: string) {
        return (
            <Space>
                <Button
                    size="small"
                    type="link"
                    icon={<CopyOutlined />}
                    className={styles.copyButton}
                    onClick={() => {
                        copyToClip(cell);
                        message.success('已复制');
                    }}
                >
                    {cell}
                </Button>
            </Space>
        );
    }

    function renderBalance(balance: number, row: any) {
        return (
            <div style={{ textAlign: 'right' }}>
                <Space align='end'>
                    <span className={styles.balanceDisplay}>{row.balance || '--'} {row.unit}</span>
                    <Button
                        size="small"
                        type="link"
                        icon={<ReloadOutlined />}
                        className={styles.copyButton}
                        onClick={async () => {
                            let account = row;
                            let balance = await refreshBalance(account.address, account.network_id);

                            if (balance === null) {
                                message.error('获取余额失败');
                                return;
                            }

                            listData.splice(listData.indexOf(account), 1, {
                                ...account,
                                balance: balance || 0
                            });
                            Modal.info({
                                title: '更新余额',
                                content: `已更新账户${account.address}的余额，当前余额是${balance}`,
                                onOk: () => {}
                            });
                        }}
                    >
                    </Button>
                </Space>
            </div>
        )
    }

    function renderNetwork(network: string, row: any) {
        return <Tag className={`${styles.networkTag} ${styles[network]}`}>{network}({row.chain_id})</Tag>;
    }

    function renderRemark(cell: string) {
        return <pre className="f-no-margin">{cell}</pre>
    }

    async function refreshBalance(address: string, chain_id: number) {
        // throw new Error('Function not implemented.');
        try {
            // @ts-ignore
            let data = await fetch.get('/api/eth/account/balance', { params: { address, network_id: chain_id } });
            console.debug(data);
            return ((data as any)?.balance) as number || 0.0;
        } catch (e: any) {
            console.error(e.response?.data?.message || e.message);
            // message.error(e.response?.data?.message || e.message || '获取余额失败');
            return null;
        }
    }

    const refreshAllBalances = useCallback(() => {
        listData.forEach(async (account: IEthAccount, index: number) => {
            if (account.address && account.chain_id) {
                let balance = await refreshBalance(account.address, account.network_id);
                listData.splice(index, 1, {
                    ...account,
                    balance: balance || 0
                });

                updateListData(listData);
            }
        });
    }, [listData]);

    // 计算统计数据
    const totalAccounts = listData.length;
    const totalBalance = listData.reduce((sum, account) => sum + (_.toNumber(account.balance) || 0), 0);
    const mainnetAccounts = listData.filter(account => account.network === 'mainnet').length;

    return (
        <div className={`f-fit-height f-flex-col ${styles.ethAccountManage}`}>
            {/* 统计卡片 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                    <Card className={styles.statsCard}>
                        <Statistic
                            title="总账户数"
                            value={totalAccounts}
                            prefix={<WalletOutlined />}
                            valueStyle={{ color: '#fff' }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card className={styles.statsCard}>
                        <Statistic
                            title="总余额"
                            value={totalBalance}
                            precision={3}
                            suffix="ETH"
                            prefix={<DollarOutlined />}
                            valueStyle={{ color: '#fff' }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card className={styles.statsCard}>
                        <Statistic
                            title="主网账户"
                            value={mainnetAccounts}
                            prefix={<WalletOutlined />}
                            valueStyle={{ color: '#fff' }}
                        />
                    </Card>
                </Col>
            </Row>

            <div className={styles.alert_container}>
                <Alert message={`${balanceRefreshCount}秒后刷新`} type="warning" showIcon style={{ textAlign: 'center' }} />
            </div>

            <div className="f-flex-two-side">
                <QueryBar onChange={onQuery} spinning={spinning} className={styles.queryBar}>
                    <QueryBar.QueryItem name="name" label="账户名称">
                        <Input allowClear placeholder="请输入账户名称"/>
                    </QueryBar.QueryItem>

                    <QueryBar.QueryItem name="address" label="钱包地址">
                        <Input allowClear placeholder="请输入钱包地址"/>
                    </QueryBar.QueryItem>

                    <QueryBar.QueryItem name="network" label="默认网络">
                        <Select allowClear placeholder="请选择网络">
                            {networkList.map(network => (
                                <Option key={network.id} value={network.name}>
                                    {network.name}
                                </Option>
                            ))}
                        </Select>
                    </QueryBar.QueryItem>
                </QueryBar>

                <Space>
                    <Button type="primary" icon={<PlusOutlined />} onClick={onCreateAccount}>
                        新增账户
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
                    <Column title="账户名称" dataIndex="name" key="name" width={120}/>
                    <Column 
                        title="钱包地址" 
                        dataIndex="address" 
                        key="address" 
                        render={renderCopyableCell}
                        width={200}
                    />
                    <Column 
                        title="余额" 
                        dataIndex="balance" 
                        key="balance" 
                        render={renderBalance}
                        width={130}
                    />
                    <Column 
                        title="默认网络" 
                        dataIndex="network" 
                        key="network" 
                        render={renderNetwork}
                        width={100}
                    />
                    <Column 
                        title="备注" 
                        dataIndex="remark" 
                        key="remark" 
                        render={renderRemark}
                        width={200}
                    />
                    <Column 
                        title="创建时间" 
                        dataIndex="create_time" 
                        key="create_time"
                        render={(time) => dayjs(time).format('YYYY-MM-DD HH:mm:ss')}
                        width={90}
                    />
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
                title={editingAccount ? '编辑ETH账户' : '新增ETH账户'}
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
                        balance: 0
                    }}
                >
                    <Form.Item
                        name="name"
                        label="账户名称"
                        rules={[{ required: true, message: '请输入账户名称' }]}
                    >
                        <Input placeholder="请输入账户名称"/>
                    </Form.Item>

                    <Form.Item
                        name="address"
                        label="钱包地址"
                        rules={[
                            { required: true, message: '请输入钱包地址' },
                            { pattern: /^0x[a-fA-F0-9]{40}$/, message: '请输入有效的以太坊地址' }
                        ]}
                    >
                        <Input placeholder="0x..." />
                    </Form.Item>

                    <Form.Item
                        name="private_key"
                        label="私钥"
                        rules={[
                            { pattern: /^(0x)?[a-fA-F0-9]{64}$/, message: '请输入有效的私钥' }
                        ]}
                    >
                        <Input 
                            placeholder="0x..." 
                            className={styles.privateKeyInput}
                        />
                    </Form.Item>

                    <Form.Item
                        name="network_id"
                        label="默认网络"
                        rules={[{ required: true, message: '请选择网络' }]}
                    >
                        <Select placeholder="请选择网络">
                            {networkList.map(network => (
                                <Option key={network.id} value={network.id}>
                                    {network.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="remark"
                        label="备注"
                    >
                        <Input.TextArea rows={3} placeholder="请输入备注信息"/>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}


