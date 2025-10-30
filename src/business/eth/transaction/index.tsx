import React, { useState } from 'react';
import { Row, Col, message } from 'antd';
import WalletConnect from '@/src/business/eth/transaction/wallet/WalletConnect';
import CustomWallet from '@/src/business/eth/transaction/wallet/CustomWallet';
import NetworkManager from '@/src/business/eth/transaction/wallet/NetworkManager';
import { WalletInfo } from '@/src/utils/ethereum/metamask';
import styles from './index.module.scss';
import WalletActions from './wallet/WalletActions';
import { IWalletInfo } from './IWalletInfo';

interface EthTransactionProps {
  mode?: 'wallet' | 'custom';
  walletInfo?: IWalletInfo;
}

export default function EthTransaction(props: EthTransactionProps) {
  let { mode } = props;
  if (!mode) {
    mode = 'wallet';
  }

  const [walletInfo, setWalletInfo] = useState<IWalletInfo | null>(null);

  const handleWalletChange = (info: IWalletInfo | null) => {
    setWalletInfo(info);
  };

  const handleNetworkChange = (chainId: string) => {
    console.log('Network changed to:', chainId);
  };

  if (mode === 'wallet') {
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
  } else if (mode === 'custom') {
    return (
      <div className={styles.ethTransaction}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <CustomWallet onWalletChange={handleWalletChange} />

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
}
