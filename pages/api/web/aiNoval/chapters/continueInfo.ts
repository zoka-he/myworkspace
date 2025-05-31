import { NextApiRequest, NextApiResponse } from "next";
import ChaptersService from "@/src/services/aiNoval/chaptersService";
import RolesService from "@/src/services/aiNoval/roleDefService";
import FactionsService from "@/src/services/aiNoval/factionDefService";
import GeosService from "@/src/services/aiNoval/geoGeographyService";
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
            seed_prompt: chapter.seed_prompt,
            content: chapter.content,
            actual_roles: chapter.actual_roles,
            actual_factions: chapter.actual_factions,
            actual_locations: chapter.actual_locations,
            actual_seed_prompt: chapter.actual_seed_prompt,
            attension: chapter.attension,
            extra_settings: chapter.extra_settings
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