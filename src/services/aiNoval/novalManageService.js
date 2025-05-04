import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class NovalManageService extends MysqlNovalService {

    constructor() {
        super('Novel', ['id']);

        this.setValidColumns([
            'id',
            'title',
            'description',
            'create_at',
            'updated_at'
        ]);
    }

}