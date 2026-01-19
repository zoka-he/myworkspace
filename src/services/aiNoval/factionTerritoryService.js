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

}