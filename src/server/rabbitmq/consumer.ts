/**
 * Server-side RabbitMQ Consumer Service
 * 
 * 在 Next.js 服务器端启动时监听 RabbitMQ 消息
 * 使用 amqplib (AMQP 0-9-1 协议)
 * 
 * 特性:
 * - 自动重连
 * - 消息重试限制 (防止死循环)
 * - 死信队列支持
 * - 延迟重试
 */

import amqp, { Connection, Channel, ConsumeMessage } from 'amqplib';

export interface RabbitMQServerConfig {
    /** AMQP URL (e.g., amqp://user:pass@localhost:5672/vhost) */
    url?: string;
    /** Host */
    host?: string;
    /** Port (default: 5672) */
    port?: number;
    /** Username */
    username?: string;
    /** Password */
    password?: string;
    /** Virtual host (default: /) */
    vhost?: string;
    /** Heartbeat interval in seconds (default: 60) */
    heartbeat?: number;
    /** Reconnect delay in ms (default: 5000) */
    reconnectDelay?: number;
    /** Max reconnect attempts (default: -1 for infinite) */
    maxReconnectAttempts?: number;
}

export interface RetryConfig {
    /** 最大重试次数 (default: 3) */
    maxRetries: number;
    /** 重试延迟基数 ms (default: 1000)，实际延迟 = baseDelay * 2^retryCount */
    baseDelay: number;
    /** 最大延迟 ms (default: 60000) */
    maxDelay: number;
    /** 是否启用死信队列 (default: true) */
    enableDLX: boolean;
    /** 死信队列消息过期时间 ms (default: 259200000 = 3天)，过期后消息自动删除 */
    dlqMessageTTL: number;
}

export interface QueueConfig {
    /** Queue name */
    name: string;
    /** Whether queue should survive broker restart (default: true) */
    durable?: boolean;
    /** Whether queue is auto-deleted when last consumer disconnects (default: false) */
    autoDelete?: boolean;
    /** Whether queue is exclusive to connection (default: false) */
    exclusive?: boolean;
    /** Prefetch count for fair dispatch (default: 1) */
    prefetch?: number;
    /** 重试配置 */
    retry?: Partial<RetryConfig>;
    /** 
     * 广播模式配置
     * 启用后，消息会通过 fanout 交换机广播到所有消费者
     * 每个消费者会创建自己的独占队列来接收消息
     */
    broadcast?: {
        /** 是否启用广播模式 */
        enabled: boolean;
        /** 交换机名称 (默认: {queueName}.fanout) */
        exchangeName?: string;
    };
}

export interface MessageContext {
    /** 消息内容 (字符串) */
    content: string;
    /** 原始消息对象 */
    message: ConsumeMessage;
    /** 当前重试次数 */
    retryCount: number;
    /** 最大重试次数 */
    maxRetries: number;
    /** 是否是最后一次重试 */
    isLastRetry: boolean;
}

export type MessageHandler = (
    ctx: MessageContext,
    ack: () => void,
    nack: (requeue?: boolean) => void,
    reject: () => void  // 直接拒绝，不重试，发送到死信队列
) => void | Promise<void>;

// 兼容旧的 handler 签名
export type LegacyMessageHandler = (
    content: string,
    message: ConsumeMessage,
    ack: () => void,
    nack: (requeue?: boolean) => void
) => void | Promise<void>;

interface ConsumerRegistration {
    queue: QueueConfig;
    handler: MessageHandler | LegacyMessageHandler;
    isLegacy: boolean;
}

// 3 天的毫秒数
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 259200000

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 60000,
    enableDLX: true,
    dlqMessageTTL: THREE_DAYS_MS, // 死信队列消息 3 天后过期
};

// 消息头中存储重试次数的 key
const RETRY_COUNT_HEADER = 'x-retry-count';
const ORIGINAL_QUEUE_HEADER = 'x-original-queue';

/**
 * Server-side RabbitMQ Consumer
 */
class RabbitMQConsumer {
    private connection: Connection | null = null;
    private channel: Channel | null = null;
    private config: RabbitMQServerConfig;
    private consumers: Map<string, ConsumerRegistration> = new Map();
    private reconnectAttempts = 0;
    private isShuttingDown = false;
    private isConnecting = false;

    constructor(config?: RabbitMQServerConfig) {
        this.config = config || this.getDefaultConfig();
    }

    /**
     * 从环境变量获取默认配置
     */
    private getDefaultConfig(): RabbitMQServerConfig {
        return {
            host: process.env.RABBITMQ_AMQP_HOST || process.env.RABBITMQ_STOMP_HOST || 'localhost',
            port: parseInt(process.env.RABBITMQ_AMQP_PORT || '28007', 10),
            username: process.env.RABBITMQ_AMQP_USER || process.env.RABBITMQ_STOMP_USER || 'guest',
            password: process.env.RABBITMQ_AMQP_PASSWD || process.env.RABBITMQ_STOMP_PASSWD || 'guest',
            vhost: process.env.RABBITMQ_AMQP_VHOST || process.env.RABBITMQ_STOMP_VHOST || '/',
            heartbeat: 60,
            reconnectDelay: 5000,
            maxReconnectAttempts: -1, // infinite
        };
    }

    /**
     * 构建 AMQP URL
     */
    private buildUrl(): string {
        if (this.config.url) {
            return this.config.url;
        }

        const { host, port, username, password, vhost } = this.config;
        const encodedVhost = encodeURIComponent(vhost || '/');
        return `amqp://${username}:${password}@${host}:${port}/${encodedVhost}`;
    }

    /**
     * 连接到 RabbitMQ
     */
    async connect(): Promise<void> {
        if (this.isConnecting) {
            this.log('Connection already in progress');
            return;
        }

        if (this.connection && this.channel) {
            this.log('Already connected');
            return;
        }

        this.isConnecting = true;

        try {
            const url = this.buildUrl();
            this.log(`Connecting to RabbitMQ: ${url.replace(/:[^:@]+@/, ':****@')}`);

            this.connection = await amqp.connect(url, {
                heartbeat: this.config.heartbeat || 60,
            });

            this.connection.on('error', (err) => {
                this.log('Connection error:', err.message);
                this.handleDisconnect();
            });

            this.connection.on('close', () => {
                this.log('Connection closed');
                this.handleDisconnect();
            });

            this.channel = await this.connection.createChannel();

            this.channel.on('error', (err) => {
                this.log('Channel error:', err.message);
            });

            this.channel.on('close', () => {
                this.log('Channel closed');
            });

            this.reconnectAttempts = 0;
            this.log('Connected to RabbitMQ successfully');

            // 重新注册所有消费者
            await this.resubscribeAll();

        } catch (error) {
            this.log('Failed to connect:', error instanceof Error ? error.message : String(error));
            this.connection = null;
            this.channel = null;
            this.scheduleReconnect();
        } finally {
            this.isConnecting = false;
        }
    }

    /**
     * 处理断开连接
     */
    private handleDisconnect(): void {
        if (this.isShuttingDown) {
            return;
        }

        this.connection = null;
        this.channel = null;
        this.scheduleReconnect();
    }

    /**
     * 计划重连
     */
    private scheduleReconnect(): void {
        if (this.isShuttingDown || this.isConnecting) {
            return;
        }

        const maxAttempts = this.config.maxReconnectAttempts ?? -1;
        
        if (maxAttempts !== -1 && this.reconnectAttempts >= maxAttempts) {
            this.log(`Max reconnect attempts (${maxAttempts}) reached`);
            return;
        }

        this.reconnectAttempts++;
        const delay = this.config.reconnectDelay || 5000;
        
        this.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
            if (!this.isShuttingDown) {
                this.connect();
            }
        }, delay);
    }

    /**
     * 重新订阅所有消费者
     */
    private async resubscribeAll(): Promise<void> {
        for (const [, registration] of this.consumers) {
            await this.setupConsumer(registration.queue, registration.handler, registration.isLegacy);
        }
    }

    /**
     * 获取重试配置
     */
    private getRetryConfig(queue: QueueConfig): RetryConfig {
        return {
            ...DEFAULT_RETRY_CONFIG,
            ...queue.retry,
        };
    }

    /**
     * 获取死信队列名称
     */
    private getDLQName(queueName: string): string {
        return `${queueName}.dlq`;
    }

    /**
     * 获取重试队列名称
     */
    private getRetryQueueName(queueName: string): string {
        return `${queueName}.retry`;
    }

    /**
     * 设置死信队列和重试队列
     */
    private async setupDLXAndRetryQueue(queueName: string, retryConfig: RetryConfig): Promise<void> {
        if (!this.channel || !retryConfig.enableDLX) {
            return;
        }

        const dlqName = this.getDLQName(queueName);
        const retryQueueName = this.getRetryQueueName(queueName);
        const dlxExchange = `${queueName}.dlx`;
        const retryExchange = `${queueName}.retry.exchange`;

        // 声明死信交换机
        await this.channel.assertExchange(dlxExchange, 'direct', { durable: true });
        
        // 声明重试交换机
        await this.channel.assertExchange(retryExchange, 'direct', { durable: true });

        // 声明死信队列 (最终失败的消息，带消息 TTL)
        await this.channel.assertQueue(dlqName, {
            durable: true,
            autoDelete: false,
            arguments: {
                // 队列中消息的 TTL，过期后自动删除
                'x-message-ttl': retryConfig.dlqMessageTTL,
            },
        });
        await this.channel.bindQueue(dlqName, dlxExchange, 'dead');
        
        this.log(`DLQ message TTL set to ${retryConfig.dlqMessageTTL}ms (${retryConfig.dlqMessageTTL / 1000 / 60 / 60 / 24} days)`);

        // 声明重试队列 (带 TTL，到期后重新发送到原队列)
        await this.channel.assertQueue(retryQueueName, {
            durable: true,
            autoDelete: false,
            arguments: {
                'x-dead-letter-exchange': '', // 默认交换机
                'x-dead-letter-routing-key': queueName, // 到期后发送回原队列
            },
        });
        await this.channel.bindQueue(retryQueueName, retryExchange, 'retry');

        this.log(`DLX and retry queue setup for: ${queueName}`);
    }

    /**
     * 从消息头获取重试次数
     */
    private getRetryCount(msg: ConsumeMessage): number {
        const headers = msg.properties.headers || {};
        return parseInt(headers[RETRY_COUNT_HEADER] || '0', 10);
    }

    /**
     * 计算重试延迟 (指数退避)
     */
    private calculateRetryDelay(retryCount: number, retryConfig: RetryConfig): number {
        const delay = retryConfig.baseDelay * Math.pow(2, retryCount);
        return Math.min(delay, retryConfig.maxDelay);
    }

    /**
     * 发送消息到重试队列
     */
    private async sendToRetryQueue(
        queueName: string, 
        msg: ConsumeMessage, 
        retryCount: number,
        retryConfig: RetryConfig
    ): Promise<void> {
        if (!this.channel) return;

        const retryExchange = `${queueName}.retry.exchange`;
        const retryQueueName = this.getRetryQueueName(queueName);
        const delay = this.calculateRetryDelay(retryCount, retryConfig);

        // 更新重试队列的 TTL
        // 由于不能动态修改队列 TTL，我们使用消息级别的 TTL
        await this.channel.publish(
            retryExchange,
            'retry',
            msg.content,
            {
                persistent: true,
                headers: {
                    ...msg.properties.headers,
                    [RETRY_COUNT_HEADER]: retryCount + 1,
                    [ORIGINAL_QUEUE_HEADER]: queueName,
                },
                expiration: delay.toString(), // 消息级别 TTL
            }
        );

        this.log(`Message sent to retry queue (attempt ${retryCount + 1}, delay ${delay}ms): ${queueName}`);
    }

    /**
     * 发送消息到死信队列
     */
    private async sendToDLQ(queueName: string, msg: ConsumeMessage, reason: string): Promise<void> {
        if (!this.channel) return;

        const dlxExchange = `${queueName}.dlx`;

        await this.channel.publish(
            dlxExchange,
            'dead',
            msg.content,
            {
                persistent: true,
                headers: {
                    ...msg.properties.headers,
                    'x-death-reason': reason,
                    'x-death-time': new Date().toISOString(),
                    [ORIGINAL_QUEUE_HEADER]: queueName,
                },
            }
        );

        this.log(`Message sent to DLQ: ${queueName} (reason: ${reason})`);
    }

    /**
     * 获取广播交换机名称
     */
    private getBroadcastExchangeName(queueName: string, config?: QueueConfig['broadcast']): string {
        return config?.exchangeName || `${queueName}.fanout`;
    }

    /**
     * 设置广播模式的交换机和队列
     * 每个消费者实例会创建自己的独占队列
     */
    private async setupBroadcastQueue(queue: QueueConfig): Promise<string> {
        if (!this.channel) {
            throw new Error('Channel not available');
        }

        const exchangeName = this.getBroadcastExchangeName(queue.name, queue.broadcast);

        // 声明 fanout 交换机
        await this.channel.assertExchange(exchangeName, 'fanout', {
            durable: queue.durable ?? true,
            autoDelete: false,
        });

        // 创建独占队列（每个消费者实例一个）
        // 使用空字符串让 RabbitMQ 自动生成唯一队列名
        const result = await this.channel.assertQueue('', {
            exclusive: true,  // 独占队列，连接断开后自动删除
            autoDelete: true, // 消费者断开后自动删除
        });

        const uniqueQueueName = result.queue;

        // 将队列绑定到 fanout 交换机
        await this.channel.bindQueue(uniqueQueueName, exchangeName, '');

        this.log(`Broadcast queue setup: exchange=${exchangeName}, queue=${uniqueQueueName}`);

        return uniqueQueueName;
    }

    /**
     * 设置消费者
     */
    private async setupConsumer(
        queue: QueueConfig, 
        handler: MessageHandler | LegacyMessageHandler,
        isLegacy: boolean
    ): Promise<void> {
        if (!this.channel) {
            throw new Error('Channel not available');
        }

        const retryConfig = this.getRetryConfig(queue);

        // 设置 prefetch
        await this.channel.prefetch(queue.prefetch ?? 1);

        // 确定实际消费的队列名
        let actualQueueName = queue.name;

        // 广播模式：设置 fanout 交换机和独占队列
        if (queue.broadcast?.enabled) {
            actualQueueName = await this.setupBroadcastQueue(queue);
            this.log(`Broadcast mode enabled for ${queue.name}, consuming from ${actualQueueName}`);
        } else {
            // 非广播模式：设置 DLX 和重试队列
            if (retryConfig.enableDLX) {
                await this.setupDLXAndRetryQueue(queue.name, retryConfig);
            }

            // 声明主队列
            await this.channel.assertQueue(queue.name, {
                durable: queue.durable ?? true,
                autoDelete: queue.autoDelete ?? false,
                exclusive: queue.exclusive ?? false,
            });
        }

        // 开始消费
        await this.channel.consume(
            actualQueueName,
            async (msg) => {
                if (!msg) return;

                const content = msg.content.toString();
                const retryCount = this.getRetryCount(msg);
                const isLastRetry = retryCount >= retryConfig.maxRetries;

                this.log(
                    `Received message from ${queue.name} (retry: ${retryCount}/${retryConfig.maxRetries}):`, 
                    content.substring(0, 100)
                );

                // ACK: 确认消息已成功处理
                const ack = () => {
                    if (this.channel) {
                        this.channel.ack(msg);
                        this.log(`Message ACKed: ${queue.name}`);
                    }
                };

                // NACK: 处理失败，根据重试次数决定重试或发送到 DLQ
                const nack = async (requeue = false) => {
                    if (!this.channel) return;

                    // 如果明确要求 requeue 且未超过重试次数，直接 requeue
                    if (requeue && !isLastRetry) {
                        this.channel.nack(msg, false, true);
                        this.log(`Message NACKed and requeued: ${queue.name}`);
                        return;
                    }

                    // 确认消息（从原队列移除）
                    this.channel.ack(msg);

                    if (retryConfig.enableDLX) {
                        if (isLastRetry) {
                            // 超过最大重试次数，发送到死信队列
                            await this.sendToDLQ(queue.name, msg, `Max retries (${retryConfig.maxRetries}) exceeded`);
                        } else {
                            // 发送到重试队列（延迟重试）
                            await this.sendToRetryQueue(queue.name, msg, retryCount, retryConfig);
                        }
                    } else {
                        this.log(`Message discarded (DLX disabled): ${queue.name}`);
                    }
                };

                // REJECT: 直接拒绝消息，不重试，发送到死信队列
                const reject = async () => {
                    if (!this.channel) return;
                    
                    this.channel.ack(msg);
                    
                    if (retryConfig.enableDLX) {
                        await this.sendToDLQ(queue.name, msg, 'Rejected by handler');
                    }
                    
                    this.log(`Message rejected: ${queue.name}`);
                };

                try {
                    if (isLegacy) {
                        // 兼容旧的 handler 签名
                        await (handler as LegacyMessageHandler)(content, msg, ack, (requeue) => {
                            nack(requeue);
                        });
                    } else {
                        // 新的 handler 签名
                        const ctx: MessageContext = {
                            content,
                            message: msg,
                            retryCount,
                            maxRetries: retryConfig.maxRetries,
                            isLastRetry,
                        };
                        await (handler as MessageHandler)(ctx, ack, nack, reject);
                    }
                } catch (error) {
                    this.log(`Error processing message:`, error);
                    // 异常时自动 nack（不 requeue，进入重试/DLQ 流程）
                    await nack(false);
                }
            },
            { noAck: false }
        );

        this.log(`Consumer setup for queue: ${queue.name} (maxRetries: ${retryConfig.maxRetries})`);
    }

    /**
     * 注册队列消费者 (新 API)
     */
    async consume(queue: QueueConfig | string, handler: MessageHandler): Promise<void> {
        const queueConfig: QueueConfig = typeof queue === 'string' 
            ? { name: queue } 
            : queue;

        // 保存注册信息以便重连时恢复
        this.consumers.set(queueConfig.name, { queue: queueConfig, handler, isLegacy: false });

        // 如果已连接，立即设置消费者
        if (this.channel) {
            await this.setupConsumer(queueConfig, handler, false);
        }
    }

    /**
     * 注册队列消费者 (兼容旧 API)
     */
    async consumeLegacy(queue: QueueConfig | string, handler: LegacyMessageHandler): Promise<void> {
        const queueConfig: QueueConfig = typeof queue === 'string' 
            ? { name: queue } 
            : queue;

        // 保存注册信息以便重连时恢复
        this.consumers.set(queueConfig.name, { queue: queueConfig, handler, isLegacy: true });

        // 如果已连接，立即设置消费者
        if (this.channel) {
            await this.setupConsumer(queueConfig, handler, true);
        }
    }

    /**
     * 取消消费者
     */
    async cancelConsumer(queueName: string): Promise<void> {
        this.consumers.delete(queueName);
        // Note: 实际的 cancel 需要 consumerTag，这里简化处理
    }

    /**
     * 发送消息到队列
     * 
     * @param queue 队列名称
     * @param content 消息内容
     * @param persistent 是否持久化
     * @returns 是否发送成功
     */
    async sendToQueue(queue: string, content: string | object, persistent = true): Promise<boolean> {
        if (!this.channel) {
            this.log('Cannot send: channel not available');
            return false;
        }

        const message = typeof content === 'string' ? content : JSON.stringify(content);
        
        // 确保队列存在
        await this.channel.assertQueue(queue, { durable: true });
        
        return this.channel.sendToQueue(queue, Buffer.from(message), {
            persistent,
            contentType: 'application/json',
        });
    }

    /**
     * 广播消息到所有订阅者 (fanout 模式)
     * 
     * @param queueName 队列名称（用于构建交换机名称: {queueName}.fanout）
     * @param content 消息内容
     * @param persistent 是否持久化
     * @returns 是否发送成功
     */
    async broadcast(queueName: string, content: string | object, persistent = true): Promise<boolean> {
        if (!this.channel) {
            this.log('Cannot broadcast: channel not available');
            return false;
        }

        try {
            const exchangeName = `${queueName}.fanout`;
            const message = typeof content === 'string' ? content : JSON.stringify(content);

            // 确保 fanout 交换机存在
            await this.channel.assertExchange(exchangeName, 'fanout', {
                durable: true,
                autoDelete: false,
            });

            // fanout 交换机忽略 routingKey，使用空字符串
            const result = this.channel.publish(exchangeName, '', Buffer.from(message), {
                persistent,
                contentType: 'application/json',
            });

            this.log(`Message broadcast to: ${exchangeName}`);
            return result;
        } catch (error) {
            this.log('Failed to broadcast message:', error instanceof Error ? error.message : String(error));
            return false;
        }
    }

    /**
     * 关闭连接
     */
    async close(): Promise<void> {
        this.isShuttingDown = true;
        this.log('Shutting down RabbitMQ consumer...');

        try {
            if (this.channel) {
                await this.channel.close();
                this.channel = null;
            }
            if (this.connection) {
                await this.connection.close();
                this.connection = null;
            }
        } catch (error) {
            this.log('Error during shutdown:', error);
        }

        this.consumers.clear();
        this.log('RabbitMQ consumer shut down');
    }

    /**
     * 检查是否已连接
     */
    get isConnected(): boolean {
        return this.connection !== null && this.channel !== null;
    }

    /**
     * 日志输出
     */
    private log(message: string, ...args: unknown[]): void {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [RabbitMQ Server] ${message}`, ...args);
    }
}

// 单例实例
let consumerInstance: RabbitMQConsumer | null = null;
// 连接中的 Promise，用于确保多个调用者等待同一个连接过程
let connectingPromise: Promise<RabbitMQConsumer> | null = null;

/**
 * 获取或创建 RabbitMQ 消费者实例（同步版本，不等待连接）
 * @deprecated 推荐使用 getRabbitMQConsumerAsync 以确保连接完成
 */
export function getRabbitMQConsumer(config?: RabbitMQServerConfig): RabbitMQConsumer {
    if (!consumerInstance) {
        consumerInstance = new RabbitMQConsumer(config);
    }
    return consumerInstance;
}

/**
 * 获取或创建 RabbitMQ 消费者实例（异步版本，等待连接完成）
 * 
 * @param config 配置项
 * @returns 已连接的 RabbitMQConsumer 实例
 * @throws 如果连接失败会抛出错误
 */
export async function getRabbitMQConsumerAsync(config?: RabbitMQServerConfig): Promise<RabbitMQConsumer> {
    // 如果已经有实例且已连接，直接返回
    if (consumerInstance && consumerInstance.isConnected) {
        return consumerInstance;
    }

    // 如果正在连接中，等待连接完成
    if (connectingPromise) {
        return connectingPromise;
    }

    // 创建新的连接过程
    connectingPromise = (async () => {
        try {
            if (!consumerInstance) {
                consumerInstance = new RabbitMQConsumer(config);
            }

            // 等待连接完成
            await consumerInstance.connect();

            // 验证连接是否成功
            if (!consumerInstance.isConnected) {
                throw new Error('Failed to connect to RabbitMQ');
            }

            return consumerInstance;
        } finally {
            // 无论成功失败，都清除 connectingPromise
            connectingPromise = null;
        }
    })();

    return connectingPromise;
}

/**
 * 关闭 RabbitMQ 消费者
 */
export async function closeRabbitMQConsumer(): Promise<void> {
    if (consumerInstance) {
        await consumerInstance.close();
        consumerInstance = null;
    }
}

export default RabbitMQConsumer;
