import { MysqlNovalService } from "@/src/utils/mysql/service";
import _ from 'lodash';

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

    async getGeoNamesByIds(geoIds) {
        if (!geoIds) {
            return '';
        }

        
        geoIds = _.uniq(String(geoIds).split(',').map(s => s.trim()).filter(s => s.length > 0).map(s => `'${s}'`)).join(',');

        if (geoIds.length === 0) {
            return '';
        }

        let sql = `
            select gss.name name from geo_star_system gss WHERE code in(${geoIds})
            union
            select gs.name name from geo_star gs WHERE code in(${geoIds}) 
            union
            select gp.name name from geo_planet gp WHERE code in(${geoIds}) 
            union
            select gs.name name from geo_satellite gs WHERE code in(${geoIds}) 
            union
            select ggu.name name from geo_geography_unit ggu WHERE code in(${geoIds})
        `;

        let ret = await this.query(sql, [], ['name asc'], 1, geoIds.split(',').length * 5);

        console.info('getGeoNamesByIds ----------------> ', ret.data);

        return ret.data.map(r => r.name).join(',');
    }

}