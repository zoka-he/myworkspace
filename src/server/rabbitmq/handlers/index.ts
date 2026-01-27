/**
 * RabbitMQ Message Handlers
 * 
 * 在这里注册你的消息处理逻辑
 * 
 * 重试机制说明:
 * - 每个队列可以配置最大重试次数 (默认 3 次)
 * - 重试使用指数退避策略 (1s, 2s, 4s...)
 * - 超过最大重试次数的消息会进入死信队列 (queue_name.dlq)
 * - 可以调用 reject() 直接拒绝消息，不进行重试
 */

import { 
    getRabbitMQConsumer, 
    MessageHandler, 
    MessageContext,
    QueueConfig,
    closeRabbitMQConsumer 
} from '../consumer';

import { handleTestMessages } from './handleTestMessages';
import handleAiNovelMessages from './handleAiNovelMessages';
import handleAiNovelEmbedTasks from './handleAiNovelEmbedTasks';



/**
 * 队列配置
 */
export interface QueueRegistration {
    queue: QueueConfig;
    handler: MessageHandler;
    enabled: boolean;
}

/**
 * 注册的队列和处理器
 * 在这里添加你需要监听的队列
 */
export const queueRegistrations: QueueRegistration[] = [
    // 测试队列 - 用于前端简单确认 (广播模式)
    {
        queue: {
            name: 'frontend_notice',
            durable: true,
            prefetch: 1,
            broadcast: {
                enabled: true,
                // exchangeName: 'frontend_notice.fanout', // 可选，默认为 {queueName}.fanout
            },
        },
        handler: handleTestMessages,
        enabled: true, // 设为 true 启用
    },
    // AI Novel 队列
    {
        queue: {
            name: 'ai_novel_tasks',
            durable: true,
            prefetch: 1,
            retry: {
                maxRetries: parseInt(process.env.RABBITMQ_AI_NOVEL_MAX_RETRIES || '5', 10),
                baseDelay: 2000,    // 2 秒起步
                maxDelay: 60000,    // 最大 1 分钟
                enableDLX: true,
            },
        },
        handler: handleAiNovelMessages,
        enabled: true,
    },
    // rag嵌入任务队列
    {
        queue: {
            name: 'ai_novel_embed_tasks',
            durable: true,
            prefetch: 1,
            retry: {
                maxRetries: parseInt(process.env.RABBITMQ_AI_NOVEL_EMBED_TASKS_MAX_RETRIES || '5', 10),
                baseDelay: 10 * 1000,    // 10 秒起步
                maxDelay: 20 * 60 * 1000,    // 最大 20 分钟（可能要等前面嵌入任务处理完）
                enableDLX: true,
            },
        },
        handler: handleAiNovelEmbedTasks,
        enabled: true,
    },
    // 在这里添加更多队列...
];

/**
 * 初始化所有消息处理器
 */
export async function initializeHandlers(): Promise<void> {
    const consumer = getRabbitMQConsumer();
    
    // 先注册所有启用的队列消费者（即使连接失败，注册信息也会保存，重连时会自动恢复）
    for (const registration of queueRegistrations) {
        if (registration.enabled) {
            console.log(`[RabbitMQ] Registering consumer for queue: ${registration.queue.name}`);
            console.log(`[RabbitMQ]   - Max retries: ${registration.queue.retry?.maxRetries ?? 3}`);
            console.log(`[RabbitMQ]   - DLX enabled: ${registration.queue.retry?.enableDLX ?? true}`);
            await consumer.consume(registration.queue, registration.handler);
        }
    }
    
    // 连接到 RabbitMQ（如果连接失败，会自动重试，已注册的消费者会在连接成功后自动设置）
    try {
        await consumer.connect();
        console.log('[RabbitMQ] All handlers initialized and connected');
    } catch (error) {
        console.warn('[RabbitMQ] Initial connection failed, will retry automatically:', error instanceof Error ? error.message : String(error));
        console.log('[RabbitMQ] Consumers registered, will be set up when connection succeeds');
    }
}

/**
 * 动态添加队列消费者
 */
export async function addConsumer(queue: QueueConfig | string, handler: MessageHandler): Promise<void> {
    const consumer = getRabbitMQConsumer();
    await consumer.consume(queue, handler);
}

export { closeRabbitMQConsumer };

export default initializeHandlers;
