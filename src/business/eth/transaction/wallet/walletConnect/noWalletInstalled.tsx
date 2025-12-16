import { Card, Alert, Button } from "antd";
import styles from './index.module.scss';

export default function NoWalletInstalled() {
    return (
        <Card className={styles.walletCard}>
            <Alert
                message="MetaMask未安装"
                description="请先安装MetaMask钱包扩展程序"
                type="warning"
                showIcon
                action={
                    <Button 
                    type="primary" 
                    href="https://metamask.io/download/" 
                    target="_blank"
                    >
                    安装MetaMask
                    </Button>
                }
            />
        </Card>
    )
}