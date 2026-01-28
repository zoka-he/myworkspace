import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class MagicSystemVersionService extends MysqlNovalService {

    constructor() {
        super('magic_system_version', ['id']);

        this.setValidColumns([
            'id',
            'worldview_id',
            'def_id',
            'version_name',
            'content',
            'created_at',
            'updated_at',
        ]);
    }

}