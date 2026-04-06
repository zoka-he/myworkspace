import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class FactionTerritoryService extends MysqlNovalService {

    constructor() {
        super('faction_territory', ['id']);

        this.setValidColumns([
            'id',
            'worldview_id',
            'faction_id',
            'geo_code',
            'geo_type',
            'alias_name',
            'start_date',
            'end_date',
            'description',
        ]);
    }

    async queryTerritoryByCode(geoCode) {
        return this.queryBySql(
            `select 
  ft.*,
  f.name faction_name
from faction_territory ft
left join Faction f on ft.faction_id = f.id
where geo_code = ?
order by start_date desc`,
            [geoCode]
        );
    }

}