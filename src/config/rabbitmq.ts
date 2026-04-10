/**
 * RabbitMQ STOMP over WebSocket configuration
 * 
 * RabbitMQ needs to enable the STOMP plugin:
 * rabbitmq-plugins enable rabbitmq_web_stomp
 */

/** Subscription destination types */
export interface SubscriptionConfig {
    /** Queue or exchange destination (e.g., /queue/notifications, /topic/events) */
    destination: string;
    /** Subscription ID for tracking */
    id?: string;
    /** Acknowledgment mode: auto, client, client-individual */
    ack?: 'auto' | 'client' | 'client-individual';
    /** Additional headers */
    headers?: Record<string, string>;
}

export interface RabbitMQConfig {
    /** WebSocket endpoint URL (e.g., http://localhost:15674/ws) */
    wsUrl: string;
    /** RabbitMQ Management API URL (e.g., http://localhost:15672) */
    managementUrl?: string;
    /** RabbitMQ login username */
    login: string;
    /** RabbitMQ login password */
    passcode: string;
    /** Virtual host (default: /) */
    vhost?: string;
    /** Heartbeat interval in milliseconds (default: 10000) */
    heartbeatIncoming?: number;
    heartbeatOutgoing?: number;
    /** Reconnect delay in milliseconds (default: 5000) */
    reconnectDelay?: number;
    /** Maximum reconnect attempts (default: 10, -1 for infinite) */
    maxReconnectAttempts?: number;
    /** Debug mode */
    debug?: boolean;
    /** Auto connect on mount (default: true) */
    autoConnect?: boolean;
    /** Default subscriptions to set up on connect */
    subscriptions?: SubscriptionConfig[];
}

/** 队列信息 */
export interface QueueInfo {
    /** 队列名称 */
    name: string;
    /** 虚拟主机 */
    vhost: string;
    /** 待处理消息数 */
    messages: number;
    /** 就绪消息数 */
    messages_ready: number;
    /** 未确认消息数 */
    messages_unacknowledged: number;
    /** 消费者数量 */
    consumers: number;
    /** 队列状态 */
    state: string;
    /** 是否持久化 */
    durable: boolean;
    /** 是否自动删除 */
    auto_delete: boolean;
}

/**
 * 默认配置
 * 环境变量通过 next.config.js 的 env 配置暴露给客户端
 */
function getDefaultWsUrl(): string {
    if (process.env.RABBITMQ_STOMP_FRONTEND_URL) {
        return process.env.RABBITMQ_STOMP_FRONTEND_URL;
    }
    // 仅在浏览器环境读取 window；服务端构建阶段返回安全兜底值
    if (typeof window !== 'undefined') {
        return `ws://${window.location.hostname}:28010/ws`;
    }
    return '/ws';
}

export const defaultRabbitMQConfig: RabbitMQConfig = {
    // 前端 URL 优先；未配置时浏览器端使用当前 hostname，服务端构建走兜底
    wsUrl: getDefaultWsUrl(),
    // 注释默认管理地址兜底，便于暴露配置缺失问题
    managementUrl: process.env.RABBITMQ_MANAGEMENT_URL,
    // 注释 guest 默认账号，缺失时在连接阶段显式报错
    login: process.env.RABBITMQ_STOMP_USER || '',
    passcode: process.env.RABBITMQ_STOMP_PASSWD || '',
    vhost: process.env.RABBITMQ_STOMP_VHOST || '/',
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    reconnectDelay: 5000,
    maxReconnectAttempts: 10,
    debug: process.env.NODE_ENV === 'development',
    autoConnect: true,
    subscriptions: [],
};

export default defaultRabbitMQConfig;
