import { MessageHandler } from '../consumer';

export const handleTestMessages: MessageHandler = async (ctx, ack, nack, reject) => {
    const { content, retryCount, isLastRetry } = ctx;
    console.log(`[Test Messages] Received (attempt ${retryCount + 1}):`, content);
    ack();  // 永远都是ack
}