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
import { Connector, useEnsAddress, useBalance, useConnect, useConnection, useConnectors, useBlockNumber, useGasPrice, ConnectorAlreadyConnectedError } from 'wagmi';

const { Title, Text, Paragraph } = Typography;

interface WalletConnectProps {
  // onWalletChange?: (walletInfo: IWalletInfo | null) => void;
}

export default function WalletConnect() {
  const connection = useConnection();
  const connectors = useConnectors();
  const connect = useConnect();

  // const address = useEnsAddress();
  const balance = useBalance({ address: connection.address });
  const blockNumber = useBlockNumber(); 
  const gasPrice = useGasPrice();

  // const { providerInfo, accountInfo, networkInfo, walletProvider, isWalletConnected, switchRdns, getWalletTool, refreshWalletInfo } = useWalletContext();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // const [installedBrowserWalletProviders, setInstalledBrowserWalletProviders] = useState<{ provider: any, info: IProviderInfo }[]>([]);
  // const [selectedBrowserWalletProviderRdns, setSelectedBrowserWalletProviderRdns] = useState<any>(null);

  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(connection.connector?.id ?? null);

  // const installedProviderInfos = useMemo(() => {
  //   return listProviderInfos();
  // }, []);

  // useEffect(() => {
  //   (async () => {
  //     setLoading(true);
  //     try {
  //       await refreshWalletInfo()
  //     } catch (error: any) {
  //       console.error('刷新钱包信息失败:', error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   })();
  // }, []);

  // 防止用户意外切换钱包提供者
  const allowChangeProvider = useMemo(() => {
    // 没有提供者，或只有1个提供者，没有必要切换
    if (connectors?.length === 0) return false;
    if (connectors?.length === 1) return false;

    // 没有切换的意义的情况
    if (selectedConnectorId === connection.connector?.id) return false;

    return true;
  }, [selectedConnectorId, connection.connector]);

  // useEffect(() => {
  //   // 首先更新选择的钱包提供者
  //   if (!isWalletConnected) {
  //     setSelectedBrowserWalletProviderRdns(null);
  //   } else if (providerInfo?.rdns) {
  //     setSelectedBrowserWalletProviderRdns(providerInfo.rdns);
  //   }

  //   // 然后更新钱包信息
  //   setRefreshing(true);
  //   refreshWalletInfo().then(() => {
  //     setRefreshing(false);
  //   });
  // }, [providerInfo, isWalletConnected]);

  

  // 切换钱包提供者
  const handleSwitchProvider = async () => {
    if (!selectedConnectorId) {
      message.error('请先选择钱包');
      return;
    }

    const targetConnector = connect.connectors?.find(item => item.id === selectedConnectorId);
    if (!targetConnector) {
      message.error('未找到选择的钱包连接器');
      return;
    }

    try {
      setLoading(true);
      await connect.mutateAsync({ connector: targetConnector });
      message.success('切换钱包提供者成功');
    } catch (error: any) {
      if (error instanceof ConnectorAlreadyConnectedError) {
        message.error('这不应该啊，怎么没跳转。。。');
      } else {
        message.error(error.message || '切换钱包提供者失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    // setWalletInfo(null);
    // onWalletChange?.(null);
    // message.info('已断开钱包连接');
  };

  const handleCopyAddress = () => {
    if (connection.address && connection.address.length > 0) {
      copyToClip(connection.address);
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
  function renderProviderOption(info: Connector ) {
    return (
      <Space key={info.id} align='center'>
        <img style={{ width: '1em', height: '1em', transform: 'translateY(-0.18em)' }} src={info.icon} alt={info.name} className={styles.providerIcon} />
        <Text key={info.id} color="blue">{info.name}</Text>
      </Space>
    )
  }

  function formatHexToDec(s: string) {
    if (!s) return '--';
    return BigInt(s).toString();
  }

  // 引导安装钱包
  if (connectors?.length === 0) {
    return (
      <NoWalletInstalled />
    );
  }

  // 引导连接钱包
  if (!connection.isConnected) {
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
              {/* <Button icon={<ReloadOutlined />} loading={refreshing} onClick={refreshWalletInfo} size="small">刷新</Button> */}
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
              <Select style={{width: '100%'}} value={selectedConnectorId}
                options={connectors?.map((connector) => ({
                  label: renderProviderOption(connector),
                  value: connector.id
                }))}
                onChange={(value) => setSelectedConnectorId(value)}
              />
            </Space.Compact>
            <Button type="primary" onClick={handleSwitchProvider} disabled={!allowChangeProvider}>切换</Button>
          </div>

          <Divider />

          <div className={styles.infoSection}>
            <Spin spinning={refreshing}>
              <Descriptions size="small" column={2} bordered labelStyle={{width: '120px'}}>
                <Descriptions.Item label={<><UserOutlined /> <span>钱包地址</span></>} span={2}>
                  <Text code className={styles.address}>{connection.address}</Text>
                  <Button type="text" icon={<CopyOutlined />} onClick={handleCopyAddress} size="small"/>
                </Descriptions.Item>

                <Descriptions.Item label={<><DollarOutlined /> <span>账户余额</span></>} span={2}>
                  <Text strong className={styles.balance} style={{ color: '#52c41a' }}>{formatBalance(balance.data?.value.toString() || '0')}</Text>
                  {/* <Text strong className={styles.balance} style={{ color: '#52c41a' }}>{balance.data?.value.toString() || '--'}</Text> */}
                </Descriptions.Item>

                <Descriptions.Item label={<><GlobalOutlined /> <span>Chain ID</span></>} span={2}>
                  {connection.chainId} ({connection.chainId?.toString(16)})
                </Descriptions.Item>

                <Descriptions.Item label={<><ClockCircleOutlined /> <span>区块高度</span></>} span={1}> {blockNumber.data?.toString()}</Descriptions.Item>

                <Descriptions.Item label={<><DollarOutlined /> <span>Gas价格</span></>} span={1}> {readableAmount(gasPrice.data?.toString() || '0')}</Descriptions.Item>
                {/* <Descriptions.Item label={<><DollarOutlined /> <span>Gas价格</span></>} span={1}> {gasPrice.data?.toString()}</Descriptions.Item> */}
              </Descriptions>
            </Spin>
          </div>
          
        </div>
      </Card>
    </>
  );
};


