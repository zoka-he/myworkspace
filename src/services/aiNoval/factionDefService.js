import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class FactionDefService extends MysqlNovalService {

    constructor() {
        super('Faction', ['id']);

        this.setValidColumns([
            'id',
            'worldview_id',
            'name',
            'description',
            'parent_id'
        ]);
    }

}