import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * RabbitMQ 队列信息 API
 * 
 * GET /api/web/rabbitmq/queue?name=queue_name - 获取指定队列信息
 * GET /api/web/rabbitmq/queue - 获取所有队列列表
 */

interface QueueInfo {
    name: string;
    vhost: string;
    messages: number;
    messages_ready: number;
    messages_unacknowledged: number;
    consumers: number;
    state: string;
    durable: boolean;
    auto_delete: boolean;
    memory?: number;
    message_bytes?: number;
}

interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse<QueueInfo | QueueInfo[]>>
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { name } = req.query;
    
    // 从环境变量获取配置
    const managementUrl = process.env.RABBITMQ_MANAGEMENT_URL 
        || `http://${process.env.RABBITMQ_STOMP_HOST || 'localhost'}:15672`;
    const username = process.env.RABBITMQ_STOMP_USER || 'guest';
    const password = process.env.RABBITMQ_STOMP_PASSWD || 'guest';
    const vhost = encodeURIComponent(process.env.RABBITMQ_STOMP_VHOST || '/');

    const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

    try {
        let url: string;
        
        if (name && typeof name === 'string') {
            // 获取指定队列信息
            url = `${managementUrl}/api/queues/${vhost}/${encodeURIComponent(name)}`;
        } else {
            // 获取所有队列列表
            url = `${managementUrl}/api/queues/${vhost}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[RabbitMQ API] Error:', response.status, errorText);
            return res.status(response.status).json({ 
                success: false, 
                error: `RabbitMQ API error: ${response.status} - ${errorText}` 
            });
        }

        const data = await response.json();
        
        // 格式化返回数据
        if (Array.isArray(data)) {
            const queues: QueueInfo[] = data.map((q: any) => ({
                name: q.name,
                vhost: q.vhost,
                messages: q.messages || 0,
                messages_ready: q.messages_ready || 0,
                messages_unacknowledged: q.messages_unacknowledged || 0,
                consumers: q.consumers || 0,
                state: q.state || 'unknown',
                durable: q.durable || false,
                auto_delete: q.auto_delete || false,
                memory: q.memory,
                message_bytes: q.message_bytes,
            }));
            return res.status(200).json({ success: true, data: queues });
        } else {
            const queue: QueueInfo = {
                name: data.name,
                vhost: data.vhost,
                messages: data.messages || 0,
                messages_ready: data.messages_ready || 0,
                messages_unacknowledged: data.messages_unacknowledged || 0,
                consumers: data.consumers || 0,
                state: data.state || 'unknown',
                durable: data.durable || false,
                auto_delete: data.auto_delete || false,
                memory: data.memory,
                message_bytes: data.message_bytes,
            };
            return res.status(200).json({ success: true, data: queue });
        }
    } catch (error) {
        console.error('[RabbitMQ API] Fetch error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        });
    }
}
