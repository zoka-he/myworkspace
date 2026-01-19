import { useState, useEffect } from 'react';
import { Table, Tag, Space, Button, Input, Select, Modal, Form, message, Typography, Divider } from 'antd';
import dayjs from 'dayjs';
import EtherscanUtil from '../common/etherscanUtil';
import { ReloadOutlined, DollarOutlined, SwapOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useWalletContext } from '../WalletContext';
import styles from './MarketValue.module.scss';
import { useConnection } from 'wagmi';

const { Column } = Table;

export default function MarketValue() {
    const connection = useConnection();
    const [updateTime, setUpdateTime] = useState('--');
    const [eth2usd, setEth2usd] = useState('--');
    const [eth2btc, setEth2btc] = useState('--');
    const [btc2eth, setBtc2eth] = useState('--');
    const [usd2eth, setUsdt2eth] = useState('--');
    const [ethusd_timestamp, setEthusd_timestamp] = useState('--');
    const [ethbtc_timestamp, setEthbtc_timestamp] = useState('--');

    useEffect(() => {
        fetchMarketValue();
        let timer = setInterval(() => fetchMarketValue(), 1000 * 30);
        return () => clearInterval(timer);
    }, [connection.chainId, connection.isConnected, connection.address]);

    const fetchMarketValue = async () => {

        if (!connection.isConnected) {
            message.warning('请先连接钱包');
            return;
        }

        const chainId = connection.chainId;
        if (!chainId) {
            message.warning('请先选择网络');
            return;
        }

        try {
            const etherscanUtil = new EtherscanUtil(EtherscanUtil.EndPointUrl.MAINNET, chainId);
            const latestPrice = await etherscanUtil.getLatestPrice(chainId);
            setEth2usd(parseFloat(latestPrice.ethusd).toFixed(6));
            setEth2btc(parseFloat(latestPrice.ethbtc).toFixed(6));
            setBtc2eth((1 / parseFloat(latestPrice.ethbtc.toString())).toFixed(6));
            setUsdt2eth((1 / parseFloat(latestPrice.ethusd.toString())).toFixed(6));
            setEthusd_timestamp(dayjs(parseInt(latestPrice.ethusd_timestamp) * 1000).format('YYYY-MM-DD HH:mm:ss'));
            setEthbtc_timestamp(dayjs(parseInt(latestPrice.ethbtc_timestamp) * 1000).format('YYYY-MM-DD HH:mm:ss'));
            setUpdateTime(dayjs().format('YYYY-MM-DD HH:mm:ss'));
        } catch (error: any) {
            console.error(error);
            message.error(error.message || '获取最新价格失败');
        }
    }

    return (
        <div className={styles.marketValue}>
            <div className='f-flex-row'>
                <div className='f-flex-1'>
                    <Typography.Text>更新时间：{updateTime}</Typography.Text>
                </div>
                <Space>
                    <Button type="primary" icon={<ReloadOutlined />} onClick={fetchMarketValue}>刷新</Button>
                </Space>
            </div>
            <Divider />

            <div className={styles.priceGrid}>
                <div className={styles.priceCard}>
                    <div className={styles.priceLabel}>
                        <DollarOutlined /> 以太币 / USD
                    </div>
                    <div className={styles.priceValue}>
                        <span className={styles.value}>{eth2usd}</span>
                        <span className={styles.unit}>USD</span>
                    </div>
                    <div className={styles.priceTimestamp}>
                        <ClockCircleOutlined /> {ethusd_timestamp}
                    </div>
                </div>
                <div className={styles.priceCard}>
                    <div className={styles.priceLabel}>
                        <DollarOutlined /> USD / 以太币
                    </div>
                    <div className={styles.priceValue}>
                        <span className={styles.value}>{usd2eth}</span>
                        <span className={styles.unit}>ETH</span>
                    </div>
                    <div className={styles.priceTimestamp}>
                        <ClockCircleOutlined /> {ethusd_timestamp}
                    </div>
                </div>
                
                <div className={styles.priceCard}>
                    <div className={styles.priceLabel}>
                        <SwapOutlined /> 以太币 / BTC
                    </div>
                    <div className={styles.priceValue}>
                        <span className={styles.value}>{eth2btc}</span>
                        <span className={styles.unit}>BTC</span>
                    </div>
                    <div className={styles.priceTimestamp}>
                        <ClockCircleOutlined /> {ethbtc_timestamp}
                    </div>
                </div>
                <div className={styles.priceCard}>
                    <div className={styles.priceLabel}>
                        <SwapOutlined /> BTC / 以太币
                    </div>
                    <div className={styles.priceValue}>
                        <span className={styles.value}>{btc2eth}</span>
                        <span className={styles.unit}>ETH</span>
                    </div>
                    <div className={styles.priceTimestamp}>
                        <ClockCircleOutlined /> {ethbtc_timestamp}
                    </div>
                </div>
                
            </div>
        </div>
    )
}