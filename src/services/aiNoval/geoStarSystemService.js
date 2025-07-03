import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class GeoStarSystemService extends MysqlNovalService {

    constructor() {
        super('geo_star_system', ['id']);

        this.setValidColumns([
            'id',
            'worldview_id',
            'name',
            'code',
            'described_in_llm',
            'dify_document_id',
            'dify_dataset_id'
        ]);
    }

}