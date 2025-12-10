import React, { useState, createContext, useContext } from 'react';
import { Row, Col, message } from 'antd';
import WalletConnect from '@/src/business/eth/transaction/wallet/WalletConnect';
import CustomWallet from '@/src/business/eth/transaction/wallet/CustomWallet';
import NetworkManager from '@/src/business/eth/transaction/wallet/NetworkManager';
import { WalletInfo } from '@/src/utils/ethereum/metamask';
import styles from './index.module.scss';
import WalletActions from './wallet/WalletActions';
import { IWalletInfo } from './IWalletInfo';
import { WalletProvider } from './WalletContext';


interface EthTransactionProps {
  mode?: 'wallet' | 'custom';
  walletInfo?: IWalletInfo;
}

export default function EthTransaction(props: EthTransactionProps) {
  let { mode } = props;
  if (!mode) {
    mode = 'wallet';
  }

  const handleNetworkChange = (chainId: string) => {
    console.log('Network changed to:', chainId);
  };

  const Connector = mode === 'wallet' ? WalletConnect : CustomWallet; 

  return (
    <WalletProvider>
      <div className={styles.ethTransaction}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Connector/>

            <NetworkManager 
              onNetworkChange={handleNetworkChange} 
            />
          </Col>
          
          <Col xs={24} lg={16}>
              <WalletActions/>
          </Col>
        </Row>
      </div>
    </WalletProvider>
  );
}
