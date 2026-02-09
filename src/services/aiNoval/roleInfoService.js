import { MysqlNovalService } from "@/src/utils/mysql/service";
import _ from 'lodash';

export default class RoleDefService extends MysqlNovalService {

    constructor() {
        super('role_info', ['id']);

        this.setValidColumns([
            'id',
            'role_id',
            'version_name',
            'worldview_id',
            'name_in_worldview',
            'gender_in_worldview',
            'age_in_worldview',
            'race_id',
            'faction_id',
            'root_faction_id',
            'background',
            'personality',
            'created_at',
            'updated_at',
            'dify_dataset_id',
            'dify_document_id',
            'fingerprint',
            'match_percent',
            'score',
            'embed_document',
            'is_enabled',
        ]);
    }

    async getRoleDocumentByIds(ids) {
        // const document_column_def = `concat_ws('|', name_in_worldview, gender_in_worldview, f_root.name, personality, background)`;
        // 使用 embed_document 字段作为文档内容
        const document_column_def = 'r.embed_document';

        let sql = `
            select 
                r.id, 
                r.worldview_id,
                role_id, 
                name_in_worldview title, 
                gender_in_worldview gender, 
                age_in_worldview age, 
                f.name faction_name,
                f_root.name root_faction_name,
                ${document_column_def} document,
                md5(${document_column_def}) fingerprint
            from role_info r
            left join Faction f on faction_id = f.id
            left join Faction f_root on root_faction_id = f_root.id
            where r.id in(${ids.join(',')})
        `;
        let ret = await this.queryBySql(sql, []);
        console.debug('getRoleDocumentByIds ret ----------------> ', ret);
        return ret;
    }

    // 根据关键词搜索角色信息及计算匹配度
    async getRoleMatchingByKeyword(worldviewId, keywords, extraIds = [], limit = 10) {
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
                    role_id,
                    version_name,
                    is_enabled,
                    name_in_worldview, 
                    gender_in_worldview,
                    age_in_worldview,
                    race_id,
                    faction_id,
                    root_faction_id,
                    background,
                    personality,
                    (
                        (match(name_in_worldview) Against(${keywordStr})) * 4 + 
                        (match(personality) Against(${keywordStr})) * 2 + 
                        (match(background) Against(${keywordStr}))
                    ) as score
                from role_info 
                where 
                    worldview_id = ${worldviewId}
                    and 
                    match(name_in_worldview, personality, background) Against(${keywordStr})
                limit ${limit}
            ) 
            select 
                r.id,
                r.version,
                ranked.*,
                score / MAX(score) OVER () AS match_percent
            from ranked, \`Role\` r 
            where r.id=ranked.role_id and r.version=ranked.id
            order by score desc
        `;

        let keyword_matched =  await this.queryBySql(sql_for_keyword, []);
        let ids_matched = [];

        if (extraIdsStr.length > 0) {
            let sql_for_extra_ids = `
                with ranked as (
                    select 
                        id,
                        is_enabled,
                        name_in_worldview,
                        background,
                        personality,
                        (
                            (match(name_in_worldview) Against(${keywordStr})) * 4 + 
                            (match(personality) Against(${keywordStr})) * 2 + 
                            (match(background) Against(${keywordStr}))
                        ) as score
                    from role_info
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