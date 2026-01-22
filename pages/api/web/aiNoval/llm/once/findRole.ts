import { NextApiRequest, NextApiResponse } from "next";
import { ApiResponse } from "@/src/types/ApiResponse";
import _ from 'lodash';
import RoleInfoService from "@/src/services/aiNoval/roleInfoService";
import { chromaService } from "@/src/server/chroma";
import EmbedService from "@/src/services/aiNoval/embedService";

const roleInfoService = new RoleInfoService();
const embedService = new EmbedService();

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse>
) {
    if (req.method !== 'GET') {
        res.status(405).json({ success: false, error: 'only GET method is allowed' });
        return;
    }

    let { worldviewId, keywords } = req.query;

    // 立体防御开始

    if (!worldviewId || !keywords) {
        res.status(400).json({ success: false, error: 'oh shit! worldviewId and keywords are required' });
    }

    if (!worldviewId || worldviewId instanceof Array || !/^\d+$/.test(worldviewId)) {
        res.status(400).json({ success: false, error: 'oh shit! worldviewId must be a number' });
    }

    if (!keywords || (!_.isArray(keywords) && !_.isString(keywords))) {
        // console.debug('keywords ------------->> ', keywords);
        res.status(400).json({ success: false, error: 'oh shit! keywords must be an array of strings' });
        return;
    }

    if (_.isString(keywords)) {
        keywords = [keywords];
    }

    // 立体防御结束

    // 业务逻辑开始

    try {
        // 先薅一波embedding数据（取用id，去mysql连带拉取role_info数据）
        let chroma_data = await findInChroma(_.toNumber(worldviewId), keywords);
        let chroma_ids = chroma_data.map(item => item.id);
        console.debug('chroma_data ------------->> ', chroma_data);

        // 再薅一波db数据，额外传入chroma_ids，用于拉取chroma_data所指代的数据
        let db_data = await roleInfoService.getRoleMatchingByKeyword(_.toNumber(worldviewId), keywords, chroma_ids);
        // console.debug('db_data ------------->> ', db_data);

        /**
         * 将距离转换为 0~1 的相似度分数
         * Chroma 通常使用余弦距离（0~2），0 表示完全相同，2 表示完全不同
         * 转换为相似度：1.0 表示完全相同，0.0 表示完全不同
         */
        function distanceToSimilarity(distance: number): number {
            // 对于余弦距离（0~2 范围），使用 1 - distance/2
            // 对于 L2 距离，使用 1 / (1 + distance)
            // 这里假设是余弦距离，如果实际是 L2 距离，可以改为 1 / (1 + distance)
            const similarity = Math.max(0, Math.min(1, 1 - distance / 2));
            return similarity;
        }

        let min_combined_score = 1;
        let max_combined_score = 0;

        let combined_data = db_data.map(item => {
            // 注意注意，这里需要将item.id转换为字符串，因为chroma_data.id是字符串（chroma龟腚！）
            let chroma_item = chroma_data.find(chroma_item => chroma_item.id === _.toString(item.id));
            let chroma_score = 0;
            if (chroma_item) {
                // 将距离转换为 0~1 的相似度分数
                chroma_score = distanceToSimilarity(chroma_item.distance);
                console.debug('chroma_score ------------->> ', chroma_score);
            }

            let combined_score = (chroma_score * 0.6 + item.match_percent * 0.4);
            if (combined_score < min_combined_score) {
                min_combined_score = combined_score;
            }
            if (combined_score > max_combined_score) {
                max_combined_score = combined_score;
            }

            return _.omit({
                ...item,
                chroma_score: chroma_score,
                db_score: item.match_percent,
                combined_score: combined_score,
            }, ['score', 'match_percent']);
        });

        let combined_data_normalized = combined_data.map(item => {
            return _.omit({
                ...item,
                score: (item.combined_score - min_combined_score) / (max_combined_score - min_combined_score),
            }, ['combined_score']);
        });

        res.status(200).json({ success: true, data: combined_data_normalized.sort((a, b) => b.score - a.score) });
        return;
    } catch (error) {
        res.status(500).json({ success: false, error: 'oh shit! ' + error });
        return;
    }

    // 业务逻辑结束
}

async function findInChroma(worldviewId: number, keywords: string[]) {
    let collectionName = 'ai_noval_roles_' + worldviewId;
    const queryEmbedding = await embedService.embedQuery(keywords.join(' '));
    // console.debug('queryEmbedding ------------->> ', queryEmbedding);
    const results = await chromaService.similaritySearch(
        collectionName,
        queryEmbedding,
        10
        // 不传递 where 参数，因为它是可选的
    );
    // console.debug('results ------------->> ', results);
    return results;
}