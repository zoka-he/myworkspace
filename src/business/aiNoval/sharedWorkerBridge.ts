export type TabRegistrationRole = 'eventManage2' | 'worldviewFullGraph';

export type AiNovelWorkerMessage =
    | { type: 'GET_STATE' }
    | { type: 'STATE_SYNC'; payload: AiNovelWorkerState }
    | { type: 'WRITE_COMPLETED'; payload: WriteCompletedPayload }
    | { type: 'REQUEST_EVENT_EDIT'; payload: EventEditRequestPayload }
    | { type: 'EVENT_EDIT_REQUESTED'; payload: EventEditRequestPayload }
    | { type: 'REGISTER_TAB'; payload: { role: TabRegistrationRole } }
    | { type: 'UNREGISTER_TAB' }
    | { type: 'GET_EVENT_MANAGE2_TAB_COUNT'; requestId: string }
    | { type: 'EVENT_MANAGE2_TAB_COUNT_RESULT'; requestId: string; count: number };

export type ManagePageSource = 'geography' | 'faction' | 'role' | 'event';

export interface WriteCompletedPayload {
    source: ManagePageSource;
    action?: string;
    api?: string;
    timestamp?: number;
}

export interface EventEditRequestPayload {
    from: 'worldviewFullGraph';
    worldviewId?: number | null;
    novelId?: number | null;
    eventId?: number | null;
    timestamp?: number;
}

export interface AiNovelWorkerState {
    lastWriteCompleted: WriteCompletedPayload | null;
    lastEventEditRequest: EventEditRequestPayload | null;
}

type Listener = (message: AiNovelWorkerMessage) => void;

const WORKER_NAME = 'aiNovel-cross-tab';

/** 与 SharedWorker 并行：同 origin 下跨页签协调（不依赖 SharedWorker 是否可用）。 */
export const AI_NOVEL_EVENT_COORD_CHANNEL = 'aiNovel-event-manage2-coord-v1';

let workerPort: MessagePort | null = null;
let workerInstance: SharedWorker | null = null;
const listeners = new Set<Listener>();

function resolveWorkerScriptUrl(): string {
    if (typeof window === 'undefined') return '/scripts/aiNovelSharedWorker.js';
    return new URL('/scripts/aiNovelSharedWorker.js', window.location.origin).href;
}

function logDev(message: string, ...args: unknown[]) {
    if (process.env.NODE_ENV !== 'development') return;
    console.info(`[aiNovel SharedWorker] ${message}`, ...args);
}

function ensurePort(): MessagePort | null {
    if (workerPort) return workerPort;
    if (typeof window === 'undefined') return null;

    if (typeof SharedWorker === 'undefined') {
        logDev('不可用：当前浏览器未提供 SharedWorker（例如部分 WebView / Safari）');
        return null;
    }

    if (!window.isSecureContext) {
        logDev('不可用：需要安全上下文（https 或 localhost）');
        return null;
    }

    const scriptUrl = resolveWorkerScriptUrl();

    try {
        workerInstance = new SharedWorker(scriptUrl, { name: WORKER_NAME, type: 'classic' });
    } catch (error) {
        logDev('创建失败', error);
        workerInstance = null;
        return null;
    }

    workerInstance.addEventListener('error', (event) => {
        logDev('脚本加载或运行错误', event);
    });

    workerPort = workerInstance.port;
    workerPort.start();
    workerPort.onmessage = (event: MessageEvent<AiNovelWorkerMessage>) => {
        const data = event.data;
        for (const listener of Array.from(listeners)) {
            try {
                listener(data);
            } catch (error) {
                logDev('监听器执行出错', error);
            }
        }
    };

    logDev(`已连接，脚本: ${scriptUrl}；在 Chrome 中可到 chrome://inspect →「Shared workers」查看「${WORKER_NAME}」`);

    return workerPort;
}

/** 尝试建立连接；返回是否成功（便于页面侧提示或排查）。 */
export function connectAiNovelSharedWorker(): boolean {
    return ensurePort() !== null;
}

export function postAiNovelWorkerMessage(message: AiNovelWorkerMessage) {
    const port = ensurePort();
    if (!port) return;
    port.postMessage(message);
}

export function subscribeAiNovelWorker(listener: Listener) {
    listeners.add(listener);
    ensurePort();
    return () => {
        listeners.delete(listener);
    };
}

export function notifyAiNovelWriteCompleted(payload: WriteCompletedPayload) {
    postAiNovelWorkerMessage({
        type: 'WRITE_COMPLETED',
        payload,
    });
    broadcastWriteCompleted(payload);
}

function broadcastWriteCompleted(payload: WriteCompletedPayload) {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
        const bc = new BroadcastChannel(AI_NOVEL_EVENT_COORD_CHANNEL);
        bc.postMessage({ type: 'BC_WRITE_COMPLETED', payload });
        bc.close();
    } catch {
        // ignore
    }
}

/** 向其它页签广播编辑请求（与 SharedWorker 双发，提高到达率）。 */
export function broadcastEventEditRequest(payload: EventEditRequestPayload) {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
        const bc = new BroadcastChannel(AI_NOVEL_EVENT_COORD_CHANNEL);
        bc.postMessage({ type: 'BC_REQUEST_EVENT_EDIT', payload });
        bc.close();
    } catch {
        // ignore
    }
}

const TAB_COUNT_TIMEOUT_MS = 300;
const BC_TAB_PING_MS = 300;

function getEventManage2TabCountViaBroadcast(): Promise<number> {
    if (typeof BroadcastChannel === 'undefined') {
        return Promise.resolve(0);
    }
    return new Promise((resolve) => {
        let settled = false;
        const finish = (n: number) => {
            if (settled) return;
            settled = true;
            clearTimeout(t);
            try {
                bc.close();
            } catch {
                // ignore
            }
            resolve(n);
        };

        const bc = new BroadcastChannel(AI_NOVEL_EVENT_COORD_CHANNEL);
        const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const t = setTimeout(() => finish(0), BC_TAB_PING_MS);

        bc.onmessage = (event: MessageEvent) => {
            const d = event.data as { type?: string; requestId?: string; count?: number };
            if (d?.type === 'TAB_COUNT_ACK' && d.requestId === requestId) {
                finish(typeof d.count === 'number' ? d.count : 1);
            }
        };

        try {
            bc.postMessage({ type: 'TAB_COUNT_PING', requestId });
        } catch {
            finish(0);
        }
    });
}

function getEventManage2TabCountViaSharedWorker(): Promise<number> {
    const port = ensurePort();
    if (!port) {
        return Promise.resolve(0);
    }

    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return new Promise((resolve) => {
        let settled = false;
        const finish = (count: number) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            queueMicrotask(() => {
                unsubscribe();
            });
            resolve(count);
        };

        const handler = (message: AiNovelWorkerMessage) => {
            if (
                message.type === 'EVENT_MANAGE2_TAB_COUNT_RESULT' &&
                message.requestId === requestId
            ) {
                finish(typeof message.count === 'number' ? message.count : 0);
            }
        };

        const unsubscribe = subscribeAiNovelWorker(handler);

        const timeoutId = setTimeout(() => finish(0), TAB_COUNT_TIMEOUT_MS);

        port.postMessage({
            type: 'GET_EVENT_MANAGE2_TAB_COUNT',
            requestId,
        } satisfies AiNovelWorkerMessage);
    });
}

/**
 * 当前是否存在可承接编辑的 eventManage2 页签。
 * 先走 BroadcastChannel（快、与 Next/HMR 无关），再走 SharedWorker。
 */
export async function getEventManage2TabCount(): Promise<number> {
    const viaBc = await getEventManage2TabCountViaBroadcast();
    if (viaBc > 0) {
        return viaBc;
    }
    return getEventManage2TabCountViaSharedWorker();
}

/** eventManage2 页挂载：响应 ping、接收 BC 编辑指令。 */
export function subscribeEventManage2BroadcastChannel(
    onEditRequest: (payload: EventEditRequestPayload) => void,
): () => void {
    if (typeof BroadcastChannel === 'undefined') {
        return () => {};
    }
    const bc = new BroadcastChannel(AI_NOVEL_EVENT_COORD_CHANNEL);
    bc.onmessage = (event: MessageEvent) => {
        const d = event.data as {
            type?: string;
            requestId?: string;
            payload?: EventEditRequestPayload;
        };
        if (!d || typeof d !== 'object') return;
        if (d.type === 'TAB_COUNT_PING') {
            bc.postMessage({ type: 'TAB_COUNT_ACK', requestId: d.requestId, count: 1 });
            return;
        }
        if (d.type === 'BC_REQUEST_EVENT_EDIT' && d.payload) {
            onEditRequest(d.payload);
        }
    };
    return () => {
        try {
            bc.close();
        } catch {
            // ignore
        }
    };
}

/** worldviewFullGraph 等页：通过 BC 接收写库完成（与 SharedWorker 双通道）。 */
export function subscribeWorldviewBroadcastForWriteCompleted(
    onEvent: (payload: WriteCompletedPayload) => void,
): () => void {
    if (typeof BroadcastChannel === 'undefined') {
        return () => {};
    }
    const bc = new BroadcastChannel(AI_NOVEL_EVENT_COORD_CHANNEL);
    bc.onmessage = (event: MessageEvent) => {
        const d = event.data as { type?: string; payload?: WriteCompletedPayload };
        if (d?.type === 'BC_WRITE_COMPLETED' && d.payload?.source === 'event') {
            onEvent(d.payload);
        }
    };
    return () => {
        try {
            bc.close();
        } catch {
            // ignore
        }
    };
}
