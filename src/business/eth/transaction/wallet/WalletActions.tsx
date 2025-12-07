import { Card, Button, Typography, Row, Col, Tabs, Table, Descriptions, Tag, Space, Input, Spin, message, Form, InputNumber, Select, Divider, Alert, Modal, Segmented, Checkbox } from "antd";
import { useState, useEffect } from "react";
import { TransactionOutlined, SearchOutlined, CopyOutlined, ArrowUpOutlined, ArrowDownOutlined, SendOutlined, WalletOutlined, SettingOutlined, ReloadOutlined, ExclamationCircleOutlined, EditOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { WalletInfo } from "@/src/utils/ethereum/metamask";
import copyToClip from '@/src/utils/common/copy';
import fetch from '@/src/fetch';
import styles from './WalletActions.module.scss';
import transactionHistoryStyles from './TransactionHistory.module.scss';
import { IWalletInfo } from '../IWalletInfo';
import { ethers } from 'ethers';
import TransactionSend from './TransactionSend';
import WatchContract from './WatchContract';
import WalletLog from './WalletLog';
import MarketValue from './MarketValue';
import TransactionHistory from './TransactionHistory';


const { Title, Paragraph } = Typography;
const { Column } = Table;

export interface WalletActionsProps {
    walletInfo?: IWalletInfo | null;
}

export default function WalletActions(props: WalletActionsProps) {
    let tabs = [
        {
            key: '0',
            label: '钱包指令日志',
            children: <WalletLog/>,
        },
        {
            key: '1',
            label: '交易发送',
            children: <TransactionSend walletInfo={props.walletInfo}/>,
        },
        {
            key: '2',
            label: '交易历史',
            children: <TransactionHistory walletInfo={props.walletInfo}/>,
        },
        {
            key: '3',
            label: '扫链',
            children: null,
        },
        {
            key: '4',
            label: '市值',
            children: <MarketValue/>,
        },
        {
            key: '5',
            label: '合约监控',
            children: <WatchContract/>,
        }
    ];


    return (
        <Card className={styles.transactionCard}>
            <div className={styles.cardHeader}>
                <TransactionOutlined className={styles.cardIcon} />
                <Title level={4} className={styles.cardTitle}>交易功能</Title>
            </div>
            {props.walletInfo && (
                <>
                    <Paragraph type="secondary">
                        钱包连接成功！您现在可以：
                    </Paragraph>
                    <Row>
                        <Col span={8}>
                            <ul className={styles.featureList}>
                                <li>查看账户余额和交易历史（开发中）</li>
                                <li>发送和接收以太坊（开发中）</li>
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





