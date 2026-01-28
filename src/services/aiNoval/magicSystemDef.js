import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class MagicSystemDefService extends MysqlNovalService {

    constructor() {
        super('magic_system_def', ['id']);

        this.setValidColumns([
            'id',
            'worldview_id',
            'system_name',
            'order_num',
            'version_id',
            'created_at',
            'updated_at',
        ]);
    }

}