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
} from './consumer';

/**
 * 示例消息处理器
 * 展示如何使用新的 handler API
 */
const exampleHandler: MessageHandler = async (ctx, ack, nack, reject) => {
    const { content, retryCount, maxRetries, isLastRetry } = ctx;
    
    try {
        const data = JSON.parse(content);
        console.log(`[Handler] Processing message (attempt ${retryCount + 1}/${maxRetries + 1}):`, data);
        
        // 在这里处理你的业务逻辑
        // ...
        
        // 处理成功，确认消息
        ack();
    } catch (error) {
        console.error('[Handler] Error processing message:', error);
        
        if (isLastRetry) {
            console.error('[Handler] Max retries reached, message will be sent to DLQ');
        }
        
        // 处理失败，触发重试机制
        // nack() 会自动处理重试逻辑:
        // - 未超过重试次数: 延迟后重试
        // - 超过重试次数: 发送到死信队列
        nack();
    }
};

/**
 * AI Novel 消息处理器
 * 处理 AI 小说生成相关的消息
 */
const aiNovelHandler: MessageHandler = async (ctx, ack, nack, reject) => {
    const { content, retryCount, isLastRetry } = ctx;
    
    try {
        const data = JSON.parse(content);
        console.log(`[AI Novel Handler] Received (attempt ${retryCount + 1}):`, data);
        
        // 根据消息类型处理不同的业务逻辑
        const { type, payload } = data;
        
        switch (type) {
            case 'generate_chapter':
                console.log('[AI Novel] Generating chapter:', payload);
                // TODO: 实现章节生成逻辑
                // 如果后端服务不可用，会抛出异常，触发重试
                break;
                
            case 'generate_skeleton':
                console.log('[AI Novel] Generating skeleton:', payload);
                // TODO: 实现骨架生成逻辑
                break;
                
            case 'invalid_task':
                // 对于无效任务，直接拒绝，不重试
                console.log('[AI Novel] Invalid task, rejecting:', payload);
                reject();
                return;
                
            default:
                console.log('[AI Novel] Unknown message type:', type);
                // 未知类型也直接拒绝
                reject();
                return;
        }
        
        ack();
    } catch (error) {
        console.error('[AI Novel Handler] Error:', error);
        
        // 判断是否是可重试的错误
        if (isRetryableError(error)) {
            if (isLastRetry) {
                console.error('[AI Novel] Max retries reached, giving up');
            }
            nack(); // 可重试错误，进入重试流程
        } else {
            // 不可重试的错误（如数据格式错误），直接拒绝
            console.error('[AI Novel] Non-retryable error, rejecting message');
            reject();
        }
    }
};

/**
 * 判断错误是否可重试
 */
function isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        // 网络错误、超时、服务不可用等可以重试
        if (
            message.includes('timeout') ||
            message.includes('network') ||
            message.includes('econnrefused') ||
            message.includes('econnreset') ||
            message.includes('service unavailable') ||
            message.includes('503') ||
            message.includes('502') ||
            message.includes('504')
        ) {
            return true;
        }
        
        // JSON 解析错误、参数验证错误等不应该重试
        if (
            message.includes('json') ||
            message.includes('invalid') ||
            message.includes('validation') ||
            message.includes('400')
        ) {
            return false;
        }
    }
    
    // 默认可重试
    return true;
}

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
    // 示例队列 - 默认禁用
    {
        queue: {
            name: 'example_queue',
            durable: true,
            prefetch: 1,
            retry: {
                maxRetries: 3,      // 最多重试 3 次
                baseDelay: 1000,    // 基础延迟 1 秒
                maxDelay: 30000,    // 最大延迟 30 秒
                enableDLX: true,    // 启用死信队列
            },
        },
        handler: exampleHandler,
        enabled: false, // 设为 true 启用
    },
    // AI Novel 队列
    {
        queue: {
            name: process.env.RABBITMQ_AI_NOVEL_QUEUE || 'ai_novel_tasks',
            durable: true,
            prefetch: 1,
            retry: {
                maxRetries: parseInt(process.env.RABBITMQ_AI_NOVEL_MAX_RETRIES || '5', 10),
                baseDelay: 2000,    // 2 秒起步
                maxDelay: 60000,    // 最大 1 分钟
                enableDLX: true,
            },
        },
        handler: aiNovelHandler,
        enabled: process.env.RABBITMQ_ENABLE_AI_NOVEL_CONSUMER === 'true',
    },
    // 在这里添加更多队列...
];

/**
 * 初始化所有消息处理器
 */
export async function initializeHandlers(): Promise<void> {
    const consumer = getRabbitMQConsumer();
    
    // 连接到 RabbitMQ
    await consumer.connect();
    
    // 注册所有启用的队列消费者
    for (const registration of queueRegistrations) {
        if (registration.enabled) {
            console.log(`[RabbitMQ] Registering consumer for queue: ${registration.queue.name}`);
            console.log(`[RabbitMQ]   - Max retries: ${registration.queue.retry?.maxRetries ?? 3}`);
            console.log(`[RabbitMQ]   - DLX enabled: ${registration.queue.retry?.enableDLX ?? true}`);
            await consumer.consume(registration.queue, registration.handler);
        }
    }
    
    console.log('[RabbitMQ] All handlers initialized');
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
