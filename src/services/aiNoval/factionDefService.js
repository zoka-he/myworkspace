import { MysqlNovalService } from "@/src/utils/mysql/service";
import _ from 'lodash';

export default class FactionDefService extends MysqlNovalService {

    constructor() {
        super('Faction', ['id']);

        this.setValidColumns([
            'id',
            'worldview_id',
            'name',
            'description',
            'parent_id',
            'embed_document',
            'faction_type',
            'faction_culture',
            'ideology_or_meme',
            'scale_of_operation',
            'decision_taboo',
            'primary_threat_model',
            'internal_contradictions',
            'legitimacy_source',
            'known_dysfunctions',
            'geo_naming_habit',
            'geo_naming_suffix',
            'geo_naming_prohibition',
        ]);
    }

    async getFactionNamesByIds(factionIds) {
        let verifiedFactionIds = factionIds.split(',').map(s => s.trim()).filter(s => s.length > 0).map(_.toNumber);
        if (verifiedFactionIds.length === 0) {
            return [];
        }
        
        let ret = await this.query({
            id: {
                $in: verifiedFactionIds
            }
        }, [], ['id asc'], 1, verifiedFactionIds.length);

        return (ret.data || []).map(r => r.name).join(',');
    }

    async getFactionDocumentByIds(ids) {
        let sql = `
            select 
                id, 
                worldview_id,
                name title, 
                embed_document document, 
                md5(embed_document) fingerprint
            from Faction
            where id in(${ids.join(',')})
        `;
        return this.query(sql, [], ['id asc'], 1, ids.length);
    }

    // 根据关键词搜索阵营信息及计算匹配度
    async getFactionMatchingByKeyword(worldviewId, keywords, extraIds = [], limit = 10) {
        if (!_.isNumber(worldviewId)) {
            return [];
        }

        if (!_.isArray(keywords)) {
            return [];
        }

        let keywordStr = keywords.map(k => `'${k}'`).join(' ');
        let extraIdsStr = extraIds.map(id => `${id}`).join(',');

        let sql_for_keyword = `
            with ranked as (
                SELECT 
                    id,
                    worldview_id,
                    name, 
                    description,
                    parent_id,
                    faction_type,
                    faction_culture,
                    ideology_or_meme,
                    scale_of_operation,
                    decision_taboo,
                    primary_threat_model,
                    internal_contradictions,
                    legitimacy_source,
                    known_dysfunctions,
                    geo_naming_habit,
                    geo_naming_suffix,
                    geo_naming_prohibition,
                    (
                        (match(name) Against(${keywordStr})) * 4 + 
                        (match(description) Against(${keywordStr})) * 2
                    ) as score
                from Faction 
                where 
                    worldview_id = ${worldviewId}
                    and 
                    match(name, description) Against(${keywordStr})
                limit ${limit}
            ) 
            select 
                ranked.*,
                score / MAX(score) OVER () AS match_percent
            from ranked
            order by score desc
        `;

        let keyword_matched =  await this.queryBySql(sql_for_keyword, []);
        let ids_matched = [];

        if (extraIdsStr.length > 0) {
            let sql_for_extra_ids = `
                with ranked as (
                    select 
                        id,
                        worldview_id,
                        name,
                        description,
                        parent_id,
                        faction_type,
                        faction_culture,
                        ideology_or_meme,
                        scale_of_operation,
                        decision_taboo,
                        primary_threat_model,
                        internal_contradictions,
                        legitimacy_source,
                        known_dysfunctions,
                        geo_naming_habit,
                        geo_naming_suffix,
                        geo_naming_prohibition,
                        (
                            (match(name) Against(${keywordStr})) * 4 + 
                            (match(description) Against(${keywordStr})) * 2
                        ) as score
                    from Faction
                    where id in(${extraIdsStr})
                )
                select 
                    ranked.*,
                    ranked.score / MAX(ranked.score) OVER () AS match_percent
                from ranked
                order by score desc
            `;

            ids_matched = await this.queryBySql(sql_for_extra_ids, []);
        }

        // 合并同类项并排序
        return _.uniqBy(_.concat(keyword_matched, ids_matched), 'id').sort((a, b) => b.score - a.score);
    }
}