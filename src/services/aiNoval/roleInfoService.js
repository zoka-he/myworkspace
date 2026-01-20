import { MysqlNovalService } from "@/src/utils/mysql/service";

export default class RoleDefService extends MysqlNovalService {

    constructor() {
        super('role_info', ['id']);

        this.setValidColumns([
            'id',
            'role_id',
            'version_name',
            'worldview_id',
            'name_in_worldview',
            'gender_in_worldview',
            'age_in_worldview',
            'race_id',
            'faction_id',
            'root_faction_id',
            'background',
            'personality',
            'created_at',
            'updated_at',
            'dify_dataset_id',
            'dify_document_id'
        ]);
    }

    async getRoleDocumentByIds(ids) {
        const document_column_def = `concat_ws('|', name_in_worldview, gender_in_worldview, f_root.name, personality, background)`;

        let sql = `
            select 
                r.id, 
                role_id, 
                name_in_worldview title, 
                gender_in_worldview gender, 
                age_in_worldview age, 
                f.name faction_name,
                f_root.name root_faction_name,
                ${document_column_def} document,
                md5(${document_column_def}) fingerprint
            from role_info r
            left join Faction f on faction_id = f.id
            left join Faction f_root on root_faction_id = f_root.id
            where r.id in(${ids.join(',')})
        `;
        return this.query(sql, [], ['id asc'], 1, ids.length);
    }

}