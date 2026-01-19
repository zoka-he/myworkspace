import { createContext, useReducer, Dispatch } from "react";
import { IMessage } from "@stomp/stompjs";

/** Connection status enum */
export enum ConnectionStatus {
    DISCONNECTED = 'disconnected',
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    RECONNECTING = 'reconnecting',
    ERROR = 'error',
}

/** MQ State interface */
export interface MQState {
    /** Current connection status */
    status: ConnectionStatus;
    /** Whether connected to RabbitMQ */
    isConnected: boolean;
    /** Whether currently connecting */
    isConnecting: boolean;
    /** Connection error message */
    errorMessage: string | null;
    /** Reconnection attempt count */
    reconnectAttempts: number;
    /** Last received message */
    lastMessage: IMessage | null;
    /** Message history (optional, for debugging) */
    messageHistory: IMessage[];
    /** Active subscription IDs */
    subscriptionIds: string[];
}

/** Action types */
export type MQAction =
    | { type: 'CONNECT_START' }
    | { type: 'CONNECT_SUCCESS' }
    | { type: 'CONNECT_ERROR'; payload: string }
    | { type: 'DISCONNECT' }
    | { type: 'RECONNECTING'; payload: number }
    | { type: 'MESSAGE_RECEIVED'; payload: IMessage }
    | { type: 'CLEAR_MESSAGES' }
    | { type: 'ADD_SUBSCRIPTION'; payload: string }
    | { type: 'REMOVE_SUBSCRIPTION'; payload: string }
    | { type: 'CLEAR_SUBSCRIPTIONS' }
    | { type: 'RESET' };

/** Reducer for MQ state */
export function mqStateReducer(state: MQState, action: MQAction): MQState {
    switch (action.type) {
        case 'CONNECT_START':
            return {
                ...state,
                status: ConnectionStatus.CONNECTING,
                isConnecting: true,
                isConnected: false,
                errorMessage: null,
            };

        case 'CONNECT_SUCCESS':
            return {
                ...state,
                status: ConnectionStatus.CONNECTED,
                isConnecting: false,
                isConnected: true,
                errorMessage: null,
                reconnectAttempts: 0,
            };

        case 'CONNECT_ERROR':
            return {
                ...state,
                status: ConnectionStatus.ERROR,
                isConnecting: false,
                isConnected: false,
                errorMessage: action.payload,
            };

        case 'DISCONNECT':
            return {
                ...state,
                status: ConnectionStatus.DISCONNECTED,
                isConnecting: false,
                isConnected: false,
                errorMessage: null,
                reconnectAttempts: 0,
            };

        case 'RECONNECTING':
            return {
                ...state,
                status: ConnectionStatus.RECONNECTING,
                isConnecting: true,
                isConnected: false,
                reconnectAttempts: action.payload,
            };

        case 'MESSAGE_RECEIVED':
            return {
                ...state,
                lastMessage: action.payload,
                messageHistory: [...state.messageHistory.slice(-99), action.payload], // Keep last 100 messages
            };

        case 'CLEAR_MESSAGES':
            return {
                ...state,
                lastMessage: null,
                messageHistory: [],
            };

        case 'ADD_SUBSCRIPTION':
            if (state.subscriptionIds.includes(action.payload)) {
                return state;
            }
            return {
                ...state,
                subscriptionIds: [...state.subscriptionIds, action.payload],
            };

        case 'REMOVE_SUBSCRIPTION':
            return {
                ...state,
                subscriptionIds: state.subscriptionIds.filter(id => id !== action.payload),
            };

        case 'CLEAR_SUBSCRIPTIONS':
            return {
                ...state,
                subscriptionIds: [],
            };

        case 'RESET':
            return defaultMQState();

        default:
            return state;
    }
}

/** Default MQ state */
export function defaultMQState(): MQState {
    return {
        status: ConnectionStatus.DISCONNECTED,
        isConnected: false,
        isConnecting: false,
        errorMessage: null,
        reconnectAttempts: 0,
        lastMessage: null,
        messageHistory: [],
        subscriptionIds: [],
    };
}

/** State context */
export const MQStateContext = createContext<MQState>(defaultMQState());

/** Dispatch context */
export const MQDispatchContext = createContext<Dispatch<MQAction>>(() => {});

/** Custom hook to use MQ state with reducer */
export function useMQStateReducer() {
    return useReducer(mqStateReducer, defaultMQState());
}
