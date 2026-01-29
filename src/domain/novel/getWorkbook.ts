import WorldRuleSnapshotService from "@/src/services/aiNoval/worldRuleSnapshotService";

const worldRuleSnapshotService = new WorldRuleSnapshotService();

export default async function getWorkbook(worldviewId: number): Promise<string> {
    const worldRuleSnapshot = await worldRuleSnapshotService.queryBySql(
        `select 
	        wrs.content 
        from world_rule_snapshot wrs, WorldView wv  
        where wv.id = ? and wrs.id = wv.worldrule_snapshot_id`,
        [worldviewId]
    );
    return worldRuleSnapshot[0]?.content || '';
}