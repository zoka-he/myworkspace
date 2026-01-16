import { Button, Card, Descriptions, Space, Typography } from "antd";
import { useWalletContext } from "../../transaction/WalletContext";
import { useEffect, useMemo } from "react";
import { ReloadOutlined, UserOutlined } from "@ant-design/icons";

const { Text } = Typography;

export default function WalletInfo() {

    const { accountInfo, networkInfo, refreshWalletInfo } = useWalletContext();

    // 只在组件挂载时调用一次，避免循环触发
    useEffect(() => {
        refreshWalletInfo();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    console.log(accountInfo);

    const title = useMemo(() => {
        return <Space><UserOutlined /><span>钱包信息</span>
            <Button type="text" icon={<ReloadOutlined />} onClick={refreshWalletInfo} />
        </Space>;
    }, [refreshWalletInfo]);

    return (
        <Card title={title} size="small">
            <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="钱包地址">
                    <Text code>{accountInfo?.selectedAddress}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="账户余额">
                    <Text strong>{accountInfo?.balance}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Chain ID">
                    <Text>{networkInfo?.chainId}</Text>
                </Descriptions.Item>
            </Descriptions>
        </Card>
    )
}