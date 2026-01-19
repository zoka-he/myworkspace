import { Button, Descriptions, Divider, Space, Table, Tag, Typography } from 'antd';
import { useState, useEffect } from 'react';
import { useMQ } from '@/src/components/context/aiNovel';
import { fetchMqMessages } from '@/src/api/rabbitMq';

const { Text } = Typography;

export default function RabbitMqState() {

    const [mqMessages, setMqMessages] = useState([]);

    const connection = useMQ();

    useEffect(() => {
        handleFetchMqMessages();
    }, []);

    let connectState = <Tag>未连接</Tag>;
    if (connection.status === 'connected') {
        connectState = <Tag color="green">已连接</Tag>;
    } else if (connection.status === 'connecting') {
        connectState = <Tag color="blue">连接中</Tag>;
    } else if (connection.status === 'reconnecting') {
        connectState = <Tag color="yellow">重连中</Tag>;
    } else if (connection.status === 'error') {
        connectState = <Tag color="red">连接错误</Tag>;
    }

    function cueMq() {
        connection.sendMessage('/queue/test', 'Hello, RabbitMQ!');
    }

    function cueBackend() {
        connection.sendMessage('/queue/ai_novel_tasks', 'Hello, RabbitMQ!');
    }

    async function handleFetchMqMessages() {
        const res = await fetchMqMessages({});
        if (res.data) {
            setMqMessages(res.data);
        }
    }

    function formatBool(bool: boolean) {
        return <Tag color={bool ? 'green' : 'red'}>{bool ? '是' : '否'}</Tag>
    }

    return (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Descriptions title="RabbitMQ状态" bordered size="small" column={2}>
            <Descriptions.Item label="连接URL">
                {connectState} <Text>{connection.config.wsUrl}</Text> 
            </Descriptions.Item>
            <Descriptions.Item label="操作">
                <Space>
                    <Button type="primary" onClick={cueMq}>Cue它一下</Button>
                    <Button type="primary" onClick={cueBackend}>让它Cue后端一下</Button>
                </Space>
            </Descriptions.Item>
        </Descriptions>

        {/* <Divider /> */}
        <div className="f-flex-two-side ">
            <Space>
                <Typography.Title level={5}>消息历史</Typography.Title>
            </Space>
            <Space>
                <Button type="primary" size="small" onClick={handleFetchMqMessages}>刷新</Button>
            </Space>
        </div>

        <Table dataSource={mqMessages} bordered size="small">
            <Table.Column title="消息队列" dataIndex="name" key="name" />
            <Table.Column title="消息数量" dataIndex="messages" key="messages" />
            <Table.Column title="状态" dataIndex="state" key="state" />
            <Table.Column title="持久化" dataIndex="durable" key="durable" render={(durable) => formatBool(durable)} />
            <Table.Column title="自动删除" dataIndex="auto_delete" key="auto_delete" render={(auto_delete) => formatBool(auto_delete)} />
            <Table.Column title="内存使用" dataIndex="memory" key="memory" />
            <Table.Column title="消息字节" dataIndex="message_bytes" key="message_bytes" />
            <Table.Column title="消费者数量" dataIndex="consumers" key="consumers" />
            <Table.Column title="消息未确认数量" dataIndex="messages_unacknowledged" key="messages_unacknowledged" />
            <Table.Column title="消息准备数量" dataIndex="messages_ready" key="messages_ready" />
        </Table>
        </Space>
    )
}