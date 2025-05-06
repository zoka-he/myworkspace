import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class GeoGeographyService extends MysqlNovalService {

    constructor() {
        super('geo_geography_unit', ['id']);

        this.setValidColumns([
            'id',
            'worldview_id',
            'star_system_id',
            'name',
            'code',
            'type',
            'parent_type',
            'parent_id',
            'planet_id',
            'satellite_id',
            'description',
            'described_in_llm'
        ]);
    }

}