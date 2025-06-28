import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class GeoStarService extends MysqlNovalService {

    constructor() {
        super('geo_star', ['id']);

        this.setValidColumns([
            'id',
            'worldview_id',
            'star_system_id',
            'name',
            'type',
            'code',
            'description',
            'described_in_llm',
            'dify_document_id',
            'dify_dataset_id'
        ]);
    }

}