"use client";

import { IMessage } from "@stomp/stompjs";
import { MQStateContext, MQDispatchContext, useMQStateReducer } from "./mqStateContext";
import { MQConfigContext, RabbitMQConfig, defaultRabbitMQConfig } from "./mqConfigContext";
import MQHolder from "./mqHolder";

export interface RabbitMQProviderProps {
    /** RabbitMQ configuration */
    config?: Partial<RabbitMQConfig>;
    /** Children components */
    children: React.ReactNode;
    /** Callback when a message is received */
    onMessage?: (message: IMessage) => void;
    /** Callback when connection status changes */
    onConnectionChange?: (connected: boolean) => void;
    /** Callback when error occurs */
    onError?: (error: string) => void;
}

/**
 * RabbitMQProvider
 * 
 * 独立的 RabbitMQ STOMP 连接 Provider。
 * 可单独使用，也可以嵌套在其他 Provider 中。
 * 
 * @example
 * ```tsx
 * <RabbitMQProvider
 *   config={{
 *     wsUrl: 'http://localhost:15674/ws',
 *     login: 'guest',
 *     passcode: 'guest',
 *     autoConnect: true,
 *     subscriptions: [
 *       { destination: '/queue/notifications', ack: 'auto' },
 *       { destination: '/topic/events', ack: 'client' },
 *     ],
 *   }}
 *   onMessage={(msg) => console.log('Received:', msg.body)}
 *   onConnectionChange={(connected) => console.log('Connected:', connected)}
 * >
 *   <App />
 * </RabbitMQProvider>
 * ```
 */
export default function RabbitMQProvider({ 
    config, 
    children,
    onMessage,
    onConnectionChange,
    onError,
}: RabbitMQProviderProps) {
    const [state, dispatch] = useMQStateReducer();
    
    // Merge provided config with defaults
    const mergedConfig: RabbitMQConfig = {
        ...defaultRabbitMQConfig,
        ...config,
    };

    return (
        <MQConfigContext.Provider value={mergedConfig}>
            <MQStateContext.Provider value={state}>
                <MQDispatchContext.Provider value={dispatch}>
                    {children}
                </MQDispatchContext.Provider>
            </MQStateContext.Provider>
        </MQConfigContext.Provider>
    );
}
