"use client";

import { useContext, useCallback, useRef, useEffect } from "react";
import { IMessage } from "@stomp/stompjs";
import { MQStateContext, MQDispatchContext } from "./mqStateContext";
import { MQConfigContext } from "./mqConfigContext";
import { getRabbitMQClient, RabbitMQClient, MessageHandler } from "@/src/utils/rabbitmq";
import { SubscriptionConfig, QueueInfo } from "@/src/config/rabbitmq";

/**
 * Hook to interact with RabbitMQ STOMP connection
 * 
 * @example
 * ```tsx
 * function NotificationComponent() {
 *   const { 
 *     isConnected, 
 *     lastMessage, 
 *     subscribe, 
 *     sendMessage 
 *   } = useMQ();
 * 
 *   useEffect(() => {
 *     if (isConnected) {
 *       const subId = subscribe(
 *         { destination: '/queue/my-notifications' },
 *         (msg) => console.log('Got notification:', msg.body)
 *       );
 *       return () => unsubscribe(subId);
 *     }
 *   }, [isConnected]);
 * 
 *   return <div>Connected: {isConnected ? 'Yes' : 'No'}</div>;
 * }
 * ```
 */
export function useMQ() {
    const state = useContext(MQStateContext);
    const dispatch = useContext(MQDispatchContext);
    const config = useContext(MQConfigContext);
    const subscriptionsRef = useRef<Map<string, () => void>>(new Map());

    /**
     * Subscribe to a queue/topic with a message handler
     */
    const subscribe = useCallback((
        subscriptionConfig: SubscriptionConfig,
        handler: MessageHandler
    ): string | null => {
        const client = getRabbitMQClient();
        if (!client) {
            console.warn('[useMQ] Cannot subscribe: client not initialized');
            return null;
        }
        
        if (!client.isConnected) {
            console.warn('[useMQ] Cannot subscribe: client not connected (client.active is false)');
            return null;
        }

        const wrappedHandler: MessageHandler = (message) => {
            dispatch({ type: 'MESSAGE_RECEIVED', payload: message });
            handler(message);
        };

        try {
            const subscriptionId = client.subscribe(subscriptionConfig, wrappedHandler);
            dispatch({ type: 'ADD_SUBSCRIPTION', payload: subscriptionId });

            // Store cleanup function
            subscriptionsRef.current.set(subscriptionId, () => {
                client.unsubscribe(subscriptionId);
                dispatch({ type: 'REMOVE_SUBSCRIPTION', payload: subscriptionId });
            });

            return subscriptionId;
        } catch (error) {
            console.error('[useMQ] Subscribe error:', error);
            return null;
        }
    }, [dispatch]);

    /**
     * Unsubscribe from a subscription
     */
    const unsubscribe = useCallback((subscriptionId: string) => {
        const cleanup = subscriptionsRef.current.get(subscriptionId);
        if (cleanup) {
            cleanup();
            subscriptionsRef.current.delete(subscriptionId);
        }
    }, []);

    /**
     * Unsubscribe from all subscriptions created by this hook instance
     */
    const unsubscribeAll = useCallback(() => {
        subscriptionsRef.current.forEach((cleanup) => cleanup());
        subscriptionsRef.current.clear();
    }, []);

    /**
     * Send a message to a destination
     */
    const sendMessage = useCallback((
        destination: string, 
        body: string | object,
        headers?: Record<string, string>
    ) => {
        const client = getRabbitMQClient();
        if (!client?.isConnected) {
            console.warn('[useMQ] Cannot send: not connected');
            return false;
        }

        client.send(destination, body, headers);
        return true;
    }, []);

    /**
     * 发送带有过期时间的时效性消息
     * @param destination 发送目的地队列
     * @param body 消息内容
     * @param expiration 过期时间（毫秒字符串，如 "60000" 表示60秒后过期），RabbitMQ 要求为字符串类型
     * @param headers 其他header，可选
     * @returns 是否发送成功
     */
    const sendMessageWithExpiration = useCallback((
        destination: string,
        body: string | object,
        expiration: string,
        headers?: Record<string, string>
    ) => {
        const client = getRabbitMQClient();
        if (!client?.isConnected) {
            console.warn('[useMQ] Cannot send: not connected');
            return false;
        }
        // 发送时带上expiration属性
        client.send(destination, body, {
            ...headers,
            expiration
        });
        return true;
    }, []);

    /**
     * Acknowledge a message (for manual ack mode)
     */
    const ackMessage = useCallback((message: IMessage) => {
        message.ack();
    }, []);

    /**
     * Negative acknowledge a message (for manual ack mode)
     */
    const nackMessage = useCallback((message: IMessage) => {
        message.nack();
    }, []);

    /**
     * 手动重连
     */
    const reconnect = useCallback(() => {
        const client = getRabbitMQClient();
        if (client) {
            dispatch({ type: 'CONNECT_START' });
            client.reconnect();
        }
    }, [dispatch]);

    /**
     * 获取指定队列的消息存量信息
     * @param queueName 队列名称
     * @returns 队列信息，包含消息数量等
     */
    const getQueueInfo = useCallback(async (queueName: string): Promise<QueueInfo | null> => {
        try {
            const response = await fetch(`/api/web/rabbitmq/queue?name=${encodeURIComponent(queueName)}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                return result.data as QueueInfo;
            }
            
            console.warn('[useMQ] Failed to get queue info:', result.error);
            return null;
        } catch (error) {
            console.error('[useMQ] Error fetching queue info:', error);
            return null;
        }
    }, []);

    /**
     * 获取所有队列列表
     * @returns 队列信息列表
     */
    const getAllQueues = useCallback(async (): Promise<QueueInfo[]> => {
        try {
            const response = await fetch('/api/web/rabbitmq/queue');
            const result = await response.json();
            
            if (result.success && Array.isArray(result.data)) {
                return result.data as QueueInfo[];
            }
            
            console.warn('[useMQ] Failed to get queues:', result.error);
            return [];
        } catch (error) {
            console.error('[useMQ] Error fetching queues:', error);
            return [];
        }
    }, []);

    /**
     * 获取队列中的消息数量
     * @param queueName 队列名称
     * @returns 消息数量，失败返回 -1
     */
    const getQueueMessageCount = useCallback(async (queueName: string): Promise<number> => {
        const info = await getQueueInfo(queueName);
        return info?.messages ?? -1;
    }, [getQueueInfo]);

    // Cleanup subscriptions on unmount
    useEffect(() => {
        return () => {
            subscriptionsRef.current.forEach((cleanup) => cleanup());
            subscriptionsRef.current.clear();
        };
    }, []);

    return {
        // State
        state,
        config,
        isConnected: state.isConnected,
        isConnecting: state.isConnecting,
        status: state.status,
        errorMessage: state.errorMessage,
        lastMessage: state.lastMessage,
        messageHistory: state.messageHistory,
        subscriptionIds: state.subscriptionIds,
        reconnectAttempts: state.reconnectAttempts,

        // Actions
        subscribe,
        unsubscribe,
        unsubscribeAll,
        sendMessage,
        sendMessageWithExpiration,
        ackMessage,
        nackMessage,
        reconnect,

        // Queue info (via Management API)
        getQueueInfo,
        getAllQueues,
        getQueueMessageCount,

        // Dispatch for advanced usage
        dispatch,
    };
}

export default useMQ;
