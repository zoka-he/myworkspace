import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class FactionDefService extends MysqlNovalService {

    constructor() {
        super('timeline_events', ['id']);

        this.setValidColumns([
            'id',
            'title',
            'description',
            'date',
            'location',
            'faction_ids',
            'role_ids',
            'story_line_id',
            'worldview_id',
            'state'
        ]);
    }

    async getEventDocumentByIds(ids) {
        let document_column_def = `concat_ws('|', title, te.description, group_concat(distinct gp.name), group_concat(distinct gs.name), group_concat(distinct ggu.name))`;
        let location_column_def = `concat_ws('|', group_concat(distinct gp.name), group_concat(distinct gs.name), group_concat(distinct ggu.name))`;

        let sql = `
            SELECT 
                te.id,
                te.worldview_id,
                title, 
                ${document_column_def} document, 
                md5(${document_column_def}) fingerprint,
                date seconds_of_date,
                ${location_column_def} location,
                te.state
            from timeline_events te 
            LEFT JOIN Faction tf ON FIND_IN_SET(tf.id, te.faction_ids) > 0
            LEFT JOIN geo_planet gp ON te.location=gp.code COLLATE utf8mb4_unicode_ci
            LEFT JOIN geo_satellite gs on te.location=gs.code COLLATE utf8mb4_unicode_ci
            LEFT JOIN geo_geography_unit ggu on te.location=ggu.code COLLATE utf8mb4_unicode_ci
            where te.id in(${ids.join(',')})
            group by te.id, gp.name, gs.name, ggu.name
        `;
        return this.query(sql, [], ['id asc'], 1, ids.length);
    }

}

