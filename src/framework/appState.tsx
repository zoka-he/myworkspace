import { useAppState } from '../utils/hooks/useAppState';
import { Typography, Space, Descriptions, Tag } from 'antd';
import mysqlConfig from '@/src/config/mysql';
import { useConnection, useChainId, useEnsAddress, useConnectors, Connector } from 'wagmi';
import { Image } from 'antd';

const { Text, Paragraph } = Typography;

const DESCRIPTION_STYLES = {
    label: {
        width: 100,
    },
    content: {
        width: 400,
    },
}

export default function AppState() {
    return (
        <Space direction="vertical" size="middle">
            <BaseState />
            <WalletState />
        </Space>
    )
}

function BaseState() {
    let { difyFrontHost } = useAppState();
    return (
        <Descriptions title="应用配置" bordered size="small" column={1} styles={DESCRIPTION_STYLES}>
            <Descriptions.Item label="Mysql主机">
                <Text>{mysqlConfig.MYSQL_HOST}:{mysqlConfig.MYSQL_PORT}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Dify主机">
                <Text>{difyFrontHost}</Text>
            </Descriptions.Item>
        </Descriptions>
    )
}

function WalletState() {
    let connection = useConnection();
    let connectors = useConnectors();
    // let connector = useConnector();

    function renderWalletAddress(address: string) {
        let isCurrentAddress = address === connection.address;
        let text = isCurrentAddress ? '当前 ' + address : address;
        let color = isCurrentAddress ? 'blue' : 'default';

        return (
            <Tag color={color}>{text}</Tag>
        )
    }

    function ConnectorItem({ connector }: { connector: Connector }) {
        let isCurrentConnector = connector.id === connection.connector?.id;

        return (
            <Space>
                <Image src={connector.icon} alt={connector.name} width={'1em'} height={'1em'} style={{ transform: 'translateY(-2px)' }}/>
                <Text> {connector.name}</Text>
                {isCurrentConnector && <Tag color="blue">当前</Tag>}
            </Space>
        )
    }

    return (
        <Descriptions title="钱包状态" bordered size="small" column={1} styles={DESCRIPTION_STYLES}>
            <Descriptions.Item label="可用钱包">
                <Space direction="vertical" size="small">
                    {Array.from(connectors || []).map(item => <ConnectorItem connector={item} />)}
                </Space>
            </Descriptions.Item>
            <Descriptions.Item label="连接状态">
                <Text>{connection.status}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="链ID">
                <Text>{connection.chainId}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="钱包地址">
                <Space direction="vertical" size="small">
                    {Array.from(connection.addresses || []).map(renderWalletAddress)}
                </Space>
            </Descriptions.Item>
        </Descriptions>
    )
}