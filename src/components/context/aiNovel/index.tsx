"use client";

import { MQStateContext, MQDispatchContext, defaultMQState, ConnectionStatus } from "./mqStateContext";
import { MQConfigContext, RabbitMQConfig, defaultRabbitMQConfig, SubscriptionConfig } from "./mqConfigContext";
import MQHolder, { useMQClient, MQHolderProps } from "./mqHolder";
import RabbitMQProvider, { RabbitMQProviderProps } from "./RabbitMQProvider";

export interface AiNovelContextProviderProps {
    /** Children components */
    children: React.ReactNode;
}

/**
 * AiNovelContextProvider
 * 
 * AI Novel 业务相关的 Context Provider。
 * RabbitMQ 配置已分离到 RabbitMQProvider。
 * 
 * @example
 * ```tsx
 * // 方式1: 单独使用 AiNovelContextProvider (不需要 MQ)
 * <AiNovelContextProvider>
 *   <App />
 * </AiNovelContextProvider>
 * 
 * // 方式2: 组合使用 (需要 MQ)
 * <RabbitMQProvider config={{ wsUrl: '...' }}>
 *   <AiNovelContextProvider>
 *     <App />
 *   </AiNovelContextProvider>
 * </RabbitMQProvider>
 * ```
 */
export default function AiNovelContextProvider({ 
    children,
}: AiNovelContextProviderProps) {
    // 这里可以添加 AI Novel 特有的 context 逻辑
    // 目前只是简单透传 children
    return <>{children}</>;
}

// Re-export types and utilities
export { 
    MQStateContext, 
    MQDispatchContext, 
    MQConfigContext,
    defaultMQState,
    defaultRabbitMQConfig,
    ConnectionStatus,
    useMQClient,
    MQHolder,
    RabbitMQProvider,
};

export { useMQ } from "./useMQ";

export type { RabbitMQConfig, MQHolderProps, SubscriptionConfig, RabbitMQProviderProps };
