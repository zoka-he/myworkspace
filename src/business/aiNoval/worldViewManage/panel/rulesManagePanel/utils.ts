import { IWorldBookGroup, IWorldBookItem } from './types';

// 根据ID查找条目
export function findItemById(groups: IWorldBookGroup[], id: number): { item: IWorldBookItem; group: IWorldBookGroup } | null {
    for (const group of groups) {
        const item = group.items.find(i => i.id === id);
        if (item) {
            return { item, group };
        }
    }
    return null;
}

// 根据ID查找分组
export function findGroupById(groups: IWorldBookGroup[], id: number): IWorldBookGroup | null {
    return groups.find(g => g.id === id) || null;
}
