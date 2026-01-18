import { useAppState } from '../utils/hooks/useAppState';
import { Typography, Space, Descriptions } from 'antd';
import mysqlConfig from '@/src/config/mysql';

const { Text } = Typography;

export default function AppState() {
    let { difyFrontHost } = useAppState();

    return (
        <Descriptions title="应用配置" bordered size="small" column={1}>
            <Descriptions.Item label="Mysql主机">
                <Text>{mysqlConfig.MYSQL_HOST}:{mysqlConfig.MYSQL_PORT}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Dify主机">
                <Text>{difyFrontHost}</Text>
            </Descriptions.Item>
        </Descriptions>
    )
}