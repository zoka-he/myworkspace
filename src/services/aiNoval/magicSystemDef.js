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

    async getFullInfoOfWorldview(worldviewId) {
        const sql = `select system_name, content from magic_system_def msd, magic_system_version msv where msd.version_id = msv.id and msd.worldview_id = ?`;
        const params = [worldviewId];
        const ret = await this.queryBySql(sql, params);
        return ret;
    }

}