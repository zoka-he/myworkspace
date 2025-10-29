import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Space, Typography, Tag, message, Modal, Form, Input, InputNumber, Descriptions, Divider } from 'antd';
import { 
  GlobalOutlined, 
  PlusOutlined, 
  SettingOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
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

const { Title, Text } = Typography;
const { Option } = Select;

interface NetworkManagerProps {
  walletInfo: WalletInfo | null;
  onNetworkChange?: (chainId: string) => void;
}

const NetworkManager: React.FC<NetworkManagerProps> = ({ walletInfo, onNetworkChange }) => {
  const [loading, setLoading] = useState(false);
  const [showAddNetwork, setShowAddNetwork] = useState(false);
  const [networks, setNetworks] = useState<IEthNetwork[]>([]);
  const [networksLoading, setNetworksLoading] = useState(false);
  const [targetNetwork, setTargetNetwork] = useState<IEthNetwork | null>(null);

  const [form] = Form.useForm();

  // 获取网络配置数据
  useEffect(() => {
    fetchNetworks();
  }, []);

  const fetchNetworks = async () => {
    try {
      setNetworksLoading(true);
      const response = await fetch.get('/api/eth/network', {
        params: { is_enable: 1, page: 1, limit: 100 } // 获取所有网络配置
      });
      setNetworks(response.data || []);
    } catch (error: any) {
      console.error('获取网络配置失败:', error);
      message.error('获取网络配置失败');
    } finally {
      setNetworksLoading(false);
    }
  };

  const handleNetworkChange = async (chainId: string) => {
    if (!walletInfo) {
      message.warning('请先连接钱包');
      return;
    }

    setLoading(true);

    const hexChainId = `0x${parseInt(chainId).toString(16)}`;
    console.log('hexChainId', hexChainId);
    try {
      await switchNetwork(hexChainId);
      onNetworkChange?.(hexChainId);
      message.success('网络切换成功');
    } catch (error: any) {
      message.error(error.message || '网络切换失败');
    } finally {
      setLoading(false);
    }
  };

  const getNetworkTagColor = (chainId: string | undefined) => {
    if (!chainId) return 'default';

    const network = networks.find(n => n.chain_id.toString() === chainId);
    if (!network) return 'default';
    
    // 根据是否为测试网设置颜色
    return network.is_testnet ? 'orange' : 'blue';
  };

  const getCurrentNetworkName = () => {
    if (!walletInfo) return '未连接';
    const network = networks.find(n => n.chain_id.toString() === walletInfo.chainId);
    return network?.name || `Chain ${walletInfo.chainId}`;
  };

  const addNetworkToMetamask = async (network: IEthNetwork) => {
    if (!network) {
      message.warning('请选择网络');
      return;
    }

    const networkInfo: NetworkInfo = {
      chainId: `0x${network.chain_id.toString(16)}`,
      name: network.name,
      rpcUrl: network.rpc_url,
      blockExplorerUrl: network.explorer_url,
      nativeCurrency: {
        name: network.unit_full || network.unit || 'ETH',
        symbol: network.unit || 'ETH',
        decimals: Number(network.decimals) || 18
      }
    };

    try {
      await addNetwork(networkInfo);
      message.success('网络添加成功');
    } catch (error: any) {
      // 忽略 MetaMask 内部的 RPC 错误，因为添加操作实际上是成功的
      if (error.message && error.message.includes('f is not a function')) {
        message.success('网络添加成功');
      } else {
        message.error(error.message || '网络添加失败');
      }
    }
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
            <Button type="primary" size="small" icon={<ReloadOutlined />} onClick={() => fetchNetworks()}>刷新</Button>
            
          </Space>
        </div>

        <div className={styles.content}>
          <Descriptions title="钱包网络信息" column={2} items={[
            {
              key: 'networkName',
              label: '网络名称',
              children: <Text type="secondary"><Tag color={getNetworkTagColor(walletInfo?.networkInfo?.chainId?.toString())}>{walletInfo?.networkInfo?.name}</Tag></Text>
            }, 
            {
              key: 'chainId',
              label: 'Chain ID',
              children: <Text type="secondary">{walletInfo?.networkInfo?.chainId?.toString()}</Text>
            },
            {
              key: 'gasPrice',
              label: 'Gas价格',
              children: <Text type="secondary">{ethers.formatEther(walletInfo?.feeData?.gasPrice || 0)} ETH</Text>
            },
            {
              key: 'blockNumber',
              label: '区块高度',
              children: <Text type="secondary">{walletInfo?.blockNumber?.toString()}</Text>
            },
          ]} />
          

          <Divider />

          <Space className={styles.networkSelector}>
            <Text type="secondary">选择网络：</Text>
            <Select
              value={targetNetwork?.chain_id.toString() || undefined}
              onChange={(value) => setTargetNetwork(networks.find(n => n.chain_id.toString() === value) || null)}
              loading={loading || networksLoading}
              disabled={!walletInfo}
              // className={styles.selector}
              placeholder="选择网络"
              style={{ width: 280 }}
            >
              {networks.map((network) => (
                <Option key={network.chain_id.toString()} value={network.chain_id.toString()}>
                  <div className={styles.networkOption}>
                    <Tag color={getNetworkTagColor(network.chain_id.toString())}>
                      {network.name}
                    </Tag>
                    <Text type="secondary" className={styles.chainId}>
                      Chain ID: {network.chain_id}
                    </Text>
                  </div>
                </Option>
              ))}
            </Select>
            
            
          </Space>

          <div style={{ marginTop: 16 }}>
            <Descriptions column={1} items={[
              {
                key: 'networkName',
                label: 'RPC地址',
                children: <Text type="secondary">{targetNetwork?.rpc_url}</Text>
              }, 
              {
                key: 'explorerUrl',
                label: '浏览器URL',
                children: <Text type="secondary">{targetNetwork?.explorer_url}</Text>
              }
            ]} />
          </div>
          
          <div className={styles.networkSwitch}>
            <Button 
              icon={<PlusOutlined />} 
              disabled={!targetNetwork}
              onClick={() => addNetworkToMetamask(targetNetwork!)}
            >
              添加网络
            </Button>

            <Button 
              type="primary" 
              icon={<SwitcherOutlined />} 
              onClick={() => handleNetworkChange(targetNetwork?.chain_id.toString() || '')}
              disabled={!targetNetwork || targetNetwork.chain_id.toString() === walletInfo?.chainId?.toString()}
            >切换网络</Button>
          </div>
        </div>
      </Card>
    </>
  );
};

export default NetworkManager;
