// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import BrainstormService from '@/src/services/aiNoval/brainstormService';
import { ApiResponse } from '@/src/types/ApiResponse';
import { IBrainstorm } from '@/src/types/IAiNoval';

type Data = ApiResponse<IBrainstorm | { message: string }>;

const service = new BrainstormService();

async function getOne(req: NextApiRequest, res: NextApiResponse<Data>) {
    const { id } = req.query;
    if (typeof id === 'undefined') {
        res.status(400).json({ 
            success: false,
            error: 'id is required' 
        });
        return;
    }

    try {
        const brainstorm = await service.getBrainstormById(Number(id));
        if (!brainstorm) {
            res.status(404).json({ 
                success: false,
                error: `Brainstorm not found, id: ${id}` 
            });
        } else {
            // 解析 JSON 字段
            if (typeof brainstorm.tags === 'string') {
                brainstorm.tags = JSON.parse(brainstorm.tags);
            }
            if (typeof brainstorm.analysis_result === 'string') {
                brainstorm.analysis_result = JSON.parse(brainstorm.analysis_result);
            }
            if (typeof brainstorm.related_faction_ids === 'string') {
                brainstorm.related_faction_ids = JSON.parse(brainstorm.related_faction_ids);
            }
            if (typeof brainstorm.related_role_ids === 'string') {
                brainstorm.related_role_ids = JSON.parse(brainstorm.related_role_ids);
            }
            if (typeof brainstorm.related_geo_codes === 'string') {
                brainstorm.related_geo_codes = JSON.parse(brainstorm.related_geo_codes);
            }
            if (typeof brainstorm.related_event_ids === 'string') {
                brainstorm.related_event_ids = JSON.parse(brainstorm.related_event_ids);
            }
            if (typeof brainstorm.related_chapter_ids === 'string') {
                brainstorm.related_chapter_ids = JSON.parse(brainstorm.related_chapter_ids);
            }
            if (typeof brainstorm.related_world_state_ids === 'string') {
                brainstorm.related_world_state_ids = JSON.parse(brainstorm.related_world_state_ids);
            }

            res.status(200).json({ 
                success: true,
                data: brainstorm 
            });
        }
    } catch (error: any) {
        console.error('[Brainstorm API] Get error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message || 'Failed to get brainstorm' 
        });
    }
}

async function createOrUpdateOne(req: NextApiRequest, res: NextApiResponse<Data>) {
    const { id } = req.query;
    const body = req.body as Partial<IBrainstorm>;

    try {
        // 处理 JSON 字段
        const processedBody: any = { ...body };
        if (processedBody.tags && Array.isArray(processedBody.tags)) {
            processedBody.tags = JSON.stringify(processedBody.tags);
        }
        if (processedBody.analysis_result && typeof processedBody.analysis_result === 'object') {
            processedBody.analysis_result = JSON.stringify(processedBody.analysis_result);
        }
        if (processedBody.related_faction_ids && Array.isArray(processedBody.related_faction_ids)) {
            processedBody.related_faction_ids = JSON.stringify(processedBody.related_faction_ids);
        }
        if (processedBody.related_role_ids && Array.isArray(processedBody.related_role_ids)) {
            processedBody.related_role_ids = JSON.stringify(processedBody.related_role_ids);
        }
        if (processedBody.related_geo_codes && Array.isArray(processedBody.related_geo_codes)) {
            processedBody.related_geo_codes = JSON.stringify(processedBody.related_geo_codes);
        }
        if (processedBody.related_event_ids && Array.isArray(processedBody.related_event_ids)) {
            processedBody.related_event_ids = JSON.stringify(processedBody.related_event_ids);
        }
        if (processedBody.related_chapter_ids && Array.isArray(processedBody.related_chapter_ids)) {
            processedBody.related_chapter_ids = JSON.stringify(processedBody.related_chapter_ids);
        }
        if (processedBody.related_world_state_ids && Array.isArray(processedBody.related_world_state_ids)) {
            processedBody.related_world_state_ids = JSON.stringify(processedBody.related_world_state_ids);
        }

        if (typeof id === 'undefined') {
            // 创建
            const insertId = await service.createBrainstorm(processedBody);
            // 重新查询获取完整数据
            const created = await service.getBrainstormById(insertId);
            if (created) {
                // 解析 JSON 字段
                if (typeof created.tags === 'string') {
                    created.tags = JSON.parse(created.tags);
                }
                if (typeof created.analysis_result === 'string') {
                    created.analysis_result = JSON.parse(created.analysis_result);
                }
                if (typeof created.related_faction_ids === 'string') {
                    created.related_faction_ids = JSON.parse(created.related_faction_ids);
                }
                if (typeof created.related_role_ids === 'string') {
                    created.related_role_ids = JSON.parse(created.related_role_ids);
                }
                if (typeof created.related_geo_codes === 'string') {
                    created.related_geo_codes = JSON.parse(created.related_geo_codes);
                }
                if (typeof created.related_event_ids === 'string') {
                    created.related_event_ids = JSON.parse(created.related_event_ids);
                }
                if (typeof created.related_chapter_ids === 'string') {
                    created.related_chapter_ids = JSON.parse(created.related_chapter_ids);
                }
                if (typeof created.related_world_state_ids === 'string') {
                    created.related_world_state_ids = JSON.parse(created.related_world_state_ids);
                }
                res.status(200).json({ 
                    success: true,
                    data: created 
                });
            } else {
                res.status(500).json({ 
                    success: false,
                    error: 'Failed to retrieve created brainstorm' 
                });
            }
        } else {
            // 更新
            await service.updateBrainstorm(Number(id), processedBody);
            const updated = await service.getBrainstormById(Number(id));
            if (updated) {
                // 解析 JSON 字段
                if (typeof updated.tags === 'string') {
                    updated.tags = JSON.parse(updated.tags);
                }
                if (typeof updated.analysis_result === 'string') {
                    updated.analysis_result = JSON.parse(updated.analysis_result);
                }
                res.status(200).json({ 
                    success: true,
                    data: updated 
                });
            } else {
                res.status(404).json({ 
                    success: false,
                    error: `Brainstorm not found, id: ${id}` 
                });
            }
        }
    } catch (error: any) {
        console.error('[Brainstorm API] Create/Update error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message || 'Failed to create/update brainstorm' 
        });
    }
}

async function deleteOne(req: NextApiRequest, res: NextApiResponse<Data>) {
    const { id } = req.query;
    if (typeof id === 'undefined') {
        res.status(400).json({ 
            success: false,
            error: 'id is required' 
        });
        return;
    }

    try {
        await service.deleteBrainstorm(Number(id));
        res.status(200).json({ 
            success: true,
            data: { message: `deleted, id: ${id}` } as any
        });
    } catch (error: any) {
        console.error('[Brainstorm API] Delete error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message || 'Failed to delete brainstorm' 
        });
    }
}

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    let processerFn: Function | undefined = undefined;
    switch (req.method) {
        case 'GET':
            processerFn = getOne;
            break;
        case 'POST':
            processerFn = createOrUpdateOne;
            break;
        case 'DELETE':
            processerFn = deleteOne;
            break;
    }

    if (!processerFn) {
        res.status(405).json({ 
            success: false,
            error: 'Method not allowed' 
        });
        return;
    }

    processerFn(req, res);
}
