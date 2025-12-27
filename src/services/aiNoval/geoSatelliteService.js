import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class GeoSalliteService extends MysqlNovalService {

    constructor() {
        super('geo_satellite', ['id']);

        this.setValidColumns([
            'id',
            'worldview_id',
            'star_system_id',
            'planet_id',
            'name',
            'code',
            'description',
            'described_in_llm',
            'dify_document_id',
            'dify_dataset_id',
            'area_coef',
            'children_area_coef',
            'has_geo_area'
        ]);
    }

}