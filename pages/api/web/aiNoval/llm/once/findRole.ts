import { NextApiRequest, NextApiResponse } from "next";
import { ApiResponse } from "@/src/types/ApiResponse";
import _ from 'lodash';
import RoleInfoService from "@/src/services/aiNoval/roleInfoService";
import { chromaService, QueryResult } from "@/src/server/chroma";
import EmbedService from "@/src/services/aiNoval/embedService";
import { distanceToSimilarity, sigmoid } from "@/src/utils/rag/scores";
import { IRoleInfo } from "@/src/types/IAiNoval";

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

    let { worldviewId, keywords, threshold } = req.query;
    console.debug('req.query ------------->> ', req.query);

    // 立体防御开始

    if (!worldviewId || !keywords) {
        res.status(400).json({ success: false, error: 'oh shit! worldviewId and keywords are required' });
    }

    if (!worldviewId || worldviewId instanceof Array || !/^\d+$/.test(worldviewId)) {
        res.status(400).json({ success: false, error: 'oh shit! worldviewId must be a number' });
    }

    if (_.isString(threshold)) {
        if (!/^\d+(\.\d+)?$/.test(threshold)) {
            res.status(400).json({ success: false, error: 'oh shit! threshold must be a number' });
            return;
        }
    } else if (threshold) {
        res.status(400).json({ success: false, error: 'oh shit! threshold must be a number' });
        return;
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
        let chroma_data: (QueryResult & { chroma_score?: number })[] = await findInChroma(_.toNumber(worldviewId), keywords);
        let chroma_ids = chroma_data.map(item => item.id);
        chroma_data = processChromaData(chroma_data);

        // 再薅一波db数据，额外传入chroma_ids，用于拉取chroma_data所指代的数据
        let db_data = await roleInfoService.getRoleMatchingByKeyword(_.toNumber(worldviewId), keywords, chroma_ids);
        if (db_data.length === 0) {
            // 大吉利是，再见
            res.status(200).json({ success: true, data: [] });
            return;
        }

        db_data = processDbData(db_data);

        let chroma_coef = 0.6;
        let db_coef = 0.4;

        // 统计数据来源，准备进行加权
        let total_count = db_data.length;
        let db_zero_count = db_data.filter(item => item.score === 0).length;
        let chroma_zero_count = db_data.length - chroma_data.length; // db_data本身就包含了chroma_data的数据，减去chroma_data的长度就得到了不是chroma的数据条数
        let cross_count = db_data.length - db_zero_count - chroma_zero_count; // 交叉数据条数

        let k = 10; // topk在两侧都内定为10，如果要修改就要改动代码
        let overlap_ratio = cross_count / Math.min(total_count - db_zero_count, total_count - chroma_zero_count);
        let db_coverage = (total_count - db_zero_count) / k;
        let chroma_coverage = (total_count - chroma_zero_count) / k;

        let w_db = db_coef + db_coef * overlap_ratio;
        if (db_zero_count === k) {
            w_db = 0;
        }
        let w_chroma = 1 - w_db;

        console.debug('db_zero_count ------------->> ', db_zero_count);
        console.debug('chroma_zero_count ------------->> ', chroma_zero_count);
        console.debug('cross_count ------------->> ', cross_count);
        console.debug('w_db ------------->> ', w_db);
        console.debug('w_chroma ------------->> ', w_chroma);

        // if (Math.max(...db_data.map(item => item.score || 0)) === 0) {
        //     chroma_coef = 1;
        //     db_coef = 0;
        // }

        let combined_data = db_data.map(item => {
            // 注意注意，这里需要将item.id转换为字符串，因为chroma_data.id是字符串（chroma龟腚！）
            let chroma_item = chroma_data.find(chroma_item => chroma_item.id === _.toString(item.id));
            let chroma_score = chroma_item?.chroma_score || 0;
            let db_score = item.db_score || 0;

            let combined_score = (chroma_score * w_chroma + db_score * w_db);

            return _.omit({
                ...item,
                chroma_score: chroma_score,
                combined_score: combined_score,
            }, ['score', 'match_percent']);
        });

        // let combined_data_normalized = normalizeScore(combined_data, 'combined_score', 'score').map(item => _.omit(item, ['combined_score']));

        threshold = _.toNumber(threshold || '0.5');
        console.debug('threshold ------------->> ', threshold);
        res.status(200).json({ success: true, data: combined_data.sort((a, b) => b.combined_score - a.combined_score).filter(item => item.combined_score >= threshold) });
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

function processChromaData(chroma_data: (QueryResult & { chroma_score?: number })[]): (QueryResult & { chroma_score?: number })[] {
    let scores = chroma_data.map(item => distanceToSimilarity(item.distance || 0));
    let mean_score = _.mean(scores);
    // console.debug('scores ------------->> ', scores);
    // console.debug('mean_score ------------->> ', mean_score);

    let ret = chroma_data.map((item: QueryResult) => ({
        ...item,
        chroma_score: sigmoid(distanceToSimilarity(item.distance), 10, mean_score),  // 中位数初定在0.5，斜率初定在10
    }));

    ret.forEach(item => {
        console.debug('item ------------->> ', [item.distance, distanceToSimilarity(item.distance || 0), mean_score, item.chroma_score]);
    });

    return ret;
}

function processDbData(db_data: (IRoleInfo & { score: number })[]): (IRoleInfo & { score: number, db_score: number })[] {
    let mean_score = _.mean(db_data.map(item => item.score || 0));

    console.debug('db_data ------------->> ', db_data);
    console.debug('mean_score ------------->> ', mean_score);

    return db_data.map((item: IRoleInfo & { score: number }) => ({
        ...item,
        db_score: sigmoid(item.score, 5, mean_score),  // 中位数初定在平均值，斜率初定在10
    }));
}