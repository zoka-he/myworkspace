import { MysqlNovalService } from "@/src/utils/mysql/service";
import _ from 'lodash';

export default class RoleDefService extends MysqlNovalService {

    constructor() {
        super('Role', ['id']);

        this.setValidColumns([
            'id',
            'name',
            'version',
            'created_at',
            'is_enabled'
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
            // 有世界观时：显示「该世界观下至少有一个版本」或「没有任何版本」的角色（未绑定版本的角色对所有世界观可见）
            roleConds.push('(COALESCE(ri_1.version_count, 0) > ? OR COALESCE(ri_all.version_count, 0) = ?)');
            roleCondVals.push(0, 0);
        }

        let sqlRoleCond = '';
        if (roleConds.length > 0) {
            sqlRoleCond = `where ${roleConds.join(' and ')}`;
        }

        let sqlRoleInfoCond = '';
        if (roleInfoConds.length > 0) {
            sqlRoleInfoCond = `where ${roleInfoConds.join(' and ')}`;
        }

        // ri_1: 当前世界观下每个角色的版本数；ri_all: 每个角色在所有世界观下的版本总数（用于包含「未绑定版本」角色）
        let sql = `
            select r.id, r.name, r.version, r.is_enabled, COALESCE(ri_1.version_count, 0) version_count, ri_2.version_name
            from Role r
            left join (
                select role_id, count(0) version_count from role_info ${sqlRoleInfoCond} group by role_id
            ) ri_1 on ri_1.role_id = r.id
            left join (
                select role_id, count(0) version_count from role_info group by role_id
            ) ri_all on ri_all.role_id = r.id
            left join (
                select role_id, id version_id, version_name from role_info ${sqlRoleInfoCond}
            ) ri_2 on ri_2.role_id = r.id and ri_2.version_id = r.version
            ${sqlRoleCond}
        `;

        return this.query(sql, roleInfoCondVals.concat(roleInfoCondVals).concat(roleCondVals), ['id asc'], params.page || 1, params.limit || 100);
    }


    async getRoleNamesOfCurrentVersion(roleIds) {
        let verifiedRoleIds = roleIds.split(',').map(s => s.trim()).filter(s => s.length > 0).map(_.toNumber);
        if (verifiedRoleIds.length === 0) {
            return [];
        }

        let sql = `
            select 
                r.id,
                ri.name_in_worldview name
            from \`Role\` r 
            left join role_info ri on ri.role_id = r.id and ri.id = r.version 
            where r.id in(${verifiedRoleIds.join(',')})
        `;

        let ret = await this.query(sql, [], ['id asc'], 1, verifiedRoleIds.length);
        return (ret.data || []).map(r => r.name).join(',');
    }

}