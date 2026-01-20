import type { NextApiRequest, NextApiResponse } from 'next';
import { getRabbitMQProducerAsync } from '@/src/server/rabbitmq/producer';

interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

interface SendMessageRequest {
    /** 队列名称 */
    queue: string;
    /** 消息内容 (字符串或对象) */
    message: string | object;
    /** 是否持久化消息 (default: true) */
    persistent?: boolean;
}

interface SendMessageResponse {
    queue: string;
    messageId: string;
    timestamp: string;
}

let count = 0;
const queue = 'frontend_notice';
function getReplyMessage() {
    return '这是后端，没事别扒拉！(' + (++count) + ')';
}

const persistent = false;

/**
 * RabbitMQ 消息发送 API (广播模式)
 * 
 * POST /api/web/aiNoval/llm/once/ping
 * Body: { queue: "queue_name", message: "message content" | { ... }, persistent?: boolean }
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse<SendMessageResponse>>
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {

        // 获取 RabbitMQ 生产者实例
        const producer = await getRabbitMQProducerAsync();

        // 广播消息到所有订阅者
        const result = await producer.broadcast(queue, getReplyMessage(), { persistent: true });

        if (!result) {
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to send message to queue' 
            });
        }

        // 生成消息 ID (用于追踪)
        const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date().toISOString();

        console.log(`[RabbitMQ] Message sent to queue "${queue}":`, { messageId, timestamp });

        return res.status(200).json({
            success: true,
            data: {
                queue,
                messageId,
                timestamp,
            },
        });

    } catch (error) {
        console.error('[RabbitMQ API] Error sending message:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}