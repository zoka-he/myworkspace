import { MysqlNovalService } from "@/src/utils/mysql/service";
import _ from 'lodash';

export default class FactionDefService extends MysqlNovalService {

    constructor() {
        super('Faction', ['id']);

        this.setValidColumns([
            'id',
            'worldview_id',
            'name',
            'description',
            'parent_id',
            'embed_document',
        ]);
    }

    async getFactionNamesByIds(factionIds) {
        let verifiedFactionIds = factionIds.split(',').map(s => s.trim()).filter(s => s.length > 0).map(_.toNumber);
        if (verifiedFactionIds.length === 0) {
            return [];
        }
        
        let ret = await this.query({
            id: {
                $in: verifiedFactionIds
            }
        }, [], ['id asc'], 1, verifiedFactionIds.length);

        return (ret.data || []).map(r => r.name).join(',');
    }

    async getFactionDocumentByIds(ids) {
        let sql = `
            select 
                id, 
                worldview_id,
                name title, 
                embed_document document, 
                md5(embed_document) fingerprint
            from Faction
            where id in(${ids.join(',')})
        `;
        return this.query(sql, [], ['id asc'], 1, ids.length);
    }
}