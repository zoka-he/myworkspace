// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import BrainstormService from '@/src/services/aiNoval/brainstormService';
import { ApiResponse } from '@/src/types/ApiResponse';
import { IBrainstorm } from '@/src/types/IAiNoval';

type Data = ApiResponse<{ data: IBrainstorm[], count: number }>;

const service = new BrainstormService();

async function getList(req: NextApiRequest, res: NextApiResponse<Data>) {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);

    try {
        // 构建查询参数
        const params: any = {};

        if (req.query.worldview_id) {
            params.worldview_id = Number(req.query.worldview_id);
        }

        if (req.query.search) {
            params.search = String(req.query.search);
        }

        if (req.query.brainstorm_type) {
            params.brainstorm_type = String(req.query.brainstorm_type);
        }

        if (req.query.status) {
            // 支持多选状态
            const statusValue = req.query.status;
            if (Array.isArray(statusValue)) {
                params.status = statusValue.map(s => String(s));
            } else {
                params.status = String(statusValue);
            }
        }

        if (req.query.priority) {
            params.priority = String(req.query.priority);
        }

        if (req.query.category) {
            params.category = String(req.query.category);
        }

        if (req.query.parent_id !== undefined) {
            if (req.query.parent_id === 'null' || req.query.parent_id === '') {
                params.parent_id = null;
            } else {
                params.parent_id = Number(req.query.parent_id);
            }
        }

        const result = await service.getBrainstormList(params, page, limit);

        // 解析 JSON 字段
        if (result.data) {
            result.data = result.data.map((item: any) => {
                if (typeof item.tags === 'string') {
                    item.tags = JSON.parse(item.tags);
                }
                if (typeof item.analysis_result === 'string') {
                    item.analysis_result = JSON.parse(item.analysis_result);
                }
                if (typeof item.related_faction_ids === 'string') {
                    item.related_faction_ids = JSON.parse(item.related_faction_ids);
                }
                if (typeof item.related_role_ids === 'string') {
                    item.related_role_ids = JSON.parse(item.related_role_ids);
                }
                if (typeof item.related_geo_codes === 'string') {
                    item.related_geo_codes = JSON.parse(item.related_geo_codes);
                }
                if (typeof item.related_event_ids === 'string') {
                    item.related_event_ids = JSON.parse(item.related_event_ids);
                }
                if (typeof item.related_chapter_ids === 'string') {
                    item.related_chapter_ids = JSON.parse(item.related_chapter_ids);
                }
                if (typeof item.related_world_state_ids === 'string') {
                    item.related_world_state_ids = JSON.parse(item.related_world_state_ids);
                }
                return item;
            });
        }

        res.status(200).json({
            success: true,
            data: {
                data: result.data || [],
                count: result.count || 0
            }
        });
    } catch (error: any) {
        console.error('[Brainstorm API] List error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get brainstorm list'
        });
    }
}

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    if (req.method !== 'GET') {
        res.status(405).json({
            success: false,
            error: 'Method not allowed, only GET method is allowed'
        });
        return;
    }

    getList(req, res);
}
