import { Button, Card, message, Space, Table, Tag } from 'antd';
import { IWalletInfo } from '../IWalletInfo';
import { useEffect, useState } from 'react';
import EtherscanUtil from '../common/etherscanUtil';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useWalletContext } from '../WalletContext';

export interface NftOfWalletProps {
    // walletInfo?: IWalletInfo | null;
}

export default function NftOfWallet(props: NftOfWalletProps) {

    const { accountInfo, networkInfo, isWalletConnected } = useWalletContext();
    const [nftList, setNftList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setNftList([]);
        // setLoading(true);
        fetchNftList();
    }, [accountInfo, networkInfo]);

    const fetchNftList = async () => {
        setLoading(true);
        if (!isWalletConnected) {
            return;
        } 

        const chainId = parseInt(networkInfo?.chainId?.toString() || '0');
        const address = accountInfo?.selectedAddress;
        if (!chainId || !address) {
            return;
        }

        try {
            const util = new EtherscanUtil(EtherscanUtil.EndPointUrl.MAINNET, chainId);
            const nftList = await util.getNftList(address, '', 0, 'latest', 1, 100);
            setNftList(nftList);
        } catch (error: any) {
            message.error(error.message || '获取NFT列表失败');
            setNftList([]);
        } finally {
            setLoading(false);
        }
    };

    const renderRecordType = (value: string, record: any) => {
        if (!isWalletConnected) {
            return;
        } 

        const address = accountInfo?.selectedAddress;
        if (/^0x[0]{40}$/.test(record.from)) {
            return <Tag color="orange">铸造</Tag>;
        } else if (address?.toLowerCase() === record.from?.toLowerCase()) {
            return <Tag color="red">出让</Tag>;
        } else if (address?.toLowerCase() === record.to?.toLowerCase()) {
            return <Tag color="green">接收</Tag>;
        } else {
            return <Tag>交易</Tag>;
        }
    };

    const renderTimeStamp = (value: string, record: any) => {
        return dayjs(parseInt(value) * 1000).format('YYYY-MM-DD HH:mm:ss');
    };

    const renderConterparty = (value: string, record: any) => {
        if (!isWalletConnected) {
            return;
        } 

        const address = accountInfo?.selectedAddress;

        let ret = '';
        if (address?.toLowerCase() === record.from?.toLowerCase()) {
            ret = record.to;
        } else {
            ret = record.from;
        }

        if (ret === '0x0000000000000000000000000000000000000000') {
            ret = '';
        }

        return ret;
    };

    const columns = [
        { title: 'NFT名称', dataIndex: 'tokenName', key: 'tokenName', width: 100 },
        { title: 'NFT符号', dataIndex: 'tokenSymbol', key: 'tokenSymbol', width: 100 },
        { title: 'Token ID', dataIndex: 'tokenID', key: 'tokenID', width: 100, align: 'right' },
        // { title: '合约地址', dataIndex: 'contractAddress', key: 'contractAddress', width: 100 },
        // { title: '所有者|受让者', dataIndex: 'to', key: 'to', width: 100 },
        // { title: '铸造者|转让者', dataIndex: 'from', key: 'from', width: 100 },
        { title: '记录类型', dataIndex: 'recordType', key: 'recordType', minWidth: 60, render: renderRecordType, align: 'center' },
        { title: '交易对手', dataIndex: 'conterparty', key: 'conterparty', width: 100, render: renderConterparty },
        { title: '交易时间', dataIndex: 'timeStamp', key: 'timeStamp', minWidth: 100, render: renderTimeStamp },
    ];

    return (
        <div className="f-flex-column" style={{ gap: 10 }}>
            <Space>
                <Button type="primary" icon={<ReloadOutlined />} onClick={fetchNftList} loading={loading}>刷新</Button>
            </Space>
            <div className="f-flex-1 f-overflow-auto" style={{ marginTop: 10 }}>
                <Table dataSource={nftList} size="small" columns={columns} loading={loading} />
            </div>
        </div>
    );
}