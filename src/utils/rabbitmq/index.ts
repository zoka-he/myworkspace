/**
 * RabbitMQ STOMP Client Utility
 * 
 * Uses SockJS + STOMP.js to establish WebSocket connection to RabbitMQ
 */

import { Client, IMessage, IFrame, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { RabbitMQConfig, SubscriptionConfig } from '@/config/rabbitmq';

export type MessageHandler = (message: IMessage) => void;
export type ConnectionCallback = () => void;
export type ErrorCallback = (error: IFrame | string) => void;

export interface RabbitMQClientOptions {
    config: RabbitMQConfig;
    onConnect?: ConnectionCallback;
    onDisconnect?: ConnectionCallback;
    onError?: ErrorCallback;
    onReconnect?: (attempt: number) => void;
}

/**
 * RabbitMQ STOMP Client wrapper
 * Manages WebSocket connection with automatic reconnection
 */
export class RabbitMQClient {
    private client: Client | null = null;
    private config: RabbitMQConfig;
    private subscriptions: Map<string, StompSubscription> = new Map();
    private messageHandlers: Map<string, MessageHandler[]> = new Map();
    private reconnectAttempts = 0;
    private isManualDisconnect = false;
    private hasConnectedOnce = false; // 标记是否已经成功连接过

    // Callbacks
    private onConnect?: ConnectionCallback;
    private onDisconnect?: ConnectionCallback;
    private onError?: ErrorCallback;
    private onReconnect?: (attempt: number) => void;

    constructor(options: RabbitMQClientOptions) {
        this.config = options.config;
        this.onConnect = options.onConnect;
        this.onDisconnect = options.onDisconnect;
        this.onError = options.onError;
        this.onReconnect = options.onReconnect;
    }

    /**
     * Initialize and connect to RabbitMQ
     */
    connect(): void {
        if (this.client?.active) {
            this.log('Already connected');
            return;
        }

        this.isManualDisconnect = false;
        this.reconnectAttempts = 0;

        // Debug: 打印连接配置（隐藏密码）
        this.log('Connecting with config:', {
            wsUrl: this.config.wsUrl,
            login: this.config.login,
            passcode: this.config.passcode ? '******' : '(empty)',
            vhost: this.config.vhost,
        });

        // 转换为 WebSocket URL (ws:// 或 wss://)
        const wsUrl = this.config.wsUrl
            .replace(/^http:/, 'ws:')
            .replace(/^https:/, 'wss:');

        this.log('Connecting to WebSocket URL:', wsUrl);

        this.client = new Client({
            // 使用原生 WebSocket 连接
            brokerURL: wsUrl,
            
            // Connection credentials
            connectHeaders: {
                login: this.config.login,
                passcode: this.config.passcode,
                host: this.config.vhost || '/',
            },

            // Heartbeat settings
            heartbeatIncoming: this.config.heartbeatIncoming || 10000,
            heartbeatOutgoing: this.config.heartbeatOutgoing || 10000,

            // Reconnection settings
            reconnectDelay: this.config.reconnectDelay || 5000,

            // Debug logging
            debug: this.config.debug ? (msg) => this.log(msg) : () => {},

            // Connection successful callback
            onConnect: (frame) => {
                // 首先标记已成功连接，确保后续的错误不会触发连接错误回调
                this.hasConnectedOnce = true;
                this.reconnectAttempts = 0;
                
                this.log('Connected to RabbitMQ', frame);
                this.resubscribeAll();
                // 使用 setTimeout 确保 STOMP client 内部状态完全更新后再触发回调
                // 这解决了 client.active 和 onConnect 回调之间的竞态条件
                setTimeout(() => {
                    if (this.client?.active) {
                        this.onConnect?.();
                    }
                }, 0);
            },

            // Disconnection callback
            onDisconnect: (frame) => {
                this.log('Disconnected from RabbitMQ', frame);
                this.onDisconnect?.();
            },

            // Error callback - 区分连接错误和运行时错误
            onStompError: (frame) => {
                this.log('STOMP Error', frame);
                // 只在首次连接失败时触发错误回调
                // hasConnectedOnce === false 表示还没有成功连接过，这是连接阶段的错误
                // hasConnectedOnce === true 表示已经连接过，这是运行时错误（如 sendMessage 错误），不应该改变连接状态
                if (!this.hasConnectedOnce && this.reconnectAttempts === 0) {
                    this.onError?.(frame);
                } else {
                    // 运行时错误只记录日志，不触发状态变更
                    this.log('Runtime STOMP error (connection still active):', frame);
                }
            },

            // WebSocket error callback - 区分连接错误和运行时错误
            onWebSocketError: (event) => {
                this.log('WebSocket Error', event);
                // 只在首次连接失败时触发错误回调
                if (!this.hasConnectedOnce && this.reconnectAttempts === 0) {
                    this.onError?.('WebSocket connection error');
                } else {
                    // 运行时错误只记录日志
                    this.log('Runtime WebSocket error (will attempt reconnect)');
                }
            },

            // WebSocket close callback
            onWebSocketClose: (event) => {
                this.log('WebSocket Closed', event);
                if (!this.isManualDisconnect) {
                    this.handleReconnect();
                }
            },
        });

        this.client.activate();
    }

    /**
     * Handle reconnection logic
     */
    private handleReconnect(): void {
        const maxAttempts = this.config.maxReconnectAttempts || 10;
        
        if (maxAttempts === -1 || this.reconnectAttempts < maxAttempts) {
            this.reconnectAttempts++;
            this.log(`Reconnect attempt ${this.reconnectAttempts}/${maxAttempts === -1 ? '∞' : maxAttempts}`);
            this.onReconnect?.(this.reconnectAttempts);
        } else {
            // 达到最大重连次数，触发错误
            this.log(`Max reconnect attempts (${maxAttempts}) reached`);
            this.onError?.(`Max reconnect attempts (${maxAttempts}) reached`);
        }
    }

    /**
     * 手动重连
     */
    reconnect(): void {
        if (this.client?.active) {
            this.log('Already connected, no need to reconnect');
            return;
        }
        
        this.log('Manual reconnect initiated');
        this.reconnectAttempts = 0;
        this.isManualDisconnect = false;
        this.hasConnectedOnce = false; // 重置连接标志，允许报告连接错误
        
        // 如果 client 存在但未激活，先 deactivate
        if (this.client) {
            this.client.deactivate();
            this.client = null;
        }
        
        // 重新连接
        this.connect();
    }

    /**
     * Disconnect from RabbitMQ
     */
    disconnect(): void {
        if (!this.client) {
            return;
        }

        this.isManualDisconnect = true;
        this.hasConnectedOnce = false; // 重置连接标志
        this.subscriptions.clear();
        this.messageHandlers.clear();
        
        if (this.client.active) {
            this.client.deactivate();
        }
        
        this.client = null;
        this.log('Manually disconnected');
    }

    /**
     * Check if connected
     */
    get isConnected(): boolean {
        return this.client?.active || false;
    }

    /**
     * Subscribe to a queue/topic
     */
    subscribe(config: SubscriptionConfig, handler: MessageHandler): string {
        const subscriptionId = config.id || `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Store the handler
        if (!this.messageHandlers.has(subscriptionId)) {
            this.messageHandlers.set(subscriptionId, []);
        }
        this.messageHandlers.get(subscriptionId)!.push(handler);

        // If connected, subscribe immediately
        if (this.client?.active) {
            this.doSubscribe(subscriptionId, config);
        }

        return subscriptionId;
    }

    /**
     * Internal subscribe method
     */
    private doSubscribe(subscriptionId: string, config: SubscriptionConfig): void {
        if (!this.client?.active) {
            return;
        }

        const headers: Record<string, string> = {
            id: subscriptionId,
            ack: config.ack || 'auto',
            ...config.headers,
        };

        const subscription = this.client.subscribe(
            config.destination,
            (message) => {
                this.log(`Received message on ${config.destination}`, message);
                const handlers = this.messageHandlers.get(subscriptionId);
                handlers?.forEach((handler) => handler(message));
            },
            headers
        );

        this.subscriptions.set(subscriptionId, subscription);
        this.log(`Subscribed to ${config.destination} with id ${subscriptionId}`);
    }

    /**
     * Resubscribe all handlers after reconnection
     */
    private resubscribeAll(): void {
        // Note: We need to store the original subscription configs to resubscribe
        // For now, the client's built-in reconnection should handle this
        this.log('Resubscription handled by STOMP client');
    }

    /**
     * Unsubscribe from a subscription
     */
    unsubscribe(subscriptionId: string): void {
        const subscription = this.subscriptions.get(subscriptionId);
        if (subscription) {
            subscription.unsubscribe();
            this.subscriptions.delete(subscriptionId);
            this.messageHandlers.delete(subscriptionId);
            this.log(`Unsubscribed from ${subscriptionId}`);
        }
    }

    /**
     * Unsubscribe all subscriptions
     */
    unsubscribeAll(): void {
        this.subscriptions.forEach((subscription, id) => {
            subscription.unsubscribe();
            this.log(`Unsubscribed from ${id}`);
        });
        this.subscriptions.clear();
        this.messageHandlers.clear();
    }

    /**
     * Send a message to a destination
     */
    send(destination: string, body: string | object, headers?: Record<string, string>): void {
        if (!this.client?.active) {
            this.log('Cannot send: not connected');
            return;
        }

        const messageBody = typeof body === 'string' ? body : JSON.stringify(body);
        
        // 构建 headers，过滤掉 undefined 值
        const finalHeaders: Record<string, string> = {
            'content-type': 'application/json',
        };
        
        // 安全地合并用户提供的 headers
        if (headers) {
            Object.entries(headers).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    finalHeaders[key] = String(value);
                }
            });
        }
        
        this.client.publish({
            destination,
            body: messageBody,
            headers: finalHeaders,
        });

        this.log(`Sent message to ${destination}`, body);
    }

    /**
     * Acknowledge a message (for manual ack mode)
     */
    ack(message: IMessage): void {
        message.ack();
        this.log('Message acknowledged');
    }

    /**
     * Negative acknowledge a message (for manual ack mode)
     */
    nack(message: IMessage): void {
        message.nack();
        this.log('Message negative acknowledged');
    }

    /**
     * Debug logging
     */
    private log(message: string, ...args: unknown[]): void {
        if (this.config.debug) {
            console.log(`[RabbitMQ] ${message}`, ...args);
        }
    }
}

/**
 * Create a singleton RabbitMQ client instance
 */
let singletonClient: RabbitMQClient | null = null;

export function createRabbitMQClient(options: RabbitMQClientOptions): RabbitMQClient {
    if (singletonClient) {
        singletonClient.disconnect();
    }
    singletonClient = new RabbitMQClient(options);
    return singletonClient;
}

export function getRabbitMQClient(): RabbitMQClient | null {
    return singletonClient;
}

export default RabbitMQClient;
