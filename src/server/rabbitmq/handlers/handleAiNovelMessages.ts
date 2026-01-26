import { MessageHandler } from "../consumer";

/**
* AI Novel 消息处理器
* 处理 AI 小说生成相关的消息
*/
const aiNovelHandler: MessageHandler = async (ctx, ack, nack, reject) => {
   const { content, retryCount, isLastRetry } = ctx;
   
   try {
       const data = JSON.parse(content);
       console.log(`[AI Novel Handler] Received (attempt ${retryCount + 1}):`, data);
       
       // 根据消息类型处理不同的业务逻辑
       const { type, payload } = data;
       
       switch (type) {
           case 'generate_chapter':
               console.log('[AI Novel] Generating chapter:', payload);
               // TODO: 实现章节生成逻辑
               // 如果后端服务不可用，会抛出异常，触发重试
               break;
               
           case 'generate_skeleton':
               console.log('[AI Novel] Generating skeleton:', payload);
               // TODO: 实现骨架生成逻辑
               break;
               
           case 'invalid_task':
               // 对于无效任务，直接拒绝，不重试
               console.log('[AI Novel] Invalid task, rejecting:', payload);
               reject();
               return;
               
           default:
               console.log('[AI Novel] Unknown message type:', type);
               // 未知类型也直接拒绝
               reject();
               return;
       }
       
       ack();
   } catch (error) {
       console.error('[AI Novel Handler] Error:', error);
       
       // 判断是否是可重试的错误
       if (isRetryableError(error)) {
           if (isLastRetry) {
               console.error('[AI Novel] Max retries reached, giving up');
           }
           nack(); // 可重试错误，进入重试流程
       } else {
           // 不可重试的错误（如数据格式错误），直接拒绝
           console.error('[AI Novel] Non-retryable error, rejecting message');
           reject();
       }
   }
};

/**
 * 判断错误是否可重试
 */
function isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        // 网络错误、超时、服务不可用等可以重试
        if (
            message.includes('timeout') ||
            message.includes('network') ||
            message.includes('econnrefused') ||
            message.includes('econnreset') ||
            message.includes('service unavailable') ||
            message.includes('503') ||
            message.includes('502') ||
            message.includes('504')
        ) {
            return true;
        }
        
        // JSON 解析错误、参数验证错误等不应该重试
        if (
            message.includes('json') ||
            message.includes('invalid') ||
            message.includes('validation') ||
            message.includes('400')
        ) {
            return false;
        }
    }
    
    // 默认可重试
    return true;
}

export default aiNovelHandler;