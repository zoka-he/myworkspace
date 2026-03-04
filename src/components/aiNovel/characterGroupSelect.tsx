'use client';

import { Select, SelectProps } from 'antd';
import useSWR from 'swr';
import { useMemo } from 'react';
import { IRoleGroup } from '@/src/types/IAiNoval';
import apiCalls from '@/src/business/aiNoval/roleGroupManage/apiCalls';

const listFetcher = async (worldViewId: number) => {
  const res = await apiCalls.getRoleGroupList(worldViewId, {
    limit: 500,
    group_status: 'active',
  });
  const data = (res as { data?: IRoleGroup[] })?.data;
  return Array.isArray(data) ? data : [];
};

export interface CharacterGroupSelectProps
  extends Omit<SelectProps<number[]>, 'options' | 'value' | 'onChange' | 'defaultValue'> {
  worldviewId: number | null;
  value?: number[] | null;
  onChange?: (value: number[] | null) => void;
}

export default function CharacterGroupSelect({
  worldviewId,
  value,
  onChange,
  style,
  ...rest
}: CharacterGroupSelectProps) {
  const { data: list = [], isLoading } = useSWR<IRoleGroup[]>(
    worldviewId ? ['role-group-list', worldviewId] : null,
    () => listFetcher(worldviewId!)
  );

  const options = useMemo(
    () =>
      list.map((item) => ({
        label: item.name || '未命名角色组',
        value: item.id!,
      })),
    [list]
  );

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
    <Select<number[]>
      {...rest}
      style={normalizedStyle}
      loading={isLoading}
      options={options}
      mode="multiple"
      value={value ?? undefined}
      onChange={(v) => onChange?.((v as unknown as number[] | undefined) ?? null)}
      placeholder="请选择角色组"
      allowClear
      showSearch
      optionFilterProp="label"
    />
  );
}
