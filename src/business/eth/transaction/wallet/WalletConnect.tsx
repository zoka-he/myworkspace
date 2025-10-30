import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Space, Typography, Alert, Spin, message, Tag, Divider } from 'antd';
import { 
  WalletOutlined, 
  DisconnectOutlined, 
  CopyOutlined, 
  ReloadOutlined,
  GlobalOutlined,
  DollarOutlined,
  UserOutlined
} from '@ant-design/icons';
import { 
  connectWallet, 
  getWalletInfo, 
  isMetaMaskInstalled, 
  isConnected,
  onAccountsChanged,
  onChainChanged,
  WalletInfo,
  // PREDEFINED_NETWORKS
} from '@/src/utils/ethereum/metamask';
import copyToClip from '@/src/utils/common/copy';
import styles from './WalletConnect.module.scss';
import { IWalletInfo } from '../IWalletInfo';

const { Title, Text, Paragraph } = Typography;

interface WalletConnectProps {
  onWalletChange?: (walletInfo: IWalletInfo | null) => void;
}

const WalletConnect: React.FC<WalletConnectProps> = ({ onWalletChange }) => {
  const [walletInfo, setWalletInfo] = useState<IWalletInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 初始化检查
  useEffect(() => {
    checkWalletStatus();
  }, []);

  // 监听账户和网络变化
  useEffect(() => {
    if (!isMetaMaskInstalled()) return;

    const unsubscribeAccounts = onAccountsChanged((accounts) => {
      if (accounts.length === 0) {
        setWalletInfo(null);
        onWalletChange?.(null);
      } else {
        refreshWalletInfo();
      }
    });

    const unsubscribeChain = onChainChanged((chainId) => {
      refreshWalletInfo();
    });

    return () => {
      unsubscribeAccounts();
      unsubscribeChain();
    };
  }, [onWalletChange]);

  const checkWalletStatus = async () => {
    if (!isMetaMaskInstalled()) {
      return;
    }

    if (isConnected()) {
      await refreshWalletInfo();
    }
  };

  const refreshWalletInfo = async () => {
    setRefreshing(true);
    try {
      const info = await getWalletInfo();
      setWalletInfo(info);
      onWalletChange?.(info);
    } catch (error: any) {
      console.error('获取钱包信息失败:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleConnect = async () => {
    if (!isMetaMaskInstalled()) {
      message.error('请先安装MetaMask钱包');
      return;
    }

    setLoading(true);
    try {
      const info = await connectWallet();
      setWalletInfo(info);
      onWalletChange?.(info);
      message.success('钱包连接成功');
    } catch (error: any) {
      message.error(error.message || '连接钱包失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setWalletInfo(null);
    onWalletChange?.(null);
    message.info('已断开钱包连接');
  };

  const handleCopyAddress = () => {
    if (walletInfo?.address) {
      copyToClip(walletInfo.address);
      message.success('地址已复制');
    }
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num < 0.001) {
      return num.toExponential(3);
    }
    return num.toFixed(4);
  };

  const getNetworkTagColor = (chainId: string) => {
    switch (chainId) {
      case '1': return 'blue';
      case '5': return 'orange';
      case '11155111': return 'purple';
      default: return 'default';
    }
  };

  // const getNetworkName = (chainId: string) => {
  //   return PREDEFINED_NETWORKS[chainId]?.name || `Chain ${chainId}`;
  // };

  if (!isMetaMaskInstalled()) {
    return (
      <Card className={styles.walletCard}>
        <Alert
          message="MetaMask未安装"
          description="请先安装MetaMask钱包扩展程序"
          type="warning"
          showIcon
          action={
            <Button 
              type="primary" 
              href="https://metamask.io/download/" 
              target="_blank"
            >
              安装MetaMask
            </Button>
          }
        />
      </Card>
    );
  }

  if (!walletInfo) {
    return (
      <Card className={styles.walletCard}>
        <div className={styles.connectSection}>
          <WalletOutlined className={styles.walletIcon} />
          <Title level={4}>连接钱包</Title>
          <Paragraph type="secondary">
            连接您的MetaMask钱包以查看账户信息和网络状态
          </Paragraph>
          <Button 
            type="primary" 
            size="large"
            icon={<WalletOutlined />}
            loading={loading}
            onClick={handleConnect}
            className={styles.connectButton}
          >
            连接MetaMask
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={styles.walletCard}>
      <div className={styles.walletInfo}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <WalletOutlined className={styles.walletIcon} />
            <Title level={4} className={styles.title}>钱包已连接</Title>
          </div>
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              loading={refreshing}
              onClick={refreshWalletInfo}
              size="small"
            />
            <Button 
              icon={<DisconnectOutlined />} 
              onClick={handleDisconnect}
              size="small"
              danger
            >
              断开
            </Button>
          </Space>
        </div>

        <Divider />

        <div className={styles.infoSection}>
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>
              <UserOutlined />
              <span>账户地址</span>
            </div>
            <div className={styles.infoValue}>
              <Text code className={styles.address}>
                {walletInfo.address}
              </Text>
              <Button 
                type="text" 
                icon={<CopyOutlined />} 
                onClick={handleCopyAddress}
                size="small"
              />
            </div>
          </div>

          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>
              <DollarOutlined />
              <span>账户余额</span>
            </div>
            <div className={styles.infoValue}>
              <Text strong className={styles.balance}>
                {formatBalance(walletInfo.balance)} ETH
              </Text>
            </div>
          </div>

          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>
              <GlobalOutlined />
              <span>当前网络</span>
            </div>
            <div className={styles.infoValue}>
              <Tag color={getNetworkTagColor(walletInfo.chainId)}>
                {walletInfo.networkInfo?.name}
              </Tag>
              <Text type="secondary" className={styles.chainId}>
                Chain ID: {walletInfo.chainId}
              </Text>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default WalletConnect;
