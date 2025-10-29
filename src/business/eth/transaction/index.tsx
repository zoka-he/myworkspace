import React, { useState } from 'react';
import { Row, Col, message } from 'antd';
import WalletConnect from '@/src/business/eth/transaction/wallet/WalletConnect';
import NetworkManager from '@/src/business/eth/transaction/wallet/NetworkManager';
import { WalletInfo } from '@/src/utils/ethereum/metamask';
import styles from './index.module.scss';
import WalletActions from './wallet/WalletActions';

export default function EthTransaction() {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);

  const handleWalletChange = (info: WalletInfo | null) => {
    setWalletInfo(info);
  };

  const handleNetworkChange = (chainId: string) => {
    console.log('Network changed to:', chainId);
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
            <WalletActions walletInfo={walletInfo}/>
        </Col>
      </Row>

    </div>
  );
}
