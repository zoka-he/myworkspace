import { Card, Space, Select, Button, Modal, Typography, message } from "antd";
import { WalletOutlined, RightOutlined } from "@ant-design/icons";
import styles from './index.module.scss';
import { useEffect, useMemo, useState } from "react";
import { getInstalledProvider, IProviderInfo, isConnected, listProviderInfos } from "@/src/utils/ethereum/metamask";
import { useWalletContext } from "../../WalletContext";
import { connectWallet, isMetaMaskInstalled } from "@/src/utils/ethereum/metamask";

const { Title, Text, Paragraph } = Typography;


export default function BeforeConnect() {
    const { providerInfo, switchRdns } = useWalletContext();
    const [selectedBrowserWalletProviderRdns, setSelectedBrowserWalletProviderRdns] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [show32002, setShow32002] = useState(false);

    const [installedProviderInfos, setInstalledProviderInfos] = useState<IProviderInfo[]>([]);

    // 初始化检查
    useEffect(() => {
        // checkWalletStatus();
        setInstalledProviderInfos(listProviderInfos());

        // 加载所有浏览器钱包提供者
        let providers = getInstalledProvider();

        // 如果只有一个钱包提供者，则自动选择
        if (providers.length === 1) {
            setSelectedBrowserWalletProviderRdns(providers[0].info.rdns);
        }

        // 如果只有一个钱包建立了连接，则自动选择
        let providerToConnect = null;
        let connectedCount = 0;
        for (let {info, provider} of providers) {
            if (isConnected(provider)) {
                providerToConnect = {info, provider};
                ++connectedCount;
                console.debug('钱包已连接', info, provider?.isConnected());
            }
        }

        if (connectedCount === 1) {
            setSelectedBrowserWalletProviderRdns(providerToConnect?.info.rdns ?? null);
            switchRdns(providerToConnect?.info.rdns ?? null);
        }
        
    }, []);

    function renderProviderOption(info: IProviderInfo ) {
        return (
          <Space key={info.rdns} align='center'>
            <img style={{ width: '1em', height: '1em', transform: 'translateY(-0.18em)' }} src={info.icon} alt={info.name} className={styles.providerIcon} />
            <Text key={info.rdns} color="blue">{info.name}</Text>
          </Space>
        )
    }

    // 尝试连接钱包，成功会设置钱包信息和钱包提供者
    const handleConnect = async () => {
        if (selectedBrowserWalletProviderRdns.startsWith('io.metamask') && !isMetaMaskInstalled()) {
            message.error('请先安装MetaMask钱包');
            return;
        }

        setLoading(true);
        try {
            const {info, provider} = await connectWallet(selectedBrowserWalletProviderRdns);
            switchRdns(info?.rdns ?? null);
            message.success('钱包连接成功');
        } catch (error: any) {
        // console.error('连接钱包失败:', error, Object.keys(error));
            if (error.code === -32002) {
                console.debug('显示32003弹窗')
                setShow32002(true);
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
                        <Select className={styles.connectSelect} size="large" value={selectedBrowserWalletProviderRdns} 
                            loading={loading}
                            options={installedProviderInfos.map((info) => ({
                                label: renderProviderOption(info),
                                value: info.rdns
                            }))} />
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
                <Typography.Text>连接已发起，请前往'{providerInfo?.name}'钱包处理</Typography.Text>
            </Modal>
        </>
    )
}