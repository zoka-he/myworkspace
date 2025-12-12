import { useState, useEffect } from 'react';
import { Table, Tag, Space, Button, Input, Select, Modal, Form, message, Typography, Divider } from 'antd';
import dayjs from 'dayjs';
import EtherscanUtil from '../common/etherscanUtil';
import { ReloadOutlined } from '@ant-design/icons';
import { useWalletContext } from '../WalletContext';

const { Column } = Table;

export default function MarketValue() {
    const { networkInfo } = useWalletContext();
    const [updateTime, setUpdateTime] = useState('--');
    const [eth2usdt, setEth2usdt] = useState('--');
    const [eth2btc, setEth2btc] = useState('--');
    const [btc2eth, setBtc2eth] = useState('--');
    const [usdt2eth, setUsdt2eth] = useState('--');

    useEffect(() => {
        fetchMarketValue();

        setInterval(() => fetchMarketValue(), 1000 * 30);
    }, [networkInfo]);

    const fetchMarketValue = async () => {

        if (!networkInfo?.chainId) {
            return;
        }

        const chainId = parseInt(networkInfo?.chainId?.toString() || '0');

        try {
            const etherscanUtil = new EtherscanUtil(EtherscanUtil.EndPointUrl.MAINNET, chainId);
            const latestPrice = await etherscanUtil.getLatestPrice(chainId);
            setEth2usdt(latestPrice.ethusd);
            setEth2btc(latestPrice.ethbtc);
            setBtc2eth(latestPrice.btceth);
            setUsdt2eth(latestPrice.usdthe);
            setUpdateTime(dayjs().format('YYYY-MM-DD HH:mm:ss'));
        } catch (error: any) {
            message.error(error.message || '获取最新价格失败');
        }
    }

    return (
        <div>
            <div className='f-flex-row'>
                <div className='f-flex-1'>
                    <Typography.Text>更新时间：{updateTime}</Typography.Text>
                </div>
                <Space>
                    <Button type="primary" icon={<ReloadOutlined />} onClick={fetchMarketValue}>刷新</Button>
                </Space>
            </div>
            <Divider />
            <div>
                <p>1 以太币 = {eth2usdt} USDT</p>   
                <p>1 以太币 = {eth2btc} BTC</p>
                <p>1 BTC = {btc2eth} 以太币</p>
                <p>1 USDT = {usdt2eth} 以太币</p>
            </div>
        </div>
    )
}