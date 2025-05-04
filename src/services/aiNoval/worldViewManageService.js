import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class WorldViewManageService extends MysqlNovalService {

    constructor() {
        super('WorldView', ['id']);

        this.setValidColumns([
            'id',
            'title',
            'content',
            'is_dify_knowledge_base'
        ]);
    }

}