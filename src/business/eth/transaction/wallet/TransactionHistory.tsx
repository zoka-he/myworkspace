import { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Descriptions, Tag, Space, Input, Button, Spin, message, Typography, Pagination, Select } from 'antd';
import { SearchOutlined, ReloadOutlined, CopyOutlined } from '@ant-design/icons';
import copyToClip from '@/src/utils/common/copy';
import fetch from '@/src/fetch';
import { IWalletInfo } from '../IWalletInfo';
import transactionHistoryStyles from './TransactionHistory.module.scss';
import { WalletActionsProps } from './WalletActions';
import EtherscanUtil from '../common/etherscanUtil';
import { useWalletContext } from '../WalletContext';

const { Column } = Table;
const { Paragraph, Text } = Typography;

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
    timeStamp: number;
    blockNumber: number;
    gasUsed: string;
    gasPrice: string;
    txreceipt_status: string;
    isError: string;
    contractAddress: string;
    functionName: string;
}

// 格式化时间
function formatTime(timestamp: number | string) {
    if (typeof timestamp === 'string') {
        timestamp = parseInt(timestamp);
    }

    timestamp = timestamp * 1000;

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

// 渲染状态标签
function renderStatusTag(status: string, record: Transaction) {
    if (!record) {
        return null;
    }

    if (record.txreceipt_status === '1') {
        return <Tag color="success">成功</Tag>;
    } else if (record.isError === '1') {
        return <Tag color="error">失败</Tag>;
    } else {
        return <Tag color="processing">待确认</Tag>;
    }
};

function renderTxType(transaction: Transaction, accountInfo?: any | null) {
    if (!accountInfo) {
        return null;
    }

    const senderAddress = transaction.from.toLowerCase();
    const walletAddress = accountInfo?.selectedAddress?.toLowerCase() || '';

    const isContractCreation = transaction.contractAddress?.length > 0 && transaction.contractAddress !== '0x0000000000000000000000000000000000000000';

    let txType = null;
    if (isContractCreation) {
        txType = <Tag color="orange">合约创建</Tag>;
    } else if (transaction.functionName?.length > 0) {
        txType = <Tag color="purple">合约调用</Tag>;
    } else if (senderAddress === walletAddress) {
        txType = <Tag color="red">支出</Tag>;
    } else {
        txType = <Tag color="green">收入</Tag>;
    }

    return txType;
}

function readableAmount(value: string) {
    if (BigInt(value) > BigInt(10 ** 15)) {
        return EtherscanUtil.wei2eth(value).toString() + ' ETH';
    } else if (BigInt(value) > BigInt(10 ** 6)) {
        return EtherscanUtil.wei2gwei(value).toString() + ' Gwei';
    } else {
        return value + ' wei';
    }
}

export default function TransactionHistory(props: WalletActionsProps) {
    const { isWalletConnected, networkInfo, accountInfo } = useWalletContext();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 100,
        total: 0,
    });
    // const [networkId, setNetworkId] = useState<number | null>(null);

    // 获取交易历史
    const fetchTransactions = async (page: number = 1, pageSize: number = 10) => {

        if (!isWalletConnected) {
            message.warning('请先连接钱包');
            return;
        }

        const chainId = parseInt(networkInfo?.chainId?.toString() || '0');
        // const networkId = walletInfo?.networkId;
        const address = accountInfo?.selectedAddress;

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
            const etherscanUtil = new EtherscanUtil(EtherscanUtil.EndPointUrl.MAINNET, chainId);

            const transactions = await etherscanUtil.getTxList(address, 0, 'latest', page, pageSize);
            // console.log('transactions', transactions);
            setTransactions(transactions);

        } catch (error: any) {
            console.error('获取交易历史失败:', error);
            message.error(error.message || '获取交易历史失败');
            
        } finally {
            setLoading(false);
        }
    };

    // 初始化加载
    useEffect(() => {
        if (isWalletConnected) {
            fetchTransactions();
        } else {
            setTransactions([]);
        }
    }, [isWalletConnected, accountInfo, networkInfo]);

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

    

    

    

    // 渲染类型图标
    const renderTypeIcon = (type: string) => {
        return type === 'send' ? (
            // <ArrowUpOutlined className={transactionHistoryStyles.sendIcon} />
            (<Tag color="red">发送</Tag>)
        ) : (
            // <ArrowDownOutlined className={transactionHistoryStyles.receiveIcon} />
            (<Tag color="green">接收</Tag>)
        );
    };

    const renderAmount = (value: string, record: Transaction) => {
        const isSend = record.from.toLowerCase() === accountInfo?.selectedAddress?.toLowerCase();

        let className = '';
        if (!/^[0\.]+$/.test(record.value)) {
            if (isSend) {
                className = transactionHistoryStyles.sendAmount;
            } else {
                className = transactionHistoryStyles.receiveAmount;
            }
        }

        return <span className={className}>{readableAmount(value)}</span>
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
                            <Space.Compact>
                                <Select style={{ width: 80 }} value={pagination.pageSize} onChange={(value) => fetchTransactions(1, value)}>
                                    <Select.Option value={10}>10条</Select.Option>
                                    <Select.Option value={50}>50条</Select.Option>
                                    <Select.Option value={100}>100条</Select.Option>
                                </Select>
                                <Button
                                    icon={<ReloadOutlined />}
                                    onClick={() => fetchTransactions(pagination.current, pagination.pageSize)}
                                    loading={loading}
                                >
                                    查询
                                </Button>
                            </Space.Compact>
                            
                        </div>
                        <Spin spinning={loading}>
                            {/* 交易历史记录表 */}
                            <Table
                                dataSource={filteredTransactions}
                                rowKey="hash"
                                size="small"
                                pagination={false}
                                onRow={(record) => ({
                                    onClick: () => setSelectedTransaction(record),
                                    className: selectedTransaction?.hash === record.hash ? transactionHistoryStyles.selectedRow : '',
                                })}
                                
                                className={transactionHistoryStyles.transactionTable}
                            >
                                <Column
                                    title="Nonce"
                                    dataIndex="nonce"
                                    key="nonce"
                                    width={80}
                                    render={(nonce, record: Transaction) => nonce.toString()}
                                />
                                <Column
                                    title="类型"
                                    dataIndex="type"
                                    key="type"
                                    width={80}
                                    render={(type, record: Transaction) => renderTxType(record, accountInfo)}
                                />
                                <Column
                                    title="金额"
                                    dataIndex="value"
                                    key="value"
                                    width={100}
                                    render={(value, record: Transaction) => renderAmount(value, record)}
                                />
                                <Column
                                    title="状态"
                                    dataIndex="txreceipt_status"
                                    key="txreceipt_status"
                                    width={80}
                                    render={(status, record: Transaction) => renderStatusTag(status, record)}
                                />
                                <Column
                                    title="时间"
                                    dataIndex="timeStamp"
                                    key="timeStamp"
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
                        <TransactionDetail transaction={selectedTransaction} walletInfo={accountInfo} />
                    </Card>
                </Col>
            </Row>
        </div>
    );
}

function TransactionDetail(props: { transaction?: Transaction | null, walletInfo?: IWalletInfo | null }) {


    const { accountInfo } = useWalletContext();

    if (!props.transaction) {
        return <div className={transactionHistoryStyles.emptyDetail}>
            <Paragraph type="secondary">
                请从左侧列表选择一条交易查看详情
            </Paragraph>
        </div>
    }

    const { transaction } = props;

    // 缩短地址显示
    const shortenAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    // 复制到剪贴板
    const handleCopy = (text: string) => {
        copyToClip(text);
        message.success('复制成功');
    };

    const gasFee_gwei = EtherscanUtil.wei2gwei(BigInt(transaction.gasPrice) * BigInt(transaction.gasUsed));
    const gasFee_eth = EtherscanUtil.wei2eth(BigInt(transaction.gasPrice) * BigInt(transaction.gasUsed));

    let txType = renderTxType(transaction, accountInfo);

    return (
        <Descriptions
            size="small"
            column={2}
            bordered
            className={transactionHistoryStyles.descriptions}
        >
            <Descriptions.Item label="Nonce" span={2}>
                {transaction.nonce}
            </Descriptions.Item>
            <Descriptions.Item label="交易哈希" span={2}>
                <Space>
                    <Text className={transactionHistoryStyles.fullHash}>
                        {transaction.hash}
                    </Text>
                    <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopy(transaction.hash)}
                    />
                </Space>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
                {renderStatusTag(transaction.status, transaction)}
            </Descriptions.Item>
            <Descriptions.Item label="类型">
                {txType}
            </Descriptions.Item>
            <Descriptions.Item label="发送方" span={2}>
                <Space>
                    <span className={transactionHistoryStyles.address}>
                        {transaction.from}
                    </span>
                    <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopy(transaction.from)}
                    />
                </Space>
            </Descriptions.Item>
            <Descriptions.Item label="接收方" span={2}>
                <Space>
                    <span className={transactionHistoryStyles.address}>
                        {transaction.to || '--'}
                    </span>
                    {transaction.to && <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopy(transaction.to)}
                    />}
                </Space>
            </Descriptions.Item>
            <Descriptions.Item label="合约地址" span={2}>
                <span className={transactionHistoryStyles.address}>
                    {transaction.contractAddress || '--'}
                </span>
                {transaction.contractAddress && <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => handleCopy(transaction.contractAddress)}
                />}
            </Descriptions.Item>
            <Descriptions.Item label="合约方法" span={2}>
                <Text>{transaction.functionName || '--'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="金额" span={2}>
                <span className={transactionHistoryStyles.valueText}>
                    {readableAmount(transaction.value)}
                </span>
            </Descriptions.Item>
            <Descriptions.Item label="交易费用" span={2}>
                {gasFee_gwei} Gwei, {gasFee_eth} ETH
            </Descriptions.Item>
            <Descriptions.Item label="Gas Used">
                {transaction.gasUsed}
            </Descriptions.Item>
            <Descriptions.Item label="Gas Price">
                {transaction.gasPrice} Wei
            </Descriptions.Item>
            <Descriptions.Item label="区块号">
                {transaction.blockNumber.toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="时间">
                {formatTime(transaction.timeStamp)}
            </Descriptions.Item>
        </Descriptions>
    );
}