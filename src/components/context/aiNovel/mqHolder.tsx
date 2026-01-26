"use client";

import { useContext, useEffect, useRef, useCallback } from "react";
import { IMessage, IFrame } from "@stomp/stompjs";
import { MQStateContext, MQDispatchContext, ConnectionStatus } from "./mqStateContext";
import { MQConfigContext } from "./mqConfigContext";
import { createRabbitMQClient, getRabbitMQClient, RabbitMQClient, MessageHandler } from "@/src/utils/rabbitmq";
import { SubscriptionConfig } from "@/src/config/rabbitmq";

export interface MQHolderProps {
    children: React.ReactNode;
    /** Callback when a message is received */
    onMessage?: (message: IMessage) => void;
    /** Callback when connection status changes */
    onConnectionChange?: (connected: boolean) => void;
    /** Callback when error occurs */
    onError?: (error: string) => void;
    /** 是否阻塞渲染直到连接成功 (default: false) */
    blockUntilConnected?: boolean;
    /** 连接中/错误时的自定义 UI */
    loadingUI?: React.ReactNode;
    /** 错误时的自定义 UI，接收错误信息和重连函数 */
    errorUI?: (error: string, reconnect: () => void) => React.ReactNode;
}

/**
 * MQHolder Component
 * 
 * Manages RabbitMQ STOMP connection lifecycle and provides
 * connection state to child components via context.
 */
export default function MQHolder({ 
    children, 
    onMessage, 
    onConnectionChange,
    onError,
    blockUntilConnected = false,
    loadingUI,
    errorUI,
}: MQHolderProps) {
    const config = useContext(MQConfigContext);
    const state = useContext(MQStateContext);
    const dispatch = useContext(MQDispatchContext);
    const clientRef = useRef<RabbitMQClient | null>(null);
    const isInitializedRef = useRef(false);

    // 使用 ref 存储回调，避免依赖变化导致重连
    const callbacksRef = useRef({
        onMessage,
        onConnectionChange,
        onError,
    });
    
    // 更新回调 ref
    useEffect(() => {
        callbacksRef.current = {
            onMessage,
            onConnectionChange,
            onError,
        };
    }, [onMessage, onConnectionChange, onError]);

    // 手动重连函数
    const handleReconnect = useCallback(() => {
        const client = clientRef.current || getRabbitMQClient();
        if (client) {
            dispatch({ type: 'CONNECT_START' });
            client.reconnect();
        }
    }, [dispatch]);

    // Subscribe to a destination
    const subscribe = useCallback((subscriptionConfig: SubscriptionConfig, messageHandler: MessageHandler): string | null => {
        if (!clientRef.current) {
            console.warn('[MQHolder] Cannot subscribe: client not initialized');
            return null;
        }

        const subscriptionId = clientRef.current.subscribe(subscriptionConfig, messageHandler);
        dispatch({ type: 'ADD_SUBSCRIPTION', payload: subscriptionId });
        return subscriptionId;
    }, [dispatch]);

    // Initialize and connect - 只在挂载时执行一次
    useEffect(() => {
        // Skip if running on server side
        if (typeof window === 'undefined') {
            return;
        }

        // 防止重复初始化
        if (isInitializedRef.current) {
            return;
        }
        isInitializedRef.current = true;

        // Handle connection
        const handleConnect = () => {
            dispatch({ type: 'CONNECT_SUCCESS' });
            callbacksRef.current.onConnectionChange?.(true);
            
            // Set up default subscriptions after connection
            if (config.subscriptions && config.subscriptions.length > 0) {
                config.subscriptions.forEach((subConfig) => {
                    if (clientRef.current) {
                        const messageHandler: MessageHandler = (message) => {
                            dispatch({ type: 'MESSAGE_RECEIVED', payload: message });
                            callbacksRef.current.onMessage?.(message);
                        };
                        const subscriptionId = clientRef.current.subscribe(subConfig, messageHandler);
                        dispatch({ type: 'ADD_SUBSCRIPTION', payload: subscriptionId });
                    }
                });
            }
        };

        // Handle disconnection
        const handleDisconnect = () => {
            dispatch({ type: 'DISCONNECT' });
            callbacksRef.current.onConnectionChange?.(false);
        };

        // Handle error
        const handleError = (error: IFrame | string) => {
            const errorMessage = typeof error === 'string' 
                ? error 
                : error.headers?.message || 'Unknown error';
            dispatch({ type: 'CONNECT_ERROR', payload: errorMessage });
            callbacksRef.current.onError?.(errorMessage);
        };

        // Handle reconnection
        const handleReconnect = (attempt: number) => {
            dispatch({ type: 'RECONNECTING', payload: attempt });
        };

        // Create client (使用 createRabbitMQClient 注册到单例，供 useMQ hook 使用)
        clientRef.current = createRabbitMQClient({
            config,
            onConnect: handleConnect,
            onDisconnect: handleDisconnect,
            onError: handleError,
            onReconnect: handleReconnect,
        });

        // Auto connect if configured
        if (config.autoConnect !== false) {
            dispatch({ type: 'CONNECT_START' });
            clientRef.current.connect();
        }

        // Cleanup on unmount
        return () => {
            if (clientRef.current) {
                clientRef.current.disconnect();
                clientRef.current = null;
            }
            isInitializedRef.current = false;
            dispatch({ type: 'RESET' });
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // 空依赖数组，只在挂载时执行

    // Log state changes in development
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log('[MQHolder] State updated:', state);
        }
    }, [state]);

    // 根据 blockUntilConnected 决定渲染逻辑
    if (blockUntilConnected) {
        // 阻塞模式：连接成功才渲染 children
        if (state.status === ConnectionStatus.ERROR && state.errorMessage) {
            // 错误状态：显示错误 UI 或默认错误信息
            if (errorUI) {
                return <>{errorUI(state.errorMessage, handleReconnect)}</>;
            }
            return (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <p style={{ color: 'red' }}>RabbitMQ 连接失败: {state.errorMessage}</p>
                    <button 
                        onClick={handleReconnect}
                        style={{ 
                            marginTop: '10px', 
                            padding: '8px 16px',
                            cursor: 'pointer'
                        }}
                    >
                        重新连接
                    </button>
                </div>
            );
        }
        
        if (!state.isConnected) {
            // 连接中或重连中：显示 loading UI
            if (loadingUI) {
                return <>{loadingUI}</>;
            }
            return (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <p>正在连接 RabbitMQ...</p>
                    {state.reconnectAttempts > 0 && (
                        <p style={{ color: '#666', fontSize: '12px' }}>
                            重连尝试: {state.reconnectAttempts}
                        </p>
                    )}
                </div>
            );
        }
    }
    
    // 非阻塞模式或已连接：正常渲染 children
    return <>{children}</>;
}

/** Custom hook to access MQ client operations */
export function useMQClient() {
    const state = useContext(MQStateContext);
    const dispatch = useContext(MQDispatchContext);
    const config = useContext(MQConfigContext);

    return {
        state,
        config,
        dispatch,
        isConnected: state.isConnected,
        isConnecting: state.isConnecting,
        status: state.status,
        lastMessage: state.lastMessage,
        messageHistory: state.messageHistory,
        errorMessage: state.errorMessage,
    };
}
