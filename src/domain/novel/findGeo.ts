import GeoGeographyService from "@/src/services/aiNoval/geoGeographyService";
import GeoStarSystemService from "@/src/services/aiNoval/geoStarSystemService";
import GeoStarService from "@/src/services/aiNoval/geoStarService";
import GeoPlanetService from "@/src/services/aiNoval/geoPlanetService";
import GeoSatelliteService from "@/src/services/aiNoval/geoSatelliteService";
import EmbedService from "@/src/services/aiNoval/embedService";
import { chromaService, QueryResult } from "@/src/server/chroma";
import { distanceToSimilarity, sigmoid } from "@/src/utils/rag/scores";
import _ from 'lodash';
import { IGeoUnionData, IRoleInfo } from "@/src/types/IAiNoval";
import { rerankService } from "@/src/services/aiNoval/rerankService";

const geoGeographyService = new GeoGeographyService();
const geoStarSystemService = new GeoStarSystemService();
const geoStarService = new GeoStarService();
const geoPlanetService = new GeoPlanetService();
const geoSatelliteService = new GeoSatelliteService();
const embedService = new EmbedService();

export default async function findGeo(worldviewId: number, keywords: string[], thresholdNum: number = 0.5) {
    // 先薅一波embedding数据（取用code，去mysql连带拉取geo数据）
    let chroma_data: (QueryResult & { chroma_score?: number })[] = await findInChroma(_.toNumber(worldviewId), keywords);
    let chroma_codes = chroma_data.map(item => item.id); // chroma 中地理信息使用 code 作为 id
    chroma_data = processChromaData(chroma_data);

    // 再薅一波db数据，额外传入chroma_codes，用于拉取chroma_data所指代的数据
    let db_data_raw = await getGeoMatchingByKeyword(_.toNumber(worldviewId), keywords, chroma_codes);
    if (db_data_raw.length === 0) {
        // 大吉利是，再见
        return [];
    }

    let db_data: (IGeoUnionData & { score: number, match_percent: number, db_score: number })[] = processDbData(db_data_raw);

    let chroma_coef = 0.6;
    let db_coef = 0.4;

    // 统计数据来源，准备进行加权
    let total_count = db_data.length;
    let db_zero_count = db_data.filter(item => item.score === 0).length;
    let chroma_zero_count = db_data.length - chroma_data.length; // db_data本身就包含了chroma_data的数据，减去chroma_data的长度就得到了不是chroma的数据条数
    let cross_count = db_data.length - db_zero_count - chroma_zero_count; // 交叉数据条数

    let k = total_count;
    let overlap_ratio = cross_count / Math.min(total_count - db_zero_count, total_count - chroma_zero_count);
    let db_coverage = (total_count - db_zero_count) / k;
    let chroma_coverage = (total_count - chroma_zero_count) / k;

    // 根据交叠程度抬升chroma权重，chroma初始权重0.6时，最大可抬升到0.8
    let w_chroma = Math.min(1, chroma_coef + chroma_coef * overlap_ratio);
    if (db_zero_count === k) {
        w_chroma = 1;
    }
    let w_db = 1 - w_chroma;

    // console.debug('total_count ------------->> ', total_count);
    // console.debug('db_coverage ------------->> ', db_coverage);
    // console.debug('chroma_coverage ------------->> ', chroma_coverage);
    // console.debug('overlap_ratio ------------->> ', overlap_ratio);
    // console.debug('w_db ------------->> ', w_db);
    // console.debug('w_chroma ------------->> ', w_chroma);

    // if (Math.max(...db_data.map(item => item.score || 0)) === 0) {
    //     chroma_coef = 1;
    //     db_coef = 0;
    // }

    let combined_data = db_data.map((item) => {
        // 注意注意，这里需要将item.code转换为字符串，因为chroma_data.id是字符串（chroma龟腚！）
        let chroma_item = chroma_data.find(chroma_item => chroma_item.id === _.toString(item.code));
        let chroma_score = chroma_item?.chroma_score || 0;
        let db_score = item.db_score || 0;

        let combined_score = (chroma_score * w_chroma + db_score * w_db);

        return _.omit({
            ...item,
            chroma_score: chroma_score,
            combined_score: combined_score,
        }, ['score', 'match_percent']);
    });

    // 对 combined_data 进行 rerank 重排序
    if (combined_data.length > 0) {
        try {
            // 准备查询文本和文档数组
            const queryText = keywords.join(' ');
            const documents = combined_data.map(item => {
                // 组合 name 和 description 作为文档文本
                const name = item.name || '';
                const description = item.description || '';
                return `${name} ${description}`.trim();
            });

            // 调用 rerank 服务
            const rerankResults = await rerankService.rerank(queryText, documents);
            
            // 计算 rerank_score 的平均值，用于 sigmoid 处理
            const rerankScores = rerankResults.map(result => result.relevance_score);
            const mean_rerank_score = _.mean(rerankScores);
            
            // 根据 rerank 结果重新排序 combined_data，并对 rerank_score 进行 sigmoid 处理
            // rerankResults 返回的是按相关性排序的结果，包含 index 和 relevance_score
            const rerankedData = rerankResults.map(result => {
                const originalItem = combined_data[result.index];
                // 对 rerank_score 进行 sigmoid 处理，参考 db_score 的处理方式（斜率使用 5）
                const processed_rerank_score = sigmoid(result.relevance_score, 5, mean_rerank_score);
                return {
                    ...originalItem,
                    rerank_score: processed_rerank_score,
                };
            });

            combined_data = rerankedData;
            // console.debug('rerank completed, reranked items count:', combined_data.length);
        } catch (error) {
            console.error('rerank failed:', error);
            // 如果 rerank 失败，使用原来的排序方式
            combined_data = combined_data.map(item => {
                return {
                    ...item,
                    rerank_score: item.combined_score,
                }
            }).sort((a, b) => b.combined_score - a.combined_score);
        }
    } else {
        // 如果没有数据，直接按 combined_score 排序
        combined_data = combined_data.map(item => {
            return {
                ...item,
                rerank_score: item.combined_score,
            }
        }).sort((a, b) => b.combined_score - a.combined_score);
    }

    // let combined_data_normalized = normalizeScore(combined_data, 'combined_score', 'score').map(item => _.omit(item, ['combined_score']));


    // console.debug('threshold ------------->> ', thresholdNum);
    // res.status(200).json({ success: true, data: combined_data.sort((a, b) => b.combined_score - a.combined_score).filter(item => item.combined_score >= thresholdNum) });
    return combined_data.filter(item => item.rerank_score >= thresholdNum);
}


async function findInChroma(worldviewId: number, keywords: string[]) {
    let collectionName = 'ai_noval_geo_' + worldviewId;
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
        chroma_score: sigmoid(distanceToSimilarity(item.distance), 35, mean_score),  // 中位数初定在0.5，斜率初定在10
    }));

    ret.forEach(item => {
        // console.debug('item ------------->> ', [item.distance, distanceToSimilarity(item.distance || 0), mean_score, item.chroma_score]);
    });

    return ret;
}

function processDbData(db_data: (IGeoUnionData & { score: number, match_percent: number })[]): (IGeoUnionData & { score: number, match_percent: number, db_score: number })[] {

    let mean_score = _.mean(db_data.filter(item => item.score !== 0).map(item => item.score || 0));
    

    // console.debug('db_data ------------->> ', db_data);
    // console.debug('mean_score ------------->> ', mean_score);

    return db_data.map((item: IGeoUnionData & { score: number, match_percent: number }) => {
        let notFromDb = item.score === 0;
        let db_score = notFromDb ? 0 : sigmoid(item.score, 5, mean_score);
        return {
            ...item,
            db_score: db_score,
        }
    });
}

// 根据关键词搜索地理信息及计算匹配度
async function getGeoMatchingByKeyword(worldviewId: number, keywords: string[], extraCodes: string[] = [], limit: number = 10): Promise<(IGeoUnionData & { score: number, match_percent: number })[]> {
    if (!_.isNumber(worldviewId)) {
        return [];
    }

    if (!_.isArray(keywords)) {
        return [];
    }

    let keywordStr = keywords.map(k => `'${k}'`).join(' ');
    
    // 表配置：表名 -> data_type
    const tableConfig = [
        { name: 'geo_star_system', data_type: 'starSystem', service: geoStarSystemService },
        { name: 'geo_star', data_type: 'star', service: geoStarService },
        { name: 'geo_planet', data_type: 'planet', service: geoPlanetService },
        { name: 'geo_satellite', data_type: 'satellite', service: geoSatelliteService },
        { name: 'geo_geography_unit', data_type: 'geographyUnit', service: geoGeographyService },
    ];

    // 1. 关键词匹配查询：只查询 code 和 score（所有表字段一致，可以 UNION）
    let sql_for_keyword_parts = tableConfig.map(config => {
        return `
            select code, (match(name) Against(${keywordStr})) * 4 + (match(description) Against(${keywordStr})) as score
            from ${config.name}
            where worldview_id = ${worldviewId} and match(name, description) Against(${keywordStr})
        `;
    });

    let sql_for_keyword = `
        with ranked as (
            ${sql_for_keyword_parts.join(' union all ')}
        )
        select code, score, score / MAX(score) OVER () AS match_percent
        from ranked
        order by score desc
        limit ${limit}
    `;

    let keyword_matched = await geoGeographyService.queryBySql(sql_for_keyword, []);
    
    // 2. 合并所有 codes（关键词匹配 + extraCodes），去重
    let allCodes = _.uniq(_.concat(
        keyword_matched.map((item: any) => item.code),
        extraCodes
    ));

    if (allCodes.length === 0) {
        return [];
    }

    // 3. 建立 code -> score 映射
    let scoreMap = new Map<string, { score: number, match_percent: number }>();
    keyword_matched.forEach((item: any) => {
        scoreMap.set(item.code, { score: item.score, match_percent: item.match_percent });
    });
    extraCodes.forEach(code => {
        if (!scoreMap.has(code)) {
            scoreMap.set(code, { score: 0, match_percent: 0 });
        }
    });

    // 4. 分别查询每个表的完整数据
    let allResults: any[] = [];
    for (let config of tableConfig) {
        let codesStr = allCodes.map(code => `'${code}'`).join(',');
        let sql = `select * from ${config.name} where code in(${codesStr})`;
        let data = await geoGeographyService.queryBySql(sql, []);
        
        data.forEach((item: any) => {
            let scoreInfo = scoreMap.get(item.code) || { score: 0, match_percent: 0 };
            allResults.push({
                ...item,
                data_type: config.data_type,
                score: scoreInfo.score,
                match_percent: scoreInfo.match_percent,
            });
        });
    }

    // 5. 去重并排序（按 code 去重，保留 score 最高的）
    let resultMap = new Map<string, any>();
    allResults.forEach(item => {
        let existing = resultMap.get(item.code);
        if (!existing || item.score > existing.score) {
            resultMap.set(item.code, item);
        }
    });

    return Array.from(resultMap.values()).sort((a, b) => b.score - a.score);
}
