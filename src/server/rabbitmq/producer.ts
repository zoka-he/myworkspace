/**
 * Server-side RabbitMQ Producer Service
 * 
 * 用于向 RabbitMQ 发送消息的生产者类
 * 使用 amqplib (AMQP 0-9-1 协议)
 * 
 * 特性:
 * - 自动重连
 * - 消息持久化
 * - 支持确认模式 (confirm mode)
 * - 支持多种交换机类型
 */

import amqp, { Connection, ConfirmChannel, Options } from 'amqplib';

export interface RabbitMQProducerConfig {
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
    /** 使用确认模式 (default: true) */
    confirmMode?: boolean;
}

export interface PublishOptions {
    /** 消息是否持久化 (default: true) */
    persistent?: boolean;
    /** 消息优先级 (0-9) */
    priority?: number;
    /** 消息过期时间 (ms) */
    expiration?: string | number;
    /** 消息 ID */
    messageId?: string;
    /** 关联 ID */
    correlationId?: string;
    /** 回复队列 */
    replyTo?: string;
    /** Content Type (default: application/json) */
    contentType?: string;
    /** Content Encoding */
    contentEncoding?: string;
    /** 自定义 headers */
    headers?: Record<string, unknown>;
    /** 时间戳 */
    timestamp?: number;
    /** 应用 ID */
    appId?: string;
}

export interface ExchangeConfig {
    /** 交换机名称 */
    name: string;
    /** 交换机类型: direct, topic, fanout, headers */
    type: 'direct' | 'topic' | 'fanout' | 'headers';
    /** 是否持久化 (default: true) */
    durable?: boolean;
    /** 是否自动删除 (default: false) */
    autoDelete?: boolean;
}

/**
 * Server-side RabbitMQ Producer
 */
class RabbitMQProducer {
    private connection: Connection | null = null;
    private channel: ConfirmChannel | null = null;
    private config: RabbitMQProducerConfig;
    private reconnectAttempts = 0;
    private isShuttingDown = false;
    private isConnecting = false;
    private declaredQueues: Set<string> = new Set();
    private declaredExchanges: Set<string> = new Set();

    constructor(config?: RabbitMQProducerConfig) {
        this.config = config || this.getDefaultConfig();
    }

    /**
     * 从环境变量获取默认配置
     */
    private getDefaultConfig(): RabbitMQProducerConfig {
        return {
            host: process.env.RABBITMQ_AMQP_HOST || process.env.RABBITMQ_STOMP_HOST || 'localhost',
            port: parseInt(process.env.RABBITMQ_AMQP_PORT || '5672', 10),
            username: process.env.RABBITMQ_AMQP_USER || process.env.RABBITMQ_STOMP_USER || 'guest',
            password: process.env.RABBITMQ_AMQP_PASSWD || process.env.RABBITMQ_STOMP_PASSWD || 'guest',
            vhost: process.env.RABBITMQ_AMQP_VHOST || process.env.RABBITMQ_STOMP_VHOST || '/',
            heartbeat: 60,
            reconnectDelay: 5000,
            maxReconnectAttempts: -1,
            confirmMode: true,
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

            // 使用 ConfirmChannel 以支持发布确认
            if (this.config.confirmMode !== false) {
                this.channel = await this.connection.createConfirmChannel();
            } else {
                // 如果不使用确认模式，创建普通 channel
                this.channel = await this.connection.createConfirmChannel();
            }

            this.channel.on('error', (err) => {
                this.log('Channel error:', err.message);
            });

            this.channel.on('close', () => {
                this.log('Channel closed');
            });

            this.reconnectAttempts = 0;
            // 清空已声明的队列和交换机缓存
            this.declaredQueues.clear();
            this.declaredExchanges.clear();
            
            this.log('Connected to RabbitMQ successfully (Producer)');

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
        this.declaredQueues.clear();
        this.declaredExchanges.clear();
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
     * 确保队列存在
     */
    private async ensureQueue(queue: string, durable = true): Promise<void> {
        if (!this.channel) {
            throw new Error('Channel not available');
        }

        if (!this.declaredQueues.has(queue)) {
            await this.channel.assertQueue(queue, { durable });
            this.declaredQueues.add(queue);
        }
    }

    /**
     * 确保交换机存在
     */
    private async ensureExchange(exchange: ExchangeConfig): Promise<void> {
        if (!this.channel) {
            throw new Error('Channel not available');
        }

        if (!this.declaredExchanges.has(exchange.name)) {
            await this.channel.assertExchange(exchange.name, exchange.type, {
                durable: exchange.durable ?? true,
                autoDelete: exchange.autoDelete ?? false,
            });
            this.declaredExchanges.add(exchange.name);
        }
    }

    /**
     * 构建发布选项
     */
    private buildPublishOptions(options?: PublishOptions): Options.Publish {
        const opts: Options.Publish = {
            persistent: options?.persistent ?? true,
            contentType: options?.contentType ?? 'application/json',
        };

        if (options?.priority !== undefined) opts.priority = options.priority;
        if (options?.expiration !== undefined) opts.expiration = String(options.expiration);
        if (options?.messageId) opts.messageId = options.messageId;
        if (options?.correlationId) opts.correlationId = options.correlationId;
        if (options?.replyTo) opts.replyTo = options.replyTo;
        if (options?.contentEncoding) opts.contentEncoding = options.contentEncoding;
        if (options?.headers) opts.headers = options.headers;
        if (options?.timestamp) opts.timestamp = options.timestamp;
        if (options?.appId) opts.appId = options.appId;

        return opts;
    }

    /**
     * 将消息内容转换为 Buffer
     */
    private toBuffer(content: string | object | Buffer): Buffer {
        if (Buffer.isBuffer(content)) {
            return content;
        }
        if (typeof content === 'string') {
            return Buffer.from(content);
        }
        return Buffer.from(JSON.stringify(content));
    }

    /**
     * 发送消息到队列
     * 
     * @param queue 队列名称
     * @param content 消息内容 (字符串、对象或 Buffer)
     * @param options 发布选项
     * @returns 是否发送成功
     */
    async sendToQueue(
        queue: string, 
        content: string | object | Buffer, 
        options?: PublishOptions
    ): Promise<boolean> {
        if (!this.channel) {
            this.log('Cannot send: channel not available');
            return false;
        }

        try {
            await this.ensureQueue(queue);
            
            const buffer = this.toBuffer(content);
            const opts = this.buildPublishOptions(options);

            const result = this.channel.sendToQueue(queue, buffer, opts);
            
            if (this.config.confirmMode !== false) {
                // 等待发布确认
                await this.channel.waitForConfirms();
            }

            this.log(`Message sent to queue: ${queue}`);
            return result;
        } catch (error) {
            this.log('Failed to send message to queue:', error instanceof Error ? error.message : String(error));
            return false;
        }
    }

    /**
     * 发布消息到交换机
     * 
     * @param exchange 交换机名称或配置
     * @param routingKey 路由键
     * @param content 消息内容
     * @param options 发布选项
     * @returns 是否发送成功
     */
    async publish(
        exchange: string | ExchangeConfig,
        routingKey: string,
        content: string | object | Buffer,
        options?: PublishOptions
    ): Promise<boolean> {
        if (!this.channel) {
            this.log('Cannot publish: channel not available');
            return false;
        }

        try {
            // 如果传入的是交换机配置，确保交换机存在
            if (typeof exchange === 'object') {
                await this.ensureExchange(exchange);
            }

            const exchangeName = typeof exchange === 'string' ? exchange : exchange.name;
            const buffer = this.toBuffer(content);
            const opts = this.buildPublishOptions(options);

            const result = this.channel.publish(exchangeName, routingKey, buffer, opts);

            if (this.config.confirmMode !== false) {
                await this.channel.waitForConfirms();
            }

            this.log(`Message published to exchange: ${exchangeName} with routing key: ${routingKey}`);
            return result;
        } catch (error) {
            this.log('Failed to publish message:', error instanceof Error ? error.message : String(error));
            return false;
        }
    }

    /**
     * 批量发送消息到队列
     * 
     * @param queue 队列名称
     * @param messages 消息数组
     * @param options 发布选项 (应用于所有消息)
     * @returns 成功发送的消息数量
     */
    async sendBatchToQueue(
        queue: string,
        messages: Array<string | object | Buffer>,
        options?: PublishOptions
    ): Promise<number> {
        if (!this.channel) {
            this.log('Cannot send batch: channel not available');
            return 0;
        }

        try {
            await this.ensureQueue(queue);
            
            const opts = this.buildPublishOptions(options);
            let successCount = 0;

            for (const msg of messages) {
                const buffer = this.toBuffer(msg);
                const result = this.channel.sendToQueue(queue, buffer, opts);
                if (result) successCount++;
            }

            if (this.config.confirmMode !== false) {
                await this.channel.waitForConfirms();
            }

            this.log(`Batch sent to queue ${queue}: ${successCount}/${messages.length} messages`);
            return successCount;
        } catch (error) {
            this.log('Failed to send batch:', error instanceof Error ? error.message : String(error));
            return 0;
        }
    }

    /**
     * 批量发布消息到交换机
     * 
     * @param exchange 交换机名称或配置
     * @param messages 消息数组 [{routingKey, content}]
     * @param options 发布选项 (应用于所有消息)
     * @returns 成功发送的消息数量
     */
    async publishBatch(
        exchange: string | ExchangeConfig,
        messages: Array<{ routingKey: string; content: string | object | Buffer }>,
        options?: PublishOptions
    ): Promise<number> {
        if (!this.channel) {
            this.log('Cannot publish batch: channel not available');
            return 0;
        }

        try {
            if (typeof exchange === 'object') {
                await this.ensureExchange(exchange);
            }

            const exchangeName = typeof exchange === 'string' ? exchange : exchange.name;
            const opts = this.buildPublishOptions(options);
            let successCount = 0;

            for (const msg of messages) {
                const buffer = this.toBuffer(msg.content);
                const result = this.channel.publish(exchangeName, msg.routingKey, buffer, opts);
                if (result) successCount++;
            }

            if (this.config.confirmMode !== false) {
                await this.channel.waitForConfirms();
            }

            this.log(`Batch published to exchange ${exchangeName}: ${successCount}/${messages.length} messages`);
            return successCount;
        } catch (error) {
            this.log('Failed to publish batch:', error instanceof Error ? error.message : String(error));
            return 0;
        }
    }

    /**
     * 广播消息到所有订阅者 (fanout 模式)
     * 
     * @param queueName 队列名称（用于构建交换机名称）
     * @param content 消息内容
     * @param options 发布选项
     * @returns 是否发送成功
     */
    async broadcast(
        queueName: string,
        content: string | object | Buffer,
        options?: PublishOptions
    ): Promise<boolean> {
        if (!this.channel) {
            this.log('Cannot broadcast: channel not available');
            return false;
        }

        try {
            const exchangeName = `${queueName}.fanout`;

            // 确保 fanout 交换机存在
            await this.ensureExchange({
                name: exchangeName,
                type: 'fanout',
                durable: true,
            });

            const buffer = this.toBuffer(content);
            const opts = this.buildPublishOptions(options);

            // fanout 交换机忽略 routingKey，使用空字符串
            const result = this.channel.publish(exchangeName, '', buffer, opts);

            if (this.config.confirmMode !== false) {
                await this.channel.waitForConfirms();
            }

            this.log(`Message broadcast to: ${exchangeName}`);
            return result;
        } catch (error) {
            this.log('Failed to broadcast message:', error instanceof Error ? error.message : String(error));
            return false;
        }
    }

    /**
     * 绑定队列到交换机
     * 
     * @param queue 队列名称
     * @param exchange 交换机名称
     * @param routingKey 路由键
     */
    async bindQueue(queue: string, exchange: string, routingKey: string): Promise<void> {
        if (!this.channel) {
            throw new Error('Channel not available');
        }

        await this.ensureQueue(queue);
        await this.channel.bindQueue(queue, exchange, routingKey);
        this.log(`Queue ${queue} bound to exchange ${exchange} with routing key: ${routingKey}`);
    }

    /**
     * 获取队列信息
     * 
     * @param queue 队列名称
     * @returns 队列信息 (messageCount, consumerCount)
     */
    async getQueueInfo(queue: string): Promise<{ messageCount: number; consumerCount: number } | null> {
        if (!this.channel) {
            return null;
        }

        try {
            const result = await this.channel.checkQueue(queue);
            return {
                messageCount: result.messageCount,
                consumerCount: result.consumerCount,
            };
        } catch {
            return null;
        }
    }

    /**
     * 清空队列
     * 
     * @param queue 队列名称
     * @returns 清空的消息数量
     */
    async purgeQueue(queue: string): Promise<number> {
        if (!this.channel) {
            return 0;
        }

        try {
            const result = await this.channel.purgeQueue(queue);
            this.log(`Queue ${queue} purged: ${result.messageCount} messages removed`);
            return result.messageCount;
        } catch (error) {
            this.log('Failed to purge queue:', error instanceof Error ? error.message : String(error));
            return 0;
        }
    }

    /**
     * 删除队列
     * 
     * @param queue 队列名称
     * @param options 删除选项
     */
    async deleteQueue(
        queue: string, 
        options?: { ifUnused?: boolean; ifEmpty?: boolean }
    ): Promise<number> {
        if (!this.channel) {
            return 0;
        }

        try {
            const result = await this.channel.deleteQueue(queue, options);
            this.declaredQueues.delete(queue);
            this.log(`Queue ${queue} deleted: ${result.messageCount} messages removed`);
            return result.messageCount;
        } catch (error) {
            this.log('Failed to delete queue:', error instanceof Error ? error.message : String(error));
            return 0;
        }
    }

    /**
     * 删除交换机
     * 
     * @param exchange 交换机名称
     * @param ifUnused 仅在未使用时删除
     */
    async deleteExchange(exchange: string, ifUnused = false): Promise<void> {
        if (!this.channel) {
            return;
        }

        try {
            await this.channel.deleteExchange(exchange, { ifUnused });
            this.declaredExchanges.delete(exchange);
            this.log(`Exchange ${exchange} deleted`);
        } catch (error) {
            this.log('Failed to delete exchange:', error instanceof Error ? error.message : String(error));
        }
    }

    /**
     * 关闭连接
     */
    async close(): Promise<void> {
        this.isShuttingDown = true;
        this.log('Shutting down RabbitMQ producer...');

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

        this.declaredQueues.clear();
        this.declaredExchanges.clear();
        this.log('RabbitMQ producer shut down');
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
        console.log(`[${timestamp}] [RabbitMQ Producer] ${message}`, ...args);
    }
}

// 单例实例
let producerInstance: RabbitMQProducer | null = null;
// 连接中的 Promise
let connectingPromise: Promise<RabbitMQProducer> | null = null;

/**
 * 获取或创建 RabbitMQ 生产者实例（同步版本，不等待连接）
 * @deprecated 推荐使用 getRabbitMQProducerAsync 以确保连接完成
 */
export function getRabbitMQProducer(config?: RabbitMQProducerConfig): RabbitMQProducer {
    if (!producerInstance) {
        producerInstance = new RabbitMQProducer(config);
    }
    return producerInstance;
}

/**
 * 获取或创建 RabbitMQ 生产者实例（异步版本，等待连接完成）
 * 
 * @param config 配置项
 * @returns 已连接的 RabbitMQProducer 实例
 * @throws 如果连接失败会抛出错误
 */
export async function getRabbitMQProducerAsync(config?: RabbitMQProducerConfig): Promise<RabbitMQProducer> {
    // 如果已经有实例且已连接，直接返回
    if (producerInstance && producerInstance.isConnected) {
        return producerInstance;
    }

    // 如果正在连接中，等待连接完成
    if (connectingPromise) {
        return connectingPromise;
    }

    // 创建新的连接过程
    connectingPromise = (async () => {
        try {
            if (!producerInstance) {
                producerInstance = new RabbitMQProducer(config);
            }

            // 等待连接完成
            await producerInstance.connect();

            // 验证连接是否成功
            if (!producerInstance.isConnected) {
                throw new Error('Failed to connect to RabbitMQ');
            }

            return producerInstance;
        } finally {
            // 无论成功失败，都清除 connectingPromise
            connectingPromise = null;
        }
    })();

    return connectingPromise;
}

/**
 * 关闭 RabbitMQ 生产者
 */
export async function closeRabbitMQProducer(): Promise<void> {
    if (producerInstance) {
        await producerInstance.close();
        producerInstance = null;
    }
}

export default RabbitMQProducer;
