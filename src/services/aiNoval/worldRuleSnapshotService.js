import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class WorldRuleSnapshotService extends MysqlNovalService {

    constructor() {
        super('world_rule_snapshot', ['id']);

        this.setValidColumns([
            'id',
            'worldview_id',
            'title',
            'config',
            'content',
            'created_at',
            'updated_at'
        ])
    }
}