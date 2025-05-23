// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import ChaptersService from '@/src/services/aiNoval/chaptersService';
import ChapterEventRelationService from '@/src/services/aiNoval/chapterEventRelationService';
type Data = Object;

const chapterService = new ChaptersService();
const chapterEventRelationService = new ChapterEventRelationService();

async function createOrUpdateOne(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    const body = req.body;
    console.debug('body', body);

    if (typeof id === 'undefined') {
        // 创建章节，创建章节的流程不包括关联事件
        await chapterService.insertOne(body);
        res.status(200).json({ message: 'created' });
    } else {
        await chapterService.updateOne({ id }, body);

        if (body.hasOwnProperty('event_ids')) {
            // 更新事件关系
            let eventIds: number[] = [];
            const eventIdsStr = body.event_ids;
            if (eventIdsStr && eventIdsStr.length > 0) {
                eventIds = eventIdsStr.split(',').map(Number);
            }

            // 删除所有旧的事件关系
            await chapterEventRelationService.deleteMany({ chapter_id: id });

            // 创建新的事件关系
            for (const eventId of eventIds) {
                await chapterEventRelationService.insertOne({ chapter_id: id, event_id: eventId });
            }
        }

        res.status(200).json({ message: 'updated, id:' + id });
    }
}

async function research(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    if (typeof id === 'undefined') {
        res.status(500).json({ message: 'id is required' });
    } else {
        let data = await chapterService.queryOne({ id });
        if (!data) {
            res.status(404).json({ message: 'not found, id:' + id });
        } else {
            res.status(200).json(data);
        }

    }
}

async function deleteOne(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    if (typeof id === 'undefined') {
        res.status(500).json({ message: 'id is required' });
    } else {
        await chapterService.deleteOne({ id });
        await chapterEventRelationService.deleteMany({ chapter_id: id });
        res.status(200).json({ message: 'deleted, id:' + id });
    }
}

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    let processerFn: Function | undefined = undefined;
    switch (req.method) {
        case 'GET':
            processerFn = research;
            break;
        case 'POST':
            processerFn = createOrUpdateOne;
            break;
        case 'DELETE':
            processerFn = deleteOne
            break;
    }

    if (!processerFn) {
        res.status(500).json({ message: '不支持的操作!' })
        return;
    }

    processerFn(req, res);
}
