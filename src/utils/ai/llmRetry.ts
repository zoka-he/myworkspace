export interface LlmInvokeRetryOptions {
    timeoutMs?: number;
    maxRetries?: number;
    logTag?: string;
}

export function extractLlmErrorMeta(error: any) {
    const cause = error?.cause;
    return {
        name: error?.name,
        message: error?.message,
        code: error?.code ?? cause?.code,
        causeName: cause?.name,
        causeMessage: cause?.message,
        stack: error?.stack,
    };
}

export function isRetryableLlmNetworkError(error: any): boolean {
    const message = String(error?.message ?? "").toLowerCase();
    const code = String(error?.code ?? error?.cause?.code ?? "").toLowerCase();
    const causeMessage = String(error?.cause?.message ?? "").toLowerCase();
    const haystack = `${message} ${code} ${causeMessage}`;
    return (
        haystack.includes("terminated") ||
        haystack.includes("aborted") ||
        haystack.includes("econnreset") ||
        haystack.includes("socket")
    );
}

export async function invokeWithRetry<T>(
    invokeFn: (config?: { signal?: AbortSignal }) => Promise<T>,
    options: LlmInvokeRetryOptions = {}
): Promise<T> {
    const {
        timeoutMs,
        maxRetries = 1,
        logTag = "[llmInvoke]",
    } = options;

    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
            const config = timeoutMs && timeoutMs > 0
                ? { signal: AbortSignal.timeout(timeoutMs) }
                : undefined;
            return await invokeFn(config);
        } catch (error: any) {
            lastError = error;
            const retryable = isRetryableLlmNetworkError(error);
            const canRetry = retryable && attempt <= maxRetries;
            console.error(logTag, `LLM调用失败（第 ${attempt} 次）`, extractLlmErrorMeta(error));
            if (!canRetry) {
                throw error;
            }
            console.warn(logTag, `检测到可重试网络错误，准备重试（第 ${attempt + 1} 次）`);
        }
    }

    throw lastError;
}
