import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class GeoPlanetService extends MysqlNovalService {

    constructor() {
        super('geo_planet', ['id']);

        this.setValidColumns([
            'id',
            'worldview_id',
            'star_system_id',
            'name',
            'code',
            'description',
            'described_in_llm',
            'dify_document_id',
            'dify_dataset_id'
        ]);
    }

}