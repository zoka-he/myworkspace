import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class RoleDefService extends MysqlNovalService {

    constructor() {
        super('role_relations', ['id']);

        this.setValidColumns([
            'id',
            'worldview_id',
            'role_id',
            'related_role_id',
            'relation_type',
            'relation_strength',
            'description',
            'start_timestamp',
            'end_timestamp',
            'is_active'
        ]);
    }
}
