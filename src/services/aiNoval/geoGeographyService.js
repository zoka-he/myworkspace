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
            'described_in_llm',
            'dify_document_id',
            'dify_dataset_id',
            'area_coef',
            'children_area_coef',
            'has_geo_area',
            'embed_document',
        ]);
    }

    async getGeoNamesByIds(geoIds) {
        const tables = ['geo_star_system', 'geo_star', 'geo_planet', 'geo_satellite', 'geo_geography_unit'];
        const columns = (tableName) => ['name'];
        let data = await this.getGeoInfoByIds(geoIds, tables, columns);
        // 确保 data 是数组，如果不是则返回空数组
        if (!Array.isArray(data)) {
            return '';
        }
        return data.map(r => r.name).join(',');
    }

    async getGeoInfoByIds(geoIds, tables, columns) {
        if (!geoIds) {
            return [];
        }

        geoIds = _.uniq(String(geoIds).split(',').map(s => s.trim()).filter(s => s.length > 0).map(s => `'${s}'`)).join(',');

        if (geoIds.length === 0) {
            return [];
        }

        
        let sql = tables.map(tableName => {
            return `select ${columns(tableName).join(',')} from ${tableName} WHERE code in(${geoIds})`;
        }).join(' union ');

        let ret = await this.query(sql, [], ['name asc'], 1, geoIds.split(',').length * 5);

        // 确保返回数组，即使 ret.data 不存在或不是数组
        return Array.isArray(ret?.data) ? ret.data : [];
    }

    // 获取某个地理单元的最大code
    async getMaxCode(prefix) {
        if (!prefix) {
            return '';
        }

        let tables = ['geo_star_system', 'geo_star', 'geo_planet', 'geo_satellite', 'geo_geography_unit'];
        let subSqls = (table) => `select max(code) code from ${table} where code like '${prefix}%'`

        let sql = `
            select max(t_union.code) code from (${tables.map(subSqls).join(' union ')}) t_union
        `;

        let ret = await this.queryBySql(sql, []);
        console.debug(ret);

        if (ret.length > 0) {
            return ret[0].code;
        }

        return '';
    }

}