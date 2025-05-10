import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class RoleDefService extends MysqlNovalService {

    constructor() {
        super('role_info', ['id']);

        this.setValidColumns([
            'id',
            'role_id',
            'version_name',
            'worldview_id',
            'name_in_worldview',
            'gender_in_worldview',
            'age_in_worldview',
            'race_id',
            'faction_id',
            'root_faction_id',
            'background',
            'personality',
            'created_at',
            'updated_at'
        ]);
    }

}