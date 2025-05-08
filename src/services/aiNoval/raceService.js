import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class RaceDefService extends MysqlNovalService {

    constructor() {
        super('Race', ['id']);

        this.setValidColumns([
            'id',
            'name',
            'description',
        ]);
    }

}