import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class RoleRelationTypeService extends MysqlNovalService {

    constructor() {
        super('role_relation_type', ['id']);

        this.setValidColumns([
            'id',
            'label',
            'default_strength',
            'default_color'
        ]);
    }
}
