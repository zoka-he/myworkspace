import { MysqlNovalService } from "@/src/utils/mysql/service";
import _ from 'lodash';

export default class RoleGroupMemberService extends MysqlNovalService {

    constructor() {
        super('role_group_member', ['id']);

        this.setValidColumns([
            'id',
            'role_group_id',
            'role_info_id',
            'sort_order',
            'role_in_group',
            'notes_with_others',
        ]);
    }

    /**
     * 按角色组 ID 查询成员列表（含 role_info 名称）
     */
    async listByRoleGroupId(roleGroupId) {
        const sql = `
            select m.id, m.role_group_id, m.role_info_id, m.sort_order, m.role_in_group, m.notes_with_others,
                   ri.name_in_worldview
            from role_group_member m
            left join role_info ri on ri.id = m.role_info_id
            where m.role_group_id = ?
            order by m.sort_order asc, m.id asc
        `;
        const ret = await this.queryBySql(sql, [_.toNumber(roleGroupId)]);
        return ret?.data || ret || [];
    }

    /**
     * 删除某角色组下全部成员
     */
    async deleteByRoleGroupId(roleGroupId) {
        const sql = `delete from role_group_member where role_group_id = ?`;
        return this.queryBySql(sql, [_.toNumber(roleGroupId)]);
    }

    /**
     * 批量插入成员（先删后插时用）
     */
    async insertMembers(roleGroupId, members) {
        if (!members || members.length === 0) return;
        for (let i = 0; i < members.length; i++) {
            const m = members[i];
            await this.insertOne({
                role_group_id: roleGroupId,
                role_info_id: m.role_info_id,
                sort_order: m.sort_order != null ? m.sort_order : i,
                role_in_group: m.role_in_group || null,
                notes_with_others: m.notes_with_others || null,
            });
        }
    }
}
