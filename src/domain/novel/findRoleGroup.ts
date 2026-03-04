import RoleGroupService from '@/src/services/aiNoval/roleGroupService';
import RoleInfoService from '@/src/services/aiNoval/roleInfoService';
import RoleGroupMemberService from '@/src/services/aiNoval/roleGroupMemberService';
import { IRoleGroup } from '@/src/types/IAiNoval';
import _ from 'lodash';

const roleGroupService = new RoleGroupService();
const roleInfoService = new RoleInfoService();
const roleGroupMemberService = new RoleGroupMemberService();

export interface FindRoleGroupOptions {
  page?: number;
  limit?: number;
  group_status?: string;
  /** 可选：按角色名称（模糊匹配）筛选，只返回包含该角色的角色组 */
  role_name?: string | null;
}

export interface FindRoleGroupResult {
  data: IRoleGroup[];
  count: number;
}

async function attachMembersToGroups(groups: IRoleGroup[]): Promise<IRoleGroup[]> {
  if (!groups.length) return groups;

  const groupIds = _.uniq(
    groups
      .map((g) => (g.id != null ? _.toNumber(g.id) : null))
      .filter((id): id is number => Number.isInteger(id) && id > 0)
  );

  if (!groupIds.length) return groups;

  const members = await roleGroupMemberService.listByRoleGroupIds(groupIds);

  return groups.map((g) => {
    const gid = g.id != null ? _.toNumber(g.id) : null;
    const groupMembers = gid
      ? members.filter((m: any) => _.toNumber(m.role_group_id) === gid)
      : [];
    return {
      ...g,
      members: groupMembers,
    };
  });
}

/**
 * 在指定世界观下查询角色组列表，支持分页和按状态筛选。
 * 若传入 role_name，则先按名称在 role_info 中模糊搜索，再通过 role_group_member 反查所属角色组。
 */
export default async function findRoleGroup(
  worldviewId: number,
  opts: FindRoleGroupOptions = {}
): Promise<FindRoleGroupResult> {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 100;
  const group_status = opts.group_status || undefined;
  const roleName = (opts.role_name || '').trim();

  // 未指定角色名：走原有按 worldview 直接列出角色组的逻辑
  if (!roleName) {
    const result = await roleGroupService.listByWorldview(_.toNumber(worldviewId), {
      page,
      limit,
      group_status,
    });
    const baseData = (result as { data?: IRoleGroup[] }).data ?? [];
    const dataWithMembers = await attachMembersToGroups(baseData);
    return {
      data: dataWithMembers,
      count: (result as { count?: number }).count ?? 0,
    };
  }

  // 1. 按角色名称在 role_info 表中模糊查询
  const roleCond: Record<string, any> = {
    worldview_id: _.toNumber(worldviewId),
    name_in_worldview: { $like: `%${roleName}%` },
  };

  const roleQueryResult = await roleInfoService.query(roleCond, [], ['id asc'], 1, 500, true);
  const roleRows = (roleQueryResult as { data?: Array<{ id: number | null }> }).data ?? [];
  const roleInfoIds = _.uniq(
    roleRows
      .map((r) => (r.id != null ? _.toNumber(r.id) : null))
      .filter((id): id is number => Number.isInteger(id) && id > 0)
  );

  if (roleInfoIds.length === 0) {
    return { data: [], count: 0 };
  }

  // 2. 通过 role_group_member 反查这些角色所在的角色组
  const memberCond: Record<string, any> = {
    role_info_id: roleInfoIds,
  };
  const memberQueryResult = await roleGroupMemberService.query(
    memberCond,
    [],
    ['role_group_id asc'],
    1,
    10000,
    true
  );
  const memberRows =
    (memberQueryResult as { data?: Array<{ role_group_id: number | null }> }).data ?? [];
  const groupIds = _.uniq(
    memberRows
      .map((m) => (m.role_group_id != null ? _.toNumber(m.role_group_id) : null))
      .filter((id): id is number => Number.isInteger(id) && id > 0)
  );

  if (groupIds.length === 0) {
    return { data: [], count: 0 };
  }

  // 3. 按角色组 ID + worldview + 状态，再做分页查询角色组
  const groupCond: Record<string, any> = {
    worldview_id: _.toNumber(worldviewId),
    id: groupIds,
  };
  if (group_status) {
    groupCond.group_status = group_status;
  }

  const groupResult = await roleGroupService.query(groupCond, [], ['sort_order asc', 'id asc'], page, limit);
  const baseGroups = (groupResult as { data?: (IRoleGroup | null | undefined)[] }).data
    ?.filter((g): g is IRoleGroup => !!g && g.id != null) ?? [];
  const dataWithMembers = await attachMembersToGroups(baseGroups);
  return {
    data: dataWithMembers,
    count: (groupResult as { count?: number }).count ?? 0,
  };
}
