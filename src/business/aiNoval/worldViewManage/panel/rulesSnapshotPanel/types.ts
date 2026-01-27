// 快照配置（存储选中的条目ID）
export interface ISnapshotConfig {
    selectedGroupIds: number[];
    selectedItemIds: number[];
}

// 快照数据（扩展 IWorldRuleSnapshot）
export interface ISnapshotData {
    id?: number | null;
    worldview_id?: number | null;
    title?: string | null; // 快照标题
    config?: string | null; // JSON string of ISnapshotConfig
    content?: string | null;
    created_at?: Date | string | null;
    updated_at?: Date | string | null;
}
