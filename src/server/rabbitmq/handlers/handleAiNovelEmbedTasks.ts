import { MessageHandler, getRabbitMQConsumer } from "../consumer";
import _ from 'lodash';
import { EmbedTaskMqData, EmbedTaskData } from '@/src/types/AiNovelMq';
import { embedService } from '@/src/services/aiNoval/embedService';

/**
* AI Novel 嵌入向量任务处理器
* 处理嵌入向量生成任务，生成文档的向量并广播通知
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

    if (type !== 'worldview') {
        if (!data.worldview_id) {
            console.error('[AI Novel Embed Tasks] Invalid data (missing worldview_id):', data);
            reject();
            return;
        }
    }

    const metaData = _.omit(data, ['type', 'document']);

    const embedTaskData: EmbedTaskData = {
        document,
        metadata: metaData as EmbedTaskData['metadata'],
    }

    console.info('[AI Novel Embed Tasks] Processing embed task:', { type, fingerprint, documentLength: document.length });

    // 限制处理速度，最快每秒处理一个嵌入任务
    const delayPromise = delay(1000);

    // 生成嵌入向量
    let embedding: number[] | null = null;
    try {
        embedding = await embedService.embedQuery(document);
        // console.info('[AI Novel Embed Tasks] Generated embedding:', { 
        //     fingerprint, 
        //     dimension: embedding.length,
        //     preview: embedding.slice(0, 5) 
        // });

        let worldview_id: string | null = data.worldview_id || null;
        let model = 'BAAI/bge-m3';

        switch (type) {
            case 'worldview':
                await embedService.saveWorldviewDocument(worldview_id, document, metaData, model);
                break;
            case 'chapter':
                await embedService.saveChapterDocument(worldview_id, document, metaData, model);
                break;
            case 'character':
                await embedService.saveCharacterDocument(worldview_id, document, metaData, model);
                break;
            case 'event':
                await embedService.saveEventDocument(worldview_id, document, metaData, model);
                break;
            case 'faction':
                await embedService.saveFactionDocument(worldview_id, document, metaData, model);
                break;
            case 'location':
                await embedService.saveGeoDocument(worldview_id, document, metaData, model);
                break;
        }
    } catch (error) {
        console.error('[AI Novel Embed Tasks] Failed to generate embedding:', error);
        
        // 如果是最后一次重试，则拒绝消息；否则进行 nack 以便重试
        if (isLastRetry) {
            console.error('[AI Novel Embed Tasks] Max retries reached, rejecting message');
            reject();
        } else {
            console.warn(`[AI Novel Embed Tasks] Retrying... (attempt ${retryCount + 1})`);
            nack();
        }
        return;
    }

    // 向 frontend_notice.fanout 广播处理完成的通知
    try {
        const consumer = getRabbitMQConsumer();
        await consumer.broadcast('frontend_notice', {
            type: 'embed_task_completed',
            fingerprint,
            dataType: type,
            // embedding,
            embeddingDimension: embedding.length,
            metadata: embedTaskData.metadata,
            timestamp: Date.now(),
        });
        console.info('[AI Novel Embed Tasks] Broadcast notification sent for fingerprint:', fingerprint);
    } catch (error) {
        console.error('[AI Novel Embed Tasks] Failed to broadcast notification:', error);
        // 广播失败不影响消息确认，因为嵌入向量已成功生成
    }

    // 结束等待
    await delayPromise;

    ack();
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export default handler;