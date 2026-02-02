import _ from 'lodash';
import FactionDefService from "@/src/services/aiNoval/factionDefService";
import { chromaService, QueryResult } from "@/src/server/chroma";
import EmbedService from "@/src/services/aiNoval/embedService";
import { rerankService } from "@/src/services/aiNoval/rerankService";
import { distanceToSimilarity, sigmoid } from "@/src/utils/rag/scores";
import { IFactionDefData, IFactionRelation } from "@/src/types/IAiNoval";
import FactionRelationService from "@/src/services/aiNoval/factionRelationService";

const factionDefService = new FactionDefService();
const factionRelationService = new FactionRelationService();
const embedService = new EmbedService();

export default async function findFaction(worldviewId: number, keywords: string[], thresholdNum: number = 0.5) {
    // 先薅一波embedding数据（取用id，去mysql连带拉取faction数据）
    let chroma_data: (QueryResult & { chroma_score?: number })[] = await findInChroma(_.toNumber(worldviewId), keywords);
    let chroma_ids = chroma_data.map(item => item.id);
    chroma_data = processChromaData(chroma_data);

    // 再薅一波db数据，额外传入chroma_ids，用于拉取chroma_data所指代的数据
    let db_data = await factionDefService.getFactionMatchingByKeyword(_.toNumber(worldviewId), keywords, chroma_ids);
    if (db_data.length === 0) {
        // 大吉利是，再见
        return [];
    }

    db_data = processDbData(db_data);

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

    // 根据交叠程度抬升db权重，db初始权重0.4时，最大可抬升到0.8
    let w_chroma = Math.min(chroma_coef + chroma_coef * overlap_ratio, 0.8);
    if (db_zero_count === k) {
        w_chroma = 0;
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

    let combined_data: (IFactionDefData & { score: number, db_score: number })[] = db_data.map(
        (item: IFactionDefData & { score: number, db_score: number }) => {
            // 注意注意，这里需要将item.id转换为字符串，因为chroma_data.id是字符串（chroma龟腚！）
            let chroma_item = chroma_data.find(chroma_item => chroma_item.id === _.toString(item.id));
            let chroma_score = chroma_item?.chroma_score || 0;
            let db_score = item.db_score || 0;

            let combined_score = (chroma_score * w_chroma + db_score * w_db);

            return _.omit({
                ...item,
                chroma_score: chroma_score,
                combined_score: combined_score,
            }, 
            ['score', 'match_percent']) as IFactionDefData & { score: number, db_score: number };
        }
    );

    // let combined_data_normalized = normalizeScore(combined_data, 'combined_score', 'score').map(item => _.omit(item, ['combined_score']));
    let rerank_data = await rerankData(combined_data, keywords as string[]);

    // 为每个Faction加载并添加阵营关系列表
    let final_data = await loadFactionRelations(rerank_data, _.toNumber(worldviewId));

    // console.debug('threshold ------------->> ', thresholdNum);
    return final_data.filter(item => item.score >= thresholdNum);
}


async function findInChroma(worldviewId: number, keywords: string[]) {
    let collectionName = 'ai_noval_factions_' + worldviewId;
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
        // console.debug('item ------------->> ', [item.distance, distanceToSimilarity(item.distance || 0), mean_score, item.chroma_score]);
    });

    return ret;
}

function processDbData(db_data: (IFactionDefData & { score: number })[]): (IFactionDefData & { score: number, db_score: number })[] {
    let mean_score = _.mean(db_data.map(item => item.score || 0));
    

    // console.debug('db_data ------------->> ', db_data);
    // console.debug('mean_score ------------->> ', mean_score);

    return db_data.map((item: IFactionDefData & { score: number }) => {
        let notFromDb = item.score === 0;
        let db_score = notFromDb ? 0 : sigmoid(item.score, 5, mean_score);
        return {
            ...item,
            db_score: db_score,
        }
    });
}

async function rerankData(
    data: (IFactionDefData & { combined_score?: number; db_score: number })[],
    keywords: string[]
): Promise<(IFactionDefData & { score: number; db_score: number })[]> {
    if (data.length === 0) {
        return [];
    }
    try {
        const queryText = keywords.join(' ');
        const documents = data.map((item) => {
            const name = item.name || '';
            const description = item.description || '';
            return `${name} ${description}`.trim() || '无';
        });

        const rerankResults = await rerankService.rerank(queryText, documents);
        const rerankScores = rerankResults.map((r) => r.relevance_score);
        const meanRerankScore = _.mean(rerankScores);

        const reranked = rerankResults.map((result) => {
            const original = data[result.index];
            const processedRerankScore = sigmoid(result.relevance_score, 5, meanRerankScore);
            return {
                ...original,
                score: processedRerankScore,
                db_score: original.db_score,
            };
        });
        // console.debug('rerank completed, reranked items count:', reranked.length);
        return reranked;
    } catch (error) {
        console.error('rerank failed:', error);
        return data
            .map((item) => ({
                ...item,
                score: item.combined_score ?? 0,
                db_score: item.db_score,
            }))
            .sort((a, b) => b.score - a.score);
    }
}

/**
 * 为每个Faction加载并添加阵营关系列表
 */
async function loadFactionRelations(
    factions: (IFactionDefData & { score: number; db_score: number })[],
    worldviewId: number
): Promise<(IFactionDefData & { score: number; db_score: number; relations?: IFactionRelation[] })[]> {
    if (factions.length === 0) {
        return [];
    }

    try {
        // 批量加载所有faction的关系
        const factionIds = factions.map(f => f.id).filter((id): id is number => id !== null && id !== undefined);
        
        if (factionIds.length === 0) {
            return factions.map(f => ({ ...f, relations: [] }));
        }

        // 为每个faction加载关系
        const relationsPromises = factionIds.map(async (factionId) => {
            try {
                const relations = await factionRelationService.getRelationByFactionId(factionId);
                // 转换数据格式，确保符合IFactionRelation接口
                return {
                    factionId,
                    relations: (relations || []).map((rel: any) => ({
                        id: rel.id,
                        worldview_id: rel.worldview_id || worldviewId,
                        source_faction_id: rel.source_faction_id,
                        source_faction_name: rel.source_faction_name,
                        target_faction_id: rel.target_faction_id,
                        target_faction_name: rel.target_faction_name,
                        relation_type: rel.relation_type,
                        // relation_strength: rel.relation_strength || 50, // 默认值
                        description: rel.description || '',
                    } as IFactionRelation))
                };
            } catch (error) {
                console.error(`Failed to load relations for faction ${factionId}:`, error);
                return { factionId, relations: [] };
            }
        });

        const relationsResults = await Promise.all(relationsPromises);
        const relationsMap = new Map<number, IFactionRelation[]>();
        relationsResults.forEach(result => {
            relationsMap.set(result.factionId, result.relations);
        });

        // 将关系添加到对应的faction对象中
        return factions.map(faction => ({
            ...faction,
            relations: faction.id ? (relationsMap.get(faction.id) || []) : []
        }));
    } catch (error) {
        console.error('Failed to load faction relations:', error);
        // 如果加载失败，返回原始数据，relations字段为空数组
        return factions.map(f => ({ ...f, relations: [] }));
    }
}
