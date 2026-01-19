import { Card, Space, Select, Button, Modal, Typography, message } from "antd";
import { WalletOutlined, RightOutlined } from "@ant-design/icons";
import styles from './index.module.scss';
import { useEffect, useMemo, useState } from "react";
import { getInstalledProvider, IProviderInfo } from "@/src/utils/ethereum/metamask";
// import { WalletTool } from "@/src/utils/ethereum/WalletTools";
import { listProviderInfos, isConnected, hasProviders, getProvider } from "@/src/utils/ethereum";
// import { useWalletContext } from "../../WalletContext";
import { connectWallet, isMetaMaskInstalled } from "@/src/utils/ethereum/metamask";
import { Connector, useConnection, useConnectors, useConnect, ConnectorAlreadyConnectedError } from "wagmi";

const { Title, Text, Paragraph } = Typography;


export default function BeforeConnect() {
    // const { providerInfo, switchRdns } = useWalletContext();
    const connection = useConnection();
    const connectors = useConnectors();
    const connect = useConnect();
    const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(connection.connector?.id ?? null);

    // const [selectedBrowserWalletProviderRdns, setSelectedBrowserWalletProviderRdns] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [show32002, setShow32002] = useState(false);

    // 初始化检查
    useEffect(() => {

        
    }, []);

        function renderProviderOption(connector: Connector) {
            return (
                <Space key={connector?.id} align='center'>
                    <img style={{ width: '1em', height: '1em', transform: 'translateY(-0.18em)' }} src={connector?.icon ?? ''} alt={connector?.name ?? ''} className={styles.providerIcon} />
                    <Text key={connector?.id} color="blue">{connector?.name}</Text>
                </Space>
            )
        }

    // 尝试连接钱包，成功会设置钱包信息和钱包提供者
    const handleConnect = async () => {

        if (!hasProviders()) {
            message.error('未检测到钱包，请先安装钱包');
            return;
        }

        if (!selectedConnectorId) {
            message.error('请先选择钱包');
            return;
        }

        try {
            setLoading(true);
            const targetConnector = connectors?.find(item => item.id === selectedConnectorId);

            if (!targetConnector) {
                message.error('未找到选择的钱包连接器');
                return;
            }

            const result = await connect.mutateAsync({ connector: targetConnector });
            message.success('钱包连接成功');
        } catch (error: any) {
            if (error instanceof ConnectorAlreadyConnectedError) {
                message.error('这不应该啊，怎么没跳转。。。');
            } else {
                message.error(error.message || '连接钱包失败');
            }
        } finally {
            setLoading(false);
        }
    };


    return (
        <>
            <Card className={styles.walletCard}>
                <div className={styles.connectSection}>
                    <WalletOutlined className={styles.walletIcon} />
                    <Title level={4}>连接钱包</Title>
                    <Paragraph type="secondary">连接您的MetaMask钱包以查看账户信息和网络状态</Paragraph>
                    <Space.Compact className={styles.connectWrap}>
                        <Space.Addon className={styles.connectAddon}><Text><WalletOutlined /></Text></Space.Addon>
                        <Select 
                            className={styles.connectSelect} 
                            size="large" 
                            value={selectedConnectorId} 
                            loading={loading}
                            onChange={(value) => setSelectedConnectorId(value)}
                            options={Array.from(connectors || []).map((connector) => ({
                                label: renderProviderOption(connector),
                                value: connector?.id
                            }))} 
                            placeholder="请选择钱包"
                            notFoundContent={connectors?.length === 0 ? "未检测到钱包" : undefined}
                        />
                        <Button 
                            type="primary" 
                            size="large"
                            loading={loading}
                            onClick={handleConnect}
                            className={styles.connectButton}
                        >
                            连接<RightOutlined />
                        </Button>
                    </Space.Compact>
                </div>
            </Card>
            <Modal open={show32002} onOk={() => setShow32002(false)}>
                <Typography.Title level={4}>重复连接请求</Typography.Title>
                <Typography.Text>连接已发起，请前往'{connectors?.find(item => item.id === selectedConnectorId)?.name}'钱包处理</Typography.Text>
            </Modal>
        </>
    )
}