import React, { useState, useEffect, useMemo } from 'react';
import { Card, Select, Button, Space, Typography, Tag, message, Modal, Form, Input, InputNumber, Descriptions, Divider } from 'antd';
import { 
  GlobalOutlined, 
  PlusOutlined, 
  ReloadOutlined,
  SwitcherOutlined
} from '@ant-design/icons';
import { 
  switchNetwork, 
  addNetwork, 
  NetworkInfo,
  WalletInfo
} from '@/src/utils/ethereum/metamask';
import { IEthNetwork } from '@/src/types/IEthAccount';
import fetch from '@/src/fetch';
import styles from './NetworkManager.module.scss';
import { ethers } from 'ethers';
import { useWalletContext } from '../WalletContext';
import { useConnection, useChains, useChainId } from 'wagmi';
import { Chain } from 'viem';

const { Title, Text } = Typography;
const { Option } = Select;

interface NetworkManagerProps {
  // walletInfo: WalletInfo | null;
  onNetworkChange?: (chainId: string) => void;
}

const NetworkManager: React.FC<NetworkManagerProps> = ({ onNetworkChange }) => {
  // const { networkInfo, isWalletConnected } = useWalletContext();
  const connection = useConnection();
  // const connector = useConnector();
  const chains = useChains();
  const currentChainId = useChainId();

  const [loading, setLoading] = useState(false);
  // const [networks, setNetworks] = useState<IEthNetwork[]>([]);
  // const [networksLoading, setNetworksLoading] = useState(false);
  // const [targetNetwork, setTargetNetwork] = useState<IEthNetwork | null>(null);
  const [targetChainId, setTargetChainId] = useState<number | null>(null);

  const targetChain = useMemo(() => {
    const chain = chains?.find(chain => chain.id === targetChainId) || null;
    // console.debug('targetChainId', targetChainId, typeof targetChainId, 'chains', chains);
    // console.debug('targetChain', chain);
    return chain;
  }, [targetChainId, chains]);

  // const canAddNetwork = useMemo(() => {
  //   const connectorChainsId = connection.connector..map((chain: Chain) => chain.id) || [];
  //   return !connectorChainsId.includes(targetChainId!);
  // }, [currentChainId, targetChainId]);

  const canSwitchNetwork = useMemo(() => {
    // if (canAddNetwork) { // 如果可以添加网络，则不能切换网络
    //   return false;
    // }
    return currentChainId !== targetChainId;
  }, [currentChainId, targetChainId]);

  // const fetchNetworks = async () => {
  //   try {
  //     setNetworksLoading(true);
  //     const response = await fetch.get('/api/eth/network', {
  //       params: { is_enable: 1, page: 1, limit: 100 } // 获取所有网络配置
  //     });
  //     setNetworks(response.data || []);
  //   } catch (error: any) {
  //     console.error('获取网络配置失败:', error);
  //     message.error('获取网络配置失败');
  //   } finally {
  //     setNetworksLoading(false);
  //   }
  // };

  const handleNetworkChange = async () => {
    if (!connection.isConnected || !connection.connector) {
      message.warning('请先连接钱包');
      return;
    }

    if (!connection.connector.switchChain) {
      message.warning('钱包不支持切换网络');
      return;
    }

    if (!targetChain) {
      message.warning('请选择网络');
      return;
    }

    try {
      setLoading(true);
      await connection.connector.switchChain({ chainId: targetChain.id });
      message.success('网络切换成功');
    } catch (error: any) {
      message.error(error.message || '网络切换失败');
    } finally {
      setLoading(false);
    }
  };

  // const getNetworkTagColor = (chainId: string | undefined) => {
  //   if (!chainId) return 'default';

  //   const network = networks.find(n => n.chain_id.toString() === chainId);
  //   if (!network) return 'default';
    
  //   // 根据是否为测试网设置颜色
  //   return network.is_testnet ? 'orange' : 'blue';
  // };

  const addNetworkToMetamask = async (network: Chain) => {
    if (!network) {
      message.warning('请选择网络');
      return;
    }

    // const networkInfo: NetworkInfo = {
    //   chainId: `0x${network.chain_id.toString(16)}`,
    //   name: network.name,
    //   rpcUrl: network.rpc_url,
    //   blockExplorerUrl: network.explorer_url,
    //   nativeCurrency: {
    //     name: network.unit_full || network.unit || 'ETH',
    //     symbol: network.unit || 'ETH',
    //     decimals: Number(network.decimals) || 18
    //   }
    // };

    // try {
    //   await addNetwork(networkInfo);
    //   message.success('网络添加成功');
    // } catch (error: any) {
    //   // 忽略 MetaMask 内部的 RPC 错误，因为添加操作实际上是成功的
    //   if (error.message && error.message.includes('f is not a function')) {
    //     message.success('网络添加成功');
    //   } else {
    //     message.error(error.message || '网络添加失败');
    //   }
    // }
  };

  return (
    <>
      <Card className={styles.networkCard}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <GlobalOutlined className={styles.icon} />
            <Title level={5} className={styles.title}>网络管理</Title>
          </div>
          <Space>
            {/* <Button type="primary" size="small" icon={<ReloadOutlined />} onClick={() => fetchNetworks()}>刷新</Button> */}
            
          </Space>
        </div>

        <div className={styles.content}>

          <Space className={styles.networkSelector}>
            <Text type="secondary">选择网络：</Text>
            <Select
              value={targetChainId || undefined}
              onChange={(value) => setTargetChainId(value)}
              loading={loading}
              disabled={!connection.isConnected}
              // className={styles.selector}
              placeholder="选择网络"
              style={{ width: 280 }}
            >
              {chains?.map((chain) => (
                <Option key={chain.id} value={chain.id}>
                  <Space className={styles.networkOption}>
                    <Text>{chain.name}</Text>
                    <Text type="secondary" className={styles.chainId}>
                      Chain ID: {chain.id}
                    </Text>
                  </Space>
                </Option>
              ))}
            </Select>
            
            
          </Space>

          <div style={{ marginTop: 16 }}>
            <Descriptions bordered size="small" labelStyle={{width: '120px'}} column={1} items={[
              {
                key: 'networkName',
                label: 'RPC地址',
                children: <Text type="secondary">{targetChain?.rpcUrls?.default?.http?.[0] || '--'}</Text>
              }, 
              {
                key: 'explorerUrl',
                label: '浏览器URL',
                children: <Text type="secondary">{targetChain?.blockExplorers?.default?.url || '--'}</Text>
              }
            ]} />
          </div>
          
          <div className={styles.networkSwitch}>
            {/* <Button 
              icon={<PlusOutlined />} 
              disabled={!canAddNetwork}
              onClick={() => addNetworkToMetamask(targetChain!)}
            >
              添加网络
            </Button> */}

            <Button 
              type="primary" 
              icon={<SwitcherOutlined />} 
              onClick={() => handleNetworkChange()}
              disabled={!canSwitchNetwork}
              loading={loading}
            >切换网络</Button>
          </div>
        </div>
      </Card>
    </>
  );
};

export default NetworkManager;
