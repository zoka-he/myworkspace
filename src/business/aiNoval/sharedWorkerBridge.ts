export type AiNovelWorkerMessage =
    | { type: 'GET_STATE' }
    | { type: 'STATE_SYNC'; payload: AiNovelWorkerState }
    | { type: 'WRITE_COMPLETED'; payload: WriteCompletedPayload }
    | { type: 'REQUEST_EVENT_EDIT'; payload: EventEditRequestPayload }
    | { type: 'EVENT_EDIT_REQUESTED'; payload: EventEditRequestPayload };

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
    timestamp?: number;
}

export interface AiNovelWorkerState {
    lastWriteCompleted: WriteCompletedPayload | null;
    lastEventEditRequest: EventEditRequestPayload | null;
}

type Listener = (message: AiNovelWorkerMessage) => void;

const WORKER_NAME = 'aiNovel-cross-tab';

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
        listeners.forEach((listener) => listener(event.data));
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
}
