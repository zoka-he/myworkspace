import { Card, Space, Select, Button, Modal, Typography, message } from "antd";
import { WalletOutlined, RightOutlined } from "@ant-design/icons";
import styles from './index.module.scss';
import { useEffect, useMemo, useState } from "react";
import { getInstalledProvider, IProviderInfo } from "@/src/utils/ethereum/metamask";
import { WalletTool } from "@/src/utils/ethereum/WalletTools";
import { listProviderInfos, isConnected, hasProviders, getProvider } from "@/src/utils/ethereum";
import { useWalletContext } from "../../WalletContext";
import { connectWallet, isMetaMaskInstalled } from "@/src/utils/ethereum/metamask";

const { Title, Text, Paragraph } = Typography;


export default function BeforeConnect() {
    const { providerInfo, switchRdns } = useWalletContext();
    const [selectedBrowserWalletProviderRdns, setSelectedBrowserWalletProviderRdns] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [show32002, setShow32002] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // 使用 useMemo 动态计算，确保 options 始终是最新的
    const installedProviderInfos = useMemo(() => {
        return listProviderInfos();
    }, [refreshKey]);

    // 初始化检查
    useEffect(() => {
        // 加载所有浏览器钱包提供者
        let providers = getInstalledProvider();

        // 如果只有一个钱包提供者，则自动选择
        if (providers.length === 1) {
            setSelectedBrowserWalletProviderRdns(providers[0].info?.rdns);
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
            switchRdns(providerToConnect?.info?.rdns ?? null);
        }
        
    }, []);

    // 监听 provider 变化，定期刷新 provider 列表（处理异步加载的情况）
    useEffect(() => {
        // 初始检查
        const checkProviders = () => {
            const currentProviders = listProviderInfos();
            if (currentProviders.length > 0) {
                setRefreshKey(prev => prev + 1);
                
                // 如果之前设置了 selectedBrowserWalletProviderRdns，但 options 中没有，现在有了，确保值仍然有效
                if (selectedBrowserWalletProviderRdns) {
                    const exists = currentProviders.some(info => info.rdns === selectedBrowserWalletProviderRdns);
                    if (!exists) {
                        // 如果之前选择的值不存在了，尝试使用第一个可用的
                        if (currentProviders.length > 0) {
                            setSelectedBrowserWalletProviderRdns(currentProviders[0].rdns);
                        }
                    }
                }
            }
        };

        // 立即检查一次
        checkProviders();

        // 设置定时器，定期检查 provider 是否已加载（最多检查 5 秒）
        const maxAttempts = 10;
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            checkProviders();
            if (attempts >= maxAttempts) {
                clearInterval(interval);
            }
        }, 500);

        // 监听 eip6963:announceProvider 事件
        const handleAnnounceProvider = () => {
            checkProviders();
        };
        window.addEventListener('eip6963:announceProvider', handleAnnounceProvider);

        return () => {
            clearInterval(interval);
            window.removeEventListener('eip6963:announceProvider', handleAnnounceProvider);
        };
    }, [selectedBrowserWalletProviderRdns]);

    function renderProviderOption(info: IProviderInfo ) {
        return (
          <Space key={info?.rdns} align='center'>
            <img style={{ width: '1em', height: '1em', transform: 'translateY(-0.18em)' }} src={info?.icon ?? ''} alt={info?.name ?? ''} className={styles.providerIcon} />
            <Text key={info?.rdns} color="blue">{info?.name}</Text>
          </Space>
        )
    }

    // 尝试连接钱包，成功会设置钱包信息和钱包提供者
    const handleConnect = async () => {

        if (!hasProviders()) {
            message.error('未检测到钱包，请先安装钱包');
            return;
        }

        if (!selectedBrowserWalletProviderRdns) {
            message.error('请先选择钱包');
            return;
        }
        
        // if (selectedBrowserWalletProviderRdns.startsWith('io.metamask') && !isMetaMaskInstalled()) {
        //     message.error('请先安装MetaMask钱包');
        //     return;
        // }

        setLoading(true);
        try {
            const provider = getProvider(selectedBrowserWalletProviderRdns);

            if (!provider) {
                message.error('未检测到钱包，请检查代码');
                return;
            }

            const walletTool = WalletTool.from(provider);
            if (walletTool.isConnected()) {
                message.success('钱包已连接');
                switchRdns(selectedBrowserWalletProviderRdns);
            } else {
                await walletTool.connect();
                switchRdns(selectedBrowserWalletProviderRdns);
                message.success('钱包连接成功');
            }

            // const {info, provider} = await connectWallet(selectedBrowserWalletProviderRdns);
            
            // message.success('钱包连接成功');
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
                        <Select 
                            className={styles.connectSelect} 
                            size="large" 
                            value={selectedBrowserWalletProviderRdns} 
                            loading={loading}
                            onChange={(value) => setSelectedBrowserWalletProviderRdns(value)}
                            options={installedProviderInfos.map((info) => ({
                                label: renderProviderOption(info),
                                value: info?.rdns
                            }))} 
                            placeholder="请选择钱包"
                            notFoundContent={installedProviderInfos.length === 0 ? "未检测到钱包" : undefined}
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
                <Typography.Text>连接已发起，请前往'{providerInfo?.name}'钱包处理</Typography.Text>
            </Modal>
        </>
    )
}