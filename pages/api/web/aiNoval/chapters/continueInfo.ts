import { NextApiRequest, NextApiResponse } from "next";
import ChaptersService from "@/src/services/aiNoval/chaptersService";
import RolesService from "@/src/services/aiNoval/roleDefService";
import FactionsService from "@/src/services/aiNoval/factionDefService";
import GeosService from "@/src/services/aiNoval/geoGeographyService";
import RoleGroupService from "@/src/services/aiNoval/roleGroupService";
import _ from "lodash";

const keyOfApiKey = 'DIFY_PARAGRAPH_STRIPPER_API_KEY';

interface Data {
    message?: string;
    data?: any;
}

async function handleContinueInfo(req: NextApiRequest, res: NextApiResponse<any>) {
    let chapterId = _.toNumber(req.query.chapterId);
    if (typeof chapterId !== 'number') {
        res.status(500).json({ message: 'chapterId is not a number' });
        return;
    }


    try {
        let chapter = await new ChaptersService().queryOne({ id: chapterId });
        if (!chapter) {
            res.status(500).json({ message: 'chapter not found' });
            return;
        }

        let roleNames = await new RolesService().getRoleNamesOfCurrentVersion(chapter.role_ids);
        let factionNames = await new FactionsService().getFactionNamesByIds(chapter.faction_ids);
        let geoNames = await new GeosService().getGeoNamesByIds(chapter.geo_ids);

        // 根据章节中的角色组 ID 获取角色组名称列表（逗号分隔）
        let roleGroupNames = '';
        try {
            const rawIds = (chapter as any).role_group_ids;
            let groupIds: number[] = [];

            if (Array.isArray(rawIds)) {
                groupIds = rawIds
                    .map((v) => _.toNumber(v))
                    .filter((v) => Number.isInteger(v) && v > 0);
            } else if (typeof rawIds === 'string' && rawIds.trim().length > 0) {
                groupIds = rawIds
                    .split(',')
                    .map((s: string) => s.trim())
                    .filter((s: string) => s.length > 0)
                    .map((s: string) => _.toNumber(s))
                    .filter((v) => Number.isInteger(v) && v > 0);
            } else if (typeof rawIds === 'number') {
                const n = _.toNumber(rawIds);
                if (Number.isInteger(n) && n > 0) {
                    groupIds = [n];
                }
            }

            if (groupIds.length > 0) {
                const placeholders = groupIds.map(() => '?').join(',');
                const sql = `select id, name from role_group where id in (${placeholders}) order by id asc`;
                const ret = await new RoleGroupService().queryBySql(sql, groupIds);
                const rows = (ret as any)?.data || ret || [];
                roleGroupNames = (rows as any[])
                    .map((r) => r?.name)
                    .filter((name: any) => typeof name === 'string' && name.trim().length > 0)
                    .join('，');
            }
        } catch (e) {
            console.warn('continueInfo: 获取角色组名称失败（忽略不中断）', e);
        }


        let data = {
            novel_id: chapter.novel_id,
            chapter_number: chapter.chapter_number,
            title: chapter.title,
            version: chapter.version,
            related_chapter_ids: chapter.related_chapter_ids,
            worldview_id: chapter.worldview_id,
            role_names: roleNames,
            faction_names: factionNames,
            geo_names: geoNames,
            role_group_names: roleGroupNames,
            seed_prompt: chapter.seed_prompt,
            content: chapter.content,
            actual_roles: chapter.actual_roles,
            actual_factions: chapter.actual_factions,
            actual_locations: chapter.actual_locations,
            actual_seed_prompt: chapter.actual_seed_prompt,
            attension: chapter.attension,
            chapter_style: chapter.chapter_style,
            extra_settings: chapter.extra_settings,
            // 分段纲要相关：原始骨架提示词 & 已存储的分段提示词
            skeleton_prompt: chapter.skeleton_prompt,
            actual_skeleton_prompt: chapter.actual_skeleton_prompt,
        }

        res.status(200).json(data);
    } catch (error) {
        console.error('getContinueInfo error -> ', error);
        res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
        return;
    }
}

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    let processerFn: Function | undefined = undefined;
    switch (req.method) {
        case 'GET':
            processerFn = handleContinueInfo;
            break;
    }

    if (!processerFn) {
        res.status(500).json({ message: '不支持的操作!' });
        return;
    }

    processerFn(req, res);
}