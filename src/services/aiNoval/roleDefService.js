import { MysqlNovalService } from "@/src/utils/mysql/service";
import _ from 'lodash';

export default class RoleDefService extends MysqlNovalService {

    constructor() {
        super('Role', ['id']);

        this.setValidColumns([
            'id',
            'name',
            'version',
            'created_at'
        ]);
    }

    getRoleDefList(params) {
        let roleConds = [];
        let roleCondVals = [];
        let roleInfoConds = [];
        let roleInfoCondVals = [];

        for (let key in params) {
            switch (key) {
                case 'id':
                    conds.push(`r.id = ?`);
                    condVals.push(params[key]);
                    break;

                case 'worldview_id':
                    roleInfoConds.push(`worldview_id = ?`);
                    roleInfoCondVals.push(_.toNumber(params[key]));
                    break;

                default:
                    break;
            }
        }

        if (params.worldview_id) {
            roleConds.push('version_count > ?');
            roleCondVals.push(0);
        }

        let sqlRoleCond = '';
        if (roleConds.length > 0) {
            sqlRoleCond = `where ${roleConds.join(' and ')}`;
        }

        let sqlRoleInfoCond = '';
        if (roleInfoConds.length > 0) {
            sqlRoleInfoCond = `where ${roleInfoConds.join(' and ')}`;
        }

        let sql = `
            select r.id, r.name, r.version, COALESCE(ri_1.version_count, 0) version_count, ri_2.version_name
            from Role r
            left join (
                select role_id, count(0) version_count from role_info ${sqlRoleInfoCond} group by role_id
            ) ri_1 on ri_1.role_id = r.id
            left join (
                select role_id, id version_id, version_name from role_info ${sqlRoleInfoCond} 
            ) ri_2 on ri_2.role_id = r.id and ri_2.version_id = r.version
            ${sqlRoleCond}
        `;

        return this.query(sql, roleInfoCondVals.concat(roleInfoCondVals).concat(roleCondVals), ['id asc'], params.page || 1, params.limit || 100);
    }

}