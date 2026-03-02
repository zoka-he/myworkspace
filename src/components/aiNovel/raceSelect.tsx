'use client';

import { TreeSelect, TreeSelectProps } from 'antd';
import useSWR from 'swr';
import { useMemo } from 'react';
import { IRaceData } from '@/src/types/IAiNoval';
import apiCalls from '@/src/business/aiNoval/raceManage/apiCalls';

const listFetcher = async (worldViewId: number) => {
  const list = await apiCalls.getRaceList(worldViewId, 500);
  return Array.isArray(list) ? list : [];
};

export interface RaceSelectProps extends Omit<TreeSelectProps, 'treeData' | 'value' | 'onChange'> {
  worldviewId: number | null;
  value?: number | null;
  onChange?: (value: number | null) => void;
}

function buildTreeWithPath(
  items: IRaceData[],
  parentId: number | null,
  parentPath: string
): { title: string; value: number; children?: ReturnType<typeof buildTreeWithPath> }[] {
  return items
    .filter((item) => (item.parent_id ?? null) === parentId)
    .sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0))
    .map((item) => {
      const path = parentPath ? `${parentPath} / ${item.name ?? ''}` : (item.name ?? '');
      return {
        title: path,
        value: item.id!,
        children: buildTreeWithPath(items, item.id ?? null, path),
      };
    });
}

export default function RaceSelect({
  worldviewId,
  value,
  onChange,
  style,
  ...rest
}: RaceSelectProps) {
  const { data: list = [], isLoading } = useSWR<IRaceData[]>(
    worldviewId ? ['race-list', worldviewId] : null,
    () => listFetcher(worldviewId!)
  );

  const treeData = useMemo(() => {
    if (!list.length) return [];
    return buildTreeWithPath(list, null, '');
  }, [list]);

  const normalizedStyle = useMemo(() => {
    // 未传入 style 时不设置默认 width，避免覆盖 Form.Item 的 width: 100%
    if (style === undefined) {
      return undefined;
    }
    if (style.width !== undefined) {
      return style;
    }
    return { ...style, width: 200 };
  }, [style]);

  return (
    <TreeSelect
      {...rest}
      style={normalizedStyle}
      popupMatchSelectWidth={false}
      dropdownStyle={{ minWidth: 300, ...rest.dropdownStyle }}
      loading={isLoading}
      treeData={treeData}
      value={value ?? undefined}
      onChange={(v) => onChange?.(v ?? null)}
      placeholder="请选择角色种族"
      allowClear
      treeDefaultExpandAll
      showSearch
      treeNodeFilterProp="title"
    />
  );
}
