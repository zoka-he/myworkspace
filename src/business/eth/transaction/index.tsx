import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Typography, Space, Button, message, Divider } from 'antd';
import { 
  WalletOutlined, 
  GlobalOutlined, 
  TransactionOutlined,
  ReloadOutlined,
  ExportOutlined
} from '@ant-design/icons';
import WalletConnect from '@/src/business/eth/transaction/wallet/WalletConnect';
import NetworkManager from '@/src/business/eth/transaction/wallet/NetworkManager';
import { WalletInfo } from '@/src/utils/ethereum/metamask';
import styles from './index.module.scss';

const { Title, Paragraph } = Typography;

export default function EthTransaction() {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleWalletChange = (info: WalletInfo | null) => {
    setWalletInfo(info);
  };

  const handleNetworkChange = (chainId: string) => {
    console.log('Network changed to:', chainId);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // 这里可以添加刷新逻辑
      message.success('刷新成功');
    } catch (error) {
      message.error('刷新失败');
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportAccount = () => {
    if (!walletInfo) {
      message.warning('请先连接钱包');
      return;
    }
    
    // 这里可以添加导出账户信息的逻辑
    message.info('导出功能开发中...');
  };

  return (
    <div className={styles.ethTransaction}>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <WalletConnect onWalletChange={handleWalletChange} />

          <NetworkManager 
            walletInfo={walletInfo} 
            onNetworkChange={handleNetworkChange} 
          />
        </Col>
        
        <Col xs={24} lg={16}>
            <Card className={styles.transactionCard}>
                <div className={styles.cardHeader}>
                  <TransactionOutlined className={styles.cardIcon} />
                  <Title level={4} className={styles.cardTitle}>交易功能</Title>
                </div>
                {walletInfo && (
                  <>
                <Paragraph type="secondary">
                  钱包连接成功！您现在可以：
                </Paragraph>
                <ul className={styles.featureList}>
                  <li>查看账户余额和交易历史</li>
                  <li>发送和接收以太坊</li>
                  <li>与智能合约交互</li>
                  <li>管理NFT和代币</li>
                </ul>
                <div className={styles.comingSoon}>
                  <Button type="dashed" disabled>
                    更多功能即将推出...
                  </Button>
                </div>
                </>
              )}
            </Card>
        </Col>
      </Row>

    </div>
  );
}
