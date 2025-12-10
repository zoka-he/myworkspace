import { Card, Typography, Row, Col, Tabs } from "antd";
import { TransactionOutlined } from "@ant-design/icons";
import styles from './WalletActions.module.scss';
import TransactionSend from './TransactionSend';
import WatchContract from './WatchContract';
import WalletLog from './WalletLog';
import MarketValue from './MarketValue';
import TransactionHistory from './TransactionHistory';
import NftOfWallet from './NftOfWallet';
import { useWalletContext } from '../WalletContext';
import ErrorFallback from '@/src/components/ErrorFallbackBoundary/ErrorFallback';


const { Title, Paragraph } = Typography;

export interface WalletActionsProps {
    // walletInfo?: IWalletInfo | null;
}

export default function WalletActions(props: WalletActionsProps) {
    const { walletInfo } = useWalletContext();
    let tabs = [
        {
            key: '0',
            label: '钱包指令日志',
            children: <ErrorFallback><WalletLog/></ErrorFallback>,
        },
        {
            key: '1',
            label: '交易发送',
            children: <ErrorFallback><TransactionSend/></ErrorFallback>,
        },
        {
            key: '2',
            label: '交易历史',
            children: <ErrorFallback><TransactionHistory/></ErrorFallback>,
        },
        {
            key: '3',
            label: 'NFT',
            children: <ErrorFallback><NftOfWallet/></ErrorFallback>,
        },
        {
            key: '4',
            label: '市值',
            children: <ErrorFallback><MarketValue/></ErrorFallback>,
        },
        {
            key: '5',
            label: '合约监控',
            children: <ErrorFallback><WatchContract/></ErrorFallback>,
        }
    ];


    return (
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
                    <Row>
                        <Col span={8}>
                            <ul className={styles.featureList}>
                                <li>查看账户余额和交易历史</li>
                                <li>发送和接收以太坊</li>
                            </ul>
                        </Col>
                        <Col span={8}>
                            <ul className={styles.featureList}>
                                <li>与智能合约交互（未开发）</li>
                                <li>管理NFT和代币（未开发）</li>
                            </ul>
                        </Col>
                    </Row>
                    
                    

                    {/* <div className={styles.comingSoon}>
                        <Button type="dashed" disabled>
                        更多功能即将推出...
                        </Button>
                    </div> */}

                    <Tabs items={tabs} defaultActiveKey="1"></Tabs>
                </>
            )}
        </Card>
    );
}





