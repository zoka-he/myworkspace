import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Card, Space, Typography, Alert, Spin, message, Tag, Divider, Descriptions, Select, Modal } from 'antd';
import { 
  WalletOutlined, 
  DisconnectOutlined, 
  WalletFilled,
  CopyOutlined, 
  ReloadOutlined,
  GlobalOutlined,
  DollarOutlined,
  UserOutlined,
  RightOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { 
  // isMetaMaskInstalled, 
  IProviderInfo,
  // listProviderInfos,
  readableAmount,
  // PREDEFINED_NETWORKS
} from '@/src/utils/ethereum/metamask';
import { 
  isMetaMaskInstalled, 
  // IProviderInfo,
  listProviderInfos,
  // readableAmount,
  // PREDEFINED_NETWORKS
} from '@/src/utils/ethereum';
import copyToClip from '@/src/utils/common/copy';
import styles from './index.module.scss';
import { IWalletInfo } from '../../IWalletInfo';
import { useWalletContext } from '../../WalletContext';
import NoWalletInstalled from './noWalletInstalled';
import BeforeConnect from './beforeConnect';

const { Title, Text, Paragraph } = Typography;

interface WalletConnectProps {
  // onWalletChange?: (walletInfo: IWalletInfo | null) => void;
}

export default function WalletConnect() {
  const { providerInfo, accountInfo, networkInfo, walletProvider, isWalletConnected, switchRdns, getWalletTool, refreshWalletInfo } = useWalletContext();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [installedBrowserWalletProviders, setInstalledBrowserWalletProviders] = useState<{ provider: any, info: IProviderInfo }[]>([]);
  const [selectedBrowserWalletProviderRdns, setSelectedBrowserWalletProviderRdns] = useState<any>(null);

  const installedProviderInfos = useMemo(() => {
    return listProviderInfos();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await refreshWalletInfo()
      } catch (error: any) {
        console.error('刷新钱包信息失败:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 防止用户意外切换钱包提供者
  const allowChangeProvider = useMemo(() => {
    // 没有提供者，或只有1个提供者，没有必要切换
    if (installedBrowserWalletProviders.length === 0) return false;
    if (installedBrowserWalletProviders.length === 1) return false;

    // 没有切换的意义的情况
    if (selectedBrowserWalletProviderRdns === walletProvider?.info.rdns) return false;

    return true;
  }, [installedBrowserWalletProviders, selectedBrowserWalletProviderRdns]);

  useEffect(() => {
    // 首先更新选择的钱包提供者
    if (!isWalletConnected) {
      setSelectedBrowserWalletProviderRdns(null);
    } else if (providerInfo?.rdns) {
      setSelectedBrowserWalletProviderRdns(providerInfo.rdns);
    }

    // 然后更新钱包信息
    setRefreshing(true);
    refreshWalletInfo().then(() => {
      setRefreshing(false);
    });
  }, [providerInfo, isWalletConnected]);

  

  // 切换钱包提供者
  const handleSwitchProvider = () => {
    if (!allowChangeProvider) return;
    switchRdns(selectedBrowserWalletProviderRdns);
    message.success('切换钱包提供者成功');
  };

  const handleDisconnect = () => {
    // setWalletInfo(null);
    // onWalletChange?.(null);
    // message.info('已断开钱包连接');
  };

  const handleCopyAddress = () => {
    if (accountInfo?.selectedAddress) {
      copyToClip(accountInfo.selectedAddress);
      message.success('地址已复制');
    }
  };

  const formatBalance = (balance: string) => {
    return readableAmount(balance);
  };

  const getNetworkTagColor = (chainId: string) => {
    switch (chainId) {
      case '1': return 'blue';
      case '5': return 'orange';
      case '11155111': return 'purple';
      default: return 'default';
    }
  };

  // 渲染钱包提供者选项
  function renderProviderOption(info: IProviderInfo ) {
    return (
      <Space key={info.rdns} align='center'>
        <img style={{ width: '1em', height: '1em', transform: 'translateY(-0.18em)' }} src={info.icon} alt={info.name} className={styles.providerIcon} />
        <Text key={info.rdns} color="blue">{info.name}</Text>
      </Space>
    )
  }

  function formatHexToDec(s: string) {
    if (!s) return '--';
    return BigInt(s).toString();
  }

  // 引导安装钱包
  if (!isMetaMaskInstalled()) {
    return (
      <NoWalletInstalled />
    );
  }

  // 引导连接钱包
  if (!isWalletConnected) {
    return (
      <BeforeConnect />
    );
  }

  

  return (
    <>
      <Card className={styles.walletCard}>
        <div className={styles.walletInfo}>
          <div className={styles.header}>
            <div className={styles.titleSection}>
              <WalletOutlined className={styles.walletIcon} />
              <Title level={4} className={styles.title}>钱包已连接</Title>
            </div>

            <Space>
              <Button icon={<ReloadOutlined />} loading={refreshing} onClick={refreshWalletInfo} size="small">刷新</Button>
              <Button 
                icon={<DisconnectOutlined />} 
                onClick={handleDisconnect}
                size="small"
                danger
                disabled={refreshing || true}
              >
                断开
              </Button>
            </Space>
          </div>


          <div className="f-flex-row" style={{gap: '10px'}}>
            <Space.Compact style={{width: '100%'}}>
              <Space.Addon style={{width: '120px', wordBreak: 'keep-all'}}>钱包提供者</Space.Addon>
              <Select style={{width: '100%'}} value={selectedBrowserWalletProviderRdns}
                options={installedProviderInfos.map((info) => ({
                  label: renderProviderOption(info),
                  value: info.rdns
                }))}
                onChange={(value) => setSelectedBrowserWalletProviderRdns(value)}
              />
            </Space.Compact>
            <Button type="primary" onClick={handleSwitchProvider} disabled={!allowChangeProvider}>切换</Button>
          </div>

          <Divider />

          <div className={styles.infoSection}>
            <Spin spinning={refreshing}>
              <Descriptions size="small" column={2} bordered labelStyle={{width: '120px'}}>
                <Descriptions.Item label={<><UserOutlined /> <span>钱包地址</span></>} span={2}>
                  <Text code className={styles.address}>{accountInfo?.selectedAddress}</Text>
                  <Button type="text" icon={<CopyOutlined />} onClick={handleCopyAddress} size="small"/>
                </Descriptions.Item>

                <Descriptions.Item label={<><DollarOutlined /> <span>账户余额</span></>} span={2}>
                  <Text strong className={styles.balance} style={{ color: '#52c41a' }}>{formatBalance(accountInfo?.balance)}</Text>
                </Descriptions.Item>

                <Descriptions.Item label={<><GlobalOutlined /> <span>Chain ID</span></>} span={2}>
                  {formatHexToDec(networkInfo?.chainId)} ({networkInfo?.chainId})
                </Descriptions.Item>

                <Descriptions.Item label={<><ClockCircleOutlined /> <span>区块高度</span></>} span={1}> {formatHexToDec(networkInfo?.blockNumber)}</Descriptions.Item>

                <Descriptions.Item label={<><DollarOutlined /> <span>Gas价格</span></>} span={1}> {readableAmount(networkInfo?.gasPrice)}</Descriptions.Item>
              </Descriptions>
            </Spin>
          </div>
          
        </div>
      </Card>
    </>
  );
};


