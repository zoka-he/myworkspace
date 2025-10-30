import { useEffect, useMemo, useState } from 'react';
import { Card, Select, Tag, message, Space, Divider, Descriptions, Button } from 'antd';
import { CopyOutlined, ReloadOutlined } from '@ant-design/icons';
import { ethers } from 'ethers';
import fetch from '@/src/fetch';
import styles from './CustomWallet.module.scss';
import copyToClip from '@/src/utils/common/copy';
import { IWalletInfo } from '../IWalletInfo';

interface IEthAccountRow {
    id: number;
    name: string;
    address: string;
    balance?: number;
    private_key?: string;
    network?: string;
    network_id?: number;
    chain_id?: number;
    unit?: string;
}

interface CustomWalletProps {
    onWalletChange: (info: IWalletInfo | null) => void;
}

export default function CustomWallet(props: CustomWalletProps) {
    function shortenAddress(address: string) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    const [accounts, setAccounts] = useState<IEthAccountRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

    const options = useMemo(() => {
        return (accounts || []).map(acc => ({
            value: acc.id,
            label: (
                <div className="f-flex-two-side">
                    <Space>
                        <span>{acc.name}</span>
                        <Tag color="blue">{acc.network || '-'}{acc.chain_id ? `(${acc.chain_id})` : ''}</Tag>
                    </Space>
                    <span style={{ color: '#999' }}>{shortenAddress(acc.address)}</span>
                </div>
            )
        }));
    }, [accounts]);

    async function loadAccounts(page = 1, pageSize = 10) {
        setLoading(true);
        try {
            // @ts-ignore
            const { data, count } = await fetch.get('/api/eth/account', { params: { page, limit: pageSize } });
            setAccounts(data || []);
            setPagination({ current: page, pageSize, total: count || 0 });
        } catch (e: any) {
            console.error(e);
            message.error(e?.message || '加载账户失败');
        } finally {
            setLoading(false);
        }
    }

    async function refreshBalance(address: string, network_id?: number) {
        try {
            // @ts-ignore
            const result = await fetch.get('/api/eth/account/balance', { params: { address, network_id } });
            const raw = (result as any);
            const balanceStr = raw?.data?.balance ?? raw?.balance; // 兼容两种返回形态
            const parsed = typeof balanceStr === 'string' ? parseFloat(balanceStr) : balanceStr;

            if (typeof parsed === 'number' && !Number.isNaN(parsed)) {
                setAccounts(prev => prev.map(a => a.address === address ? { ...a, balance: parsed } : a));
                message.success(raw?.data?.message || raw?.message || '余额已刷新');
            } else {
                message.error('获取余额失败');
            }
        } catch (e: any) {
            console.error(e);
            message.error(e?.message || '获取余额失败');
        }
    }

    async function updateNetworkInfo(_networkInfo?: ethers.Network) {
        try {
            const acc = accounts.find(a => a.id === selectedId!);
            if (!acc || !acc.network_id) return;

            // @ts-ignore
            const netResp = await fetch.get('/api/eth/network', { params: { id: acc.network_id } });
            const net = (netResp as any)?.data?.[0] || (netResp as any)?.data || null;
            if (!net?.rpc_url) return;

            const provider = new ethers.JsonRpcProvider(net.rpc_url);
            const [feeData, blockNumber, netInfo] = await Promise.all([
                provider.getFeeData(),
                provider.getBlockNumber(),
                provider.getNetwork(),
            ]);

            const updated: IWalletInfo = {
                address: acc.address,
                balance: (acc.balance ?? 0).toString(),
                chainId: netInfo.chainId.toString(),
                networkName: netInfo.name,
                networkId: acc.network_id,
                isConnected: true,
                custom: true,
                networkInfo: netInfo,
                feeData,
                blockNumber,
            } as IWalletInfo;

            props.onWalletChange(updated);
        } catch (e) {
            console.warn('更新网络信息失败:', e);
        }
    }

    async function handleSelect(row: IEthAccountRow) {
        setSelectedId(row.id);

        let networkName = row.network || '';
        let chainIdStr = (row.chain_id ?? '').toString();
        let networkInfo: any = undefined;

        try {
            if (row.network_id) {
                // @ts-ignore - fetch wrapper returns { data }
                const netResp = await fetch.get('/api/eth/network', { params: { id: row.network_id } });
                const net = (netResp as any)?.data?.[0] || (netResp as any)?.data || null;
                if (net?.rpc_url) {
                    const provider = new ethers.JsonRpcProvider(net.rpc_url);
                    const netInfo = await provider.getNetwork();
                    networkInfo = netInfo;
                    networkName = netInfo.name;
                    chainIdStr = netInfo.chainId.toString();
                }
            }
        } catch (e) {
            console.warn('初始化网络信息失败，将使用本地账户网络字段:', e);
        }

        const walletInfo: IWalletInfo = {
            address: row.address,
            balance: (row.balance ?? 0).toString(),
            chainId: chainIdStr,
            networkName: networkName,
            networkId: row.network_id,
            isConnected: true,
            custom: true,
            ...(networkInfo ? { networkInfo } : {}),
        } as IWalletInfo;
        props.onWalletChange(walletInfo);
        message.success(`已切换到账户 ${row.name}`);

        // 切换后立即刷新余额
        refreshBalance(row.address, row.network_id);

        // 切换后更新网络信息
        updateNetworkInfo(networkInfo);
    }

    useEffect(() => {
        loadAccounts(pagination.current, pagination.pageSize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Card className={styles.customWallet} size="small" title="选择账户">
            <Select
                style={{ width: '100%' }}
                placeholder="请选择账户"
                loading={loading}
                options={options as any}
                value={selectedId ?? undefined}
                onChange={async (id: number) => {
                    const row = accounts.find(a => a.id === id);
                    if (row) await handleSelect(row);
                }}
                showSearch
                optionFilterProp="label"
            />

            <>
                <Divider />
                <div style={{ marginTop: 12 }}>
                    {(() => {
                        const acc = accounts.find(a => a.id === selectedId!);
                        const address = acc?.address || '--';
                        const privateKey = acc?.private_key || '--';
                        const networkLabel = acc ? `${acc.network || '-'}${acc.chain_id ? `(${acc.chain_id})` : ''}` : '--';
                        const balanceText = acc ? `${acc.balance ?? '--'} ${acc.unit || 'ETH'}` : '--';

                        return (
                            <Descriptions size="small" column={1} bordered>
                                <Descriptions.Item label="钱包地址">
                                    <Space>
                                        <span style={{ fontFamily: 'monospace' }}>{address}</span>
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<CopyOutlined />}
                                            disabled={!acc}
                                            onClick={() => { if (acc) { copyToClip(acc.address); message.success('已复制地址'); } }}
                                        />
                                    </Space>
                                </Descriptions.Item>
                                <Descriptions.Item label="私钥">
                                    <Space>
                                        <span style={{ fontFamily: 'monospace' }}>{privateKey}</span>
                                        <Button
                                            type="text"
                                            size="small"
                                            danger
                                            icon={<CopyOutlined />}
                                            disabled={!acc || !acc.private_key}
                                            onClick={() => { if (acc?.private_key) { copyToClip(acc.private_key as string); message.success('已复制私钥'); } }}
                                        />
                                    </Space>
                                </Descriptions.Item>
                                <Descriptions.Item label="网络">
                                    {acc ? (<Tag color="blue">{networkLabel}</Tag>) : networkLabel}
                                </Descriptions.Item>
                                <Descriptions.Item label="余额">
                                    <Space>
                                        <span>{balanceText}</span>
                                        <Button
                                            type="link"
                                            size="small"
                                            icon={<ReloadOutlined />}
                                            disabled={!acc}
                                            onClick={() => { if (acc) { refreshBalance(acc.address, acc.network_id); } }}
                                        />
                                    </Space>
                                </Descriptions.Item>
                            </Descriptions>
                        );
                    })()}
                </div>
            </>
        </Card>
    );
}


