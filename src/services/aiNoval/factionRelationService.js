import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class FactionDefService extends MysqlNovalService {

    constructor() {
        super('faction_relation', ['id']);

        this.setValidColumns([
            'id',
            'worldview_id',
            'source_faction_id',
            'target_faction_id',
            'relation_type',
            'relation_strength',
            'description'
        ]);
    }

    getRelationByFactionId(factionId) {
        return this.queryBySql(
`SELECT 
    fr.id,
    fr.source_faction_id,
    fsrc.name source_faction_name,
    fr.target_faction_id,
    fdst.name target_faction_name, 
    fr.relation_type,
    fr.description 
FROM faction_relation fr 
left join Faction fsrc on fr.source_faction_id = fsrc.id
left join Faction fdst on fr.target_faction_id = fdst.id
WHERE source_faction_id = ? OR target_faction_id = ?`,
            [factionId, factionId]
        );
    }

}