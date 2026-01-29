// 世界书条目（匹配数据库结构）
export interface IWorldBookItem {
    id?: number | null;
    worldview_id?: number | null;
    group_id?: number | null;
    summary?: string | null;
    content?: string | null;
    order?: number | null;
    created_at?: Date | string | null;
    updated_at?: Date | string | null;
}

// 世界书分组（匹配数据库结构）
export interface IWorldBookGroup {
    id?: number | null;
    worldview_id?: number | null;
    title?: string | null;
    parent_id?: number | null;
    order?: number | null;
    content?: string | null;
    created_at?: Date | string | null;
    updated_at?: Date | string | null;
}
