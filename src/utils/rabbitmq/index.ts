/**
 * RabbitMQ STOMP Client Utility
 * 
 * Uses SockJS + STOMP.js to establish WebSocket connection to RabbitMQ
 */

import { Client, IMessage, IFrame, StompSubscription } from '@stomp/stompjs';
// SockJS 暂时不使用，因为 RabbitMQ Web STOMP 插件不支持
// import SockJS from 'sockjs-client';
import { RabbitMQConfig, SubscriptionConfig } from '@/src/config/rabbitmq';

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
    private subscriptionConfigs: Map<string, SubscriptionConfig> = new Map(); // 存储订阅配置，用于重连后自动重订阅
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
     * 检测是否应该使用 SockJS
     * 注意：RabbitMQ 的 rabbitmq_web_stomp 插件不支持 SockJS，只支持原生 WebSocket
     * 此方法保留用于未来可能的扩展
     */
    private shouldUseSockJS(): boolean {
        // RabbitMQ Web STOMP 插件不支持 SockJS，始终返回 false
        return false;
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

        // RabbitMQ Web STOMP 只支持原生 WebSocket，不支持 SockJS
        // 转换为 WebSocket URL (ws:// 或 wss://)
        const connectionUrl = this.config.wsUrl
            .replace(/^http:/, 'ws:')
            .replace(/^https:/, 'wss:');

        this.log(`Connecting using native WebSocket to:`, connectionUrl);
        this.log(`User Agent:`, typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A');

        this.client = new Client({
            // 使用原生 WebSocket 连接
            brokerURL: connectionUrl,
            
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
            // 使用配置的重连延迟，但我们会通过 onWebSocketClose 手动控制重连
            reconnectDelay: this.config.reconnectDelay || 5000,

            // Debug logging
            debug: this.config.debug ? (msg) => this.log(msg) : () => {},

            // Connection successful callback
            onConnect: (frame) => {
                // 首先标记已成功连接，确保后续的错误不会触发连接错误回调
                this.hasConnectedOnce = true;
                this.reconnectAttempts = 0;
                
                this.log('Connected to RabbitMQ', frame);
                
                // 延迟订阅，确保 STOMP 连接完全建立
                // 使用 setTimeout 确保 STOMP client 内部状态完全更新后再订阅
                setTimeout(() => {
                    if (this.client?.active) {
                        this.resubscribeAll();
                        // 再次延迟触发连接回调，确保订阅完成
                        setTimeout(() => {
                            if (this.client?.active) {
                                this.onConnect?.();
                            }
                        }, 100);
                    }
                }, 100);
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
                const errorMsg = event instanceof Error ? event.message : String(event);
                this.log('WebSocket Error', errorMsg, event);
                
                // 只在首次连接失败时触发错误回调
                if (!this.hasConnectedOnce && this.reconnectAttempts === 0) {
                    this.onError?.(`WebSocket connection error: ${errorMsg}`);
                } else {
                    // 运行时错误只记录日志
                    this.log('Runtime WebSocket error (will attempt reconnect)');
                }
            },

            // WebSocket close callback
            onWebSocketClose: (event) => {
                this.log('WebSocket Closed', {
                    code: event.code,
                    reason: event.reason,
                    wasClean: event.wasClean,
                });
                
                // 只有在非手动断开且连接曾经成功过的情况下才重连
                // 如果从未成功连接过，可能是配置错误，不应该无限重连
                if (!this.isManualDisconnect) {
                    if (this.hasConnectedOnce) {
                        // 曾经连接成功过，允许重连
                        this.handleReconnect();
                    } else {
                        // 从未成功连接过，可能是配置问题，停止重连
                        const maxAttempts = this.config.maxReconnectAttempts || 10;
                        if (this.reconnectAttempts >= maxAttempts) {
                            this.log('Max reconnect attempts reached, stopping reconnection');
                            this.onError?.('Failed to establish initial connection. Please check your configuration.');
                        } else {
                            this.handleReconnect();
                        }
                    }
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
        
        // 如果已经达到最大重连次数，停止重连
        if (maxAttempts !== -1 && this.reconnectAttempts >= maxAttempts) {
            this.log(`Max reconnect attempts (${maxAttempts}) reached, stopping reconnection`);
            this.onError?.(`Max reconnect attempts (${maxAttempts}) reached. Please check your network connection and RabbitMQ server status.`);
            return;
        }
        
        this.reconnectAttempts++;
        this.log(`Reconnect attempt ${this.reconnectAttempts}/${maxAttempts === -1 ? '∞' : maxAttempts}`);
        this.onReconnect?.(this.reconnectAttempts);
        
        // 延迟重连，避免立即重连导致的问题
        const reconnectDelay = this.config.reconnectDelay || 5000;
        setTimeout(() => {
            // 检查是否仍然需要重连（可能已经手动断开或已经连接）
            if (this.isManualDisconnect) {
                this.log('Manual disconnect detected, skipping reconnect');
                return;
            }
            
            if (!this.client) {
                this.log('Client is null, cannot reconnect');
                return;
            }
            
            if (this.client.active) {
                this.log('Client is already active, skipping reconnect');
                return;
            }
            
            this.log('Attempting to reconnect...');
            try {
                this.client.activate();
            } catch (error) {
                this.log('Error during reconnect activation:', error);
                // 如果激活失败，继续尝试重连
                if (maxAttempts === -1 || this.reconnectAttempts < maxAttempts) {
                    this.handleReconnect();
                }
            }
        }, reconnectDelay);
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
     * 即使未连接也可以调用，连接建立后会自动订阅
     */
    subscribe(config: SubscriptionConfig, handler: MessageHandler): string {
        const subscriptionId = config.id || `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Store the handler
        if (!this.messageHandlers.has(subscriptionId)) {
            this.messageHandlers.set(subscriptionId, []);
        }
        this.messageHandlers.get(subscriptionId)!.push(handler);

        // Store the subscription config for reconnection
        this.subscriptionConfigs.set(subscriptionId, config);

        // If connected, subscribe immediately
        if (this.client?.active) {
            this.doSubscribe(subscriptionId, config);
        } else {
            this.log(`Subscription ${subscriptionId} queued, will subscribe when connected`);
        }

        return subscriptionId;
    }

    /**
     * Internal subscribe method
     */
    private doSubscribe(subscriptionId: string, config: SubscriptionConfig): void {
        if (!this.client) {
            this.log(`Cannot subscribe ${subscriptionId}: client not initialized`);
            return;
        }

        // 检查连接状态，如果未连接则等待
        if (!this.client.active) {
            this.log(`Cannot subscribe ${subscriptionId}: client not active`);
            return;
        }

        // 检查底层 WebSocket 连接是否就绪
        // @stomp/stompjs 的 client 在 active 为 true 时，底层连接可能还在建立中
        try {
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
        } catch (error) {
            // 如果订阅失败（比如底层连接还没准备好），记录错误但不删除订阅配置
            // 这样在重连或连接完全建立后，resubscribeAll 会重试
            this.log(`Failed to subscribe ${subscriptionId}, will retry on reconnect:`, error);
            // 不抛出错误，让订阅配置保留，等待重连后重试
        }
    }

    /**
     * Resubscribe all handlers after reconnection
     */
    private resubscribeAll(): void {
        this.log('Resubscribing all subscriptions after reconnection');
        
        // Clear existing subscriptions (they are invalid after reconnection)
        this.subscriptions.clear();
        
        // Resubscribe all stored subscriptions
        this.subscriptionConfigs.forEach((config, subscriptionId) => {
            if (this.messageHandlers.has(subscriptionId)) {
                this.doSubscribe(subscriptionId, config);
            }
        });
        
        this.log(`Resubscribed ${this.subscriptionConfigs.size} subscription(s)`);
    }

    /**
     * Unsubscribe from a subscription
     */
    unsubscribe(subscriptionId: string): void {
        const subscription = this.subscriptions.get(subscriptionId);
        if (subscription) {
            subscription.unsubscribe();
            this.subscriptions.delete(subscriptionId);
        }
        // Also remove from handlers and configs to prevent resubscription
        this.messageHandlers.delete(subscriptionId);
        this.subscriptionConfigs.delete(subscriptionId);
        this.log(`Unsubscribed from ${subscriptionId}`);
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
        this.subscriptionConfigs.clear();
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
            // console.log(`[RabbitMQ] ${message}`, ...args);
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
