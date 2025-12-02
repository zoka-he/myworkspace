import { Card, Button, Typography, Row, Col, Tabs, Table, Descriptions, Tag, Space, Input, Spin, message, Form, InputNumber, Select, Divider, Alert, Modal, Segmented, Checkbox } from "antd";
import { useState, useEffect } from "react";
import { TransactionOutlined, SearchOutlined, CopyOutlined, ArrowUpOutlined, ArrowDownOutlined, SendOutlined, WalletOutlined, SettingOutlined, ReloadOutlined, ExclamationCircleOutlined, EditOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { WalletInfo } from "@/src/utils/ethereum/metamask";
import copyToClip from '@/src/utils/common/copy';
import fetch from '@/src/fetch';
import styles from './WalletActions.module.scss';
import transactionHistoryStyles from './TransactionHistory.module.scss';
import { IWalletInfo } from '../IWalletInfo';
import { ethers } from 'ethers';
import TransactionSend from './TransactionSend';

const { Title, Paragraph } = Typography;
const { Column } = Table;

interface WalletActionsProps {
    walletInfo?: IWalletInfo | null;
}

export default function WalletActions(props: WalletActionsProps) {
    let tabs = [
        
        {
            key: '1',
            label: '交易发送',
            children: <TransactionSend walletInfo={props.walletInfo}/>,
        },
        {
            key: '2',
            label: '交易历史',
            children: <TransactionHistory walletInfo={props.walletInfo}/>,
        },
        {
            key: '3',
            label: '扫链',
            children: <div>实现中...</div>
        }
    ];


    return (
        <Card className={styles.transactionCard}>
            <div className={styles.cardHeader}>
                <TransactionOutlined className={styles.cardIcon} />
                <Title level={4} className={styles.cardTitle}>交易功能</Title>
            </div>
            {props.walletInfo && (
                <>
                    <Paragraph type="secondary">
                        钱包连接成功！您现在可以：
                    </Paragraph>
                    <Row>
                        <Col span={8}>
                            <ul className={styles.featureList}>
                                <li>查看账户余额和交易历史（开发中）</li>
                                <li>发送和接收以太坊（开发中）</li>
                            </ul>
                        </Col>
                        <Col span={8}>
                            <ul className={styles.featureList}>
                                <li>与智能合约交互（未开发）</li>
                                <li>管理NFT和代币（未开发）</li>
                            </ul>
                        </Col>
                    </Row>
                    
                    

                    {/* <div className={styles.comingSoon}>
                        <Button type="dashed" disabled>
                        更多功能即将推出...
                        </Button>
                    </div> */}

                    <Tabs items={tabs} defaultActiveKey="1"></Tabs>
                </>
            )}
        </Card>
    );
}

// 交易历史数据类型
interface Transaction {
    id: string;
    hash: string;
    from: string;
    to: string;
    value: string;
    fee: string;
    status: 'success' | 'pending' | 'failed';
    type: 'send' | 'receive';
    timestamp: number;
    blockNumber: number;
    gasUsed: string;
    gasPrice: string;
}

function TransactionHistory(props: WalletActionsProps) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    // const [networkId, setNetworkId] = useState<number | null>(null);

    // 获取交易历史
    const fetchTransactions = async (page: number = 1, pageSize: number = 10) => {

        if (!props.walletInfo) {
            message.warning('请先连接钱包');
            return;
        }

        const chainId = props.walletInfo?.networkInfo?.chainId;
        const networkId = props.walletInfo?.networkId;
        const address = props.walletInfo?.address;

        if (!chainId) {
            message.warning('请先选择网络');
            return;
        }

        if (!address) {
            message.warning('请先连接钱包');
            return;
        }

        setLoading(true);
        
        // 清空
        setTransactions([]);
        setPagination(prev => ({
            ...prev,
            current: page,
            pageSize,
            total: 0,
        }));

        try {
            const response = await fetch.get('/api/eth/account/transactions', {
                params: {
                    address: address,
                    network_id: networkId,
                    page,
                    limit: pageSize,
                },
                timeout: 120 * 10000,
            });

            if (response.data) {
                setTransactions(response.data.data || []);
                setPagination(prev => ({
                    ...prev,
                    current: page,
                    pageSize,
                    total: response.data.count || 0,
                }));

                // 选择第一条交易
                if (response.data.data && response.data.data.length > 0) {
                    setSelectedTransaction(response.data.data[0]);
                }
            }
        } catch (error: any) {
            console.error('获取交易历史失败:', error);
            message.error(error.message || '获取交易历史失败');
            
            // 如果 API 失败，使用模拟数据
            // loadMockData();
        } finally {
            setLoading(false);
        }
    };

    // 初始化加载
    useEffect(() => {
        // 默认使用以太坊主网 ID (1)
        // setNetworkId(1);
        // fetchTransactions();
    }, []);

    // 分页变化
    const handleTableChange = (pagination: any) => {
        // fetchTransactions(pagination.current, pagination.pageSize);
    };

    // 过滤交易
    const filteredTransactions = transactions.filter(tx => {
        if (!searchValue) return true;
        const searchLower = searchValue.toLowerCase();
        return (
            tx.hash.toLowerCase().includes(searchLower) ||
            tx.from.toLowerCase().includes(searchLower) ||
            tx.to.toLowerCase().includes(searchLower)
        );
    });

    // 格式化时间
    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    // 缩短地址显示
    const shortenAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    // 复制到剪贴板
    const handleCopy = (text: string) => {
        copyToClip(text);
        message.success('复制成功');
    };

    // 渲染状态标签
    const renderStatusTag = (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
            success: { color: 'success', text: '成功' },
            pending: { color: 'processing', text: '待确认' },
            failed: { color: 'error', text: '失败' },
        };
        const statusInfo = statusMap[status] || { color: 'default', text: status };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
    };

    // 渲染类型图标
    const renderTypeIcon = (type: string) => {
        return type === 'send' ? (
            // <ArrowUpOutlined className={transactionHistoryStyles.sendIcon} />
            <Tag color="red">发送</Tag>
        ) : (
            // <ArrowDownOutlined className={transactionHistoryStyles.receiveIcon} />
            <Tag color="green">接收</Tag>
        );
    };

    return (
        <div className={transactionHistoryStyles.transactionHistory}>
            <Row gutter={[16, 16]} className={transactionHistoryStyles.historyRow}>
                {/* 左侧：交易历史列表 */}
                <Col xs={24} lg={12} className={transactionHistoryStyles.historyList}>
                    <Card size="small" title="交易历史" className={transactionHistoryStyles.listCard}>
                        <div className={transactionHistoryStyles.listHeader}>
                            <Input
                                placeholder="搜索交易哈希、地址..."
                                prefix={<SearchOutlined />}
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                allowClear
                                className={transactionHistoryStyles.searchInput}
                            />
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={() => fetchTransactions(pagination.current, pagination.pageSize)}
                                loading={loading}
                            >
                                刷新
                            </Button>
                        </div>
                        <Spin spinning={loading}>
                            {/* 交易历史记录表 */}
                            <Table
                                dataSource={filteredTransactions}
                                rowKey="id"
                                size="small"
                                pagination={{
                                    current: pagination.current,
                                    pageSize: pagination.pageSize,
                                    total: pagination.total,
                                    showSizeChanger: true,
                                    showQuickJumper: true,
                                    showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                                    onChange: handleTableChange,
                                }}
                                scroll={{ y: 500 }}
                                onRow={(record) => ({
                                    onClick: () => setSelectedTransaction(record),
                                    className: selectedTransaction?.id === record.id ? transactionHistoryStyles.selectedRow : '',
                                })}
                                expandable={{
                                    expandedRowRender: (record) => (
                                        <Descriptions size="small" column={1} bordered>
                                            <Descriptions.Item label="交易哈希">
                                                <Space>
                                                    <span className={transactionHistoryStyles.fullHash}>
                                                        {record.hash}
                                                    </span>
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        icon={<CopyOutlined />}
                                                        onClick={() => handleCopy(record.hash)}
                                                    />
                                                </Space>
                                            </Descriptions.Item>
                                            <Descriptions.Item label="发送方">
                                                {record.from}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="接收方">
                                                {record.to}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="区块号">
                                                {record.blockNumber.toLocaleString()}
                                            </Descriptions.Item>
                                        </Descriptions>
                                    ),
                                }}
                                className={transactionHistoryStyles.transactionTable}
                            >
                                <Column
                                    title="类型"
                                    dataIndex="type"
                                    key="type"
                                    width={60}
                                    render={(type) => renderTypeIcon(type)}
                                />
                                {/* <Column
                                    title="哈希"
                                    dataIndex="hash"
                                    key="hash"
                                    render={(hash) => (
                                        <span className={transactionHistoryStyles.hashText}>
                                            {shortenAddress(hash)}
                                        </span>
                                    )}
                                /> */}
                                <Column
                                    title="金额"
                                    dataIndex="value"
                                    key="value"
                                    width={100}
                                    render={(value, record: Transaction) => (
                                        <span className={record.type === 'send' ? transactionHistoryStyles.sendAmount : transactionHistoryStyles.receiveAmount}>
                                            {record.type === 'send' ? '-' : '+'}{value} ETH
                                        </span>
                                    )}
                                />
                                <Column
                                    title="状态"
                                    dataIndex="status"
                                    key="status"
                                    width={80}
                                    render={(status) => renderStatusTag(status)}
                                />
                                <Column
                                    title="时间"
                                    dataIndex="timestamp"
                                    key="timestamp"
                                    width={150}
                                    render={(timestamp) => formatTime(timestamp)}
                                />
                            </Table>
                        </Spin>
                    </Card>
                </Col>

                {/* 右侧：交易详情 */}
                <Col xs={24} lg={12} className={transactionHistoryStyles.detailPanel}>
                    <Card size="small" className={transactionHistoryStyles.detailCard} title="交易详情">
                        {selectedTransaction ? (
                            <Descriptions
                                size="small"
                                column={1}
                                bordered
                                className={transactionHistoryStyles.descriptions}
                            >
                                <Descriptions.Item label="交易哈希">
                                    <Space>
                                        <span className={transactionHistoryStyles.fullHash}>
                                            {selectedTransaction.hash}
                                        </span>
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<CopyOutlined />}
                                            onClick={() => handleCopy(selectedTransaction.hash)}
                                        />
                                    </Space>
                                </Descriptions.Item>
                                <Descriptions.Item label="状态">
                                    {renderStatusTag(selectedTransaction.status)}
                                </Descriptions.Item>
                                <Descriptions.Item label="类型">
                                    {selectedTransaction.type === 'send' ? (
                                        <Tag color="blue">发送</Tag>
                                    ) : (
                                        <Tag color="green">接收</Tag>
                                    )}
                                </Descriptions.Item>
                                <Descriptions.Item label="发送方">
                                    <Space>
                                        <span className={transactionHistoryStyles.address}>
                                            {selectedTransaction.from}
                                        </span>
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<CopyOutlined />}
                                            onClick={() => handleCopy(selectedTransaction.from)}
                                        />
                                    </Space>
                                </Descriptions.Item>
                                <Descriptions.Item label="接收方">
                                    <Space>
                                        <span className={transactionHistoryStyles.address}>
                                            {selectedTransaction.to}
                                        </span>
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<CopyOutlined />}
                                            onClick={() => handleCopy(selectedTransaction.to)}
                                        />
                                    </Space>
                                </Descriptions.Item>
                                <Descriptions.Item label="金额">
                                    <span className={transactionHistoryStyles.valueText}>
                                        {selectedTransaction.value} ETH
                                    </span>
                                </Descriptions.Item>
                                <Descriptions.Item label="交易费用">
                                    {selectedTransaction.fee} ETH
                                </Descriptions.Item>
                                <Descriptions.Item label="Gas Used">
                                    {selectedTransaction.gasUsed}
                                </Descriptions.Item>
                                <Descriptions.Item label="Gas Price">
                                    {selectedTransaction.gasPrice} Wei
                                </Descriptions.Item>
                                <Descriptions.Item label="区块号">
                                    {selectedTransaction.blockNumber.toLocaleString()}
                                </Descriptions.Item>
                                <Descriptions.Item label="时间">
                                    {formatTime(selectedTransaction.timestamp)}
                                </Descriptions.Item>
                            </Descriptions>
                        ) : (
                            <div className={transactionHistoryStyles.emptyDetail}>
                                <Paragraph type="secondary">
                                    请从左侧列表选择一条交易查看详情
                                </Paragraph>
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

