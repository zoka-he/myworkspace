/**
 * Server-side RabbitMQ Module
 * 
 * 导出服务器端 RabbitMQ 相关功能
 */

// Consumer exports
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
    getRabbitMQConsumerAsync,
    closeRabbitMQConsumer,
    default as RabbitMQConsumer,
} from './consumer';

// Producer exports
export type {
    RabbitMQProducerConfig,
    PublishOptions,
    ExchangeConfig,
} from './producer';

export {
    getRabbitMQProducer,
    getRabbitMQProducerAsync,
    closeRabbitMQProducer,
    default as RabbitMQProducer,
} from './producer';

// Handlers exports
export type {
    QueueRegistration,
} from './handlers';

export {
    queueRegistrations,
    initializeHandlers,
    addConsumer,
} from './handlers';
