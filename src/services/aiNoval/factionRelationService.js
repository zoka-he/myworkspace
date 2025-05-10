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

}