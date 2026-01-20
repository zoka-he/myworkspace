import { MessageHandler, getRabbitMQConsumer } from "../consumer";
import _ from 'lodash';
import { EmbedTaskMqData, EmbedTaskData } from '@/src/types/AiNovelMq';

/**
* AI Novel 消息处理器
* 处理 AI 小说生成相关的消息
*/
const handler: MessageHandler = async (ctx, ack, nack, reject) => {
    const { content, retryCount, isLastRetry } = ctx;

    let data: EmbedTaskMqData | null = null;
    try {
       data = JSON.parse(content);
    } catch (error) {
        // parse失败是处理不了的
        console.error('[AI Novel Embed Tasks] Error:', error);
        reject();
        return;
    }

    if (!_.isObject(data) || _.isNull(data)) {
        // 不是object不要
        console.error('[AI Novel Embed Tasks] Invalid data:', data);
        reject();
        return;
    }

    const { type, document, fingerprint } = data;
    if (!_.isString(type) || !_.isString(document) || !_.isString(fingerprint)) {
        console.error('[AI Novel Embed Tasks] Invalid data:', data);
        reject();
        return;
    }

    if (!['character', 'worldview', 'location', 'faction', 'event'].includes(type)) {
        console.error('[AI Novel Embed Tasks] Invalid data type:', data);
        reject();
        return;
    }

    const metaData = _.omit(data, ['type', 'document']);

    const embedTaskData: EmbedTaskData = {
        document,
        metadata: metaData as EmbedTaskData['metadata'],
    }

    console.info('[AI Novel Embed Tasks] Embed task data:', embedTaskData);

    // 向 frontend_notice.fanout 广播处理完成的通知
    try {
        const consumer = getRabbitMQConsumer();
        await consumer.broadcast('frontend_notice', {
            type: 'embed_task_completed',
            fingerprint,
            dataType: type,
            timestamp: Date.now(),
        });
        console.info('[AI Novel Embed Tasks] Broadcast notification sent for fingerprint:', fingerprint);
    } catch (error) {
        console.error('[AI Novel Embed Tasks] Failed to broadcast notification:', error);
        // 广播失败不影响消息确认，因为主要任务已完成
    }

    ack();
}

export default handler;