/**
 * Server-side RabbitMQ Module
 * 
 * 导出服务器端 RabbitMQ 相关功能
 */

export type {
    RabbitMQServerConfig,
    QueueConfig,
    RetryConfig,
    MessageHandler,
    MessageContext,
    LegacyMessageHandler,
} from './consumer';

export {
    getRabbitMQConsumer,
    closeRabbitMQConsumer,
    default as RabbitMQConsumer,
} from './consumer';

export type {
    QueueRegistration,
} from './handlers';

export {
    queueRegistrations,
    initializeHandlers,
    addConsumer,
} from './handlers';
