'use client';

import { TreeSelect, TreeSelectProps } from 'antd';
import useSWR from 'swr';
import { useMemo } from 'react';
import type {
  IGeoGeographyUnitData,
  IGeoPlanetData,
  IGeoSatelliteData,
  IGeoStarData,
  IGeoStarSystemData,
} from '@/src/types/IAiNoval';
import { loadGeoTree, type IGeoTreeItem } from '@/src/business/aiNoval/common/geoDataUtil';

export type GeoSelectGeoTreeNode = IGeoTreeItem<
  IGeoStarSystemData | IGeoStarData | IGeoPlanetData | IGeoSatelliteData | IGeoGeographyUnitData
>;

type GeoTreeNode = GeoSelectGeoTreeNode;

const treeFetcher = async (worldViewId: number) => {
  return loadGeoTree(worldViewId);
};

export interface GeoSelectProps extends Omit<TreeSelectProps, 'treeData' | 'value' | 'onChange'> {
  worldviewId: number | null;
  /** 选中项为地点 `code`（非 id） */
  value?: string | null;
  onChange?: (value: string | null) => void;
  /** 传入后不再发起 SWR 请求，直接使用该树（与 loadGeoTree 返回值结构一致） */
  geoTree?: GeoTreeNode[];
}

interface GeoSelectTreeNode {
  title: string;
  value: string;
  children?: GeoSelectTreeNode[];
}

function mapGeoTreeToSelectData(nodes: GeoTreeNode[]): GeoSelectTreeNode[] {
  return nodes
    .filter((node) => {
      const code = node.data?.code;
      return code != null && String(code).trim() !== '';
    })
    .map((node) => {
      const code = String(node.data.code);
      const title = node.title?.toString() ?? '';
      const rawChildren = node.children as GeoTreeNode[] | undefined;
      const childNodes: GeoSelectTreeNode[] | undefined =
        rawChildren?.length ? mapGeoTreeToSelectData(rawChildren) : undefined;
      return {
        title,
        value: code,
        children: childNodes?.length ? childNodes : undefined,
      };
    });
}

export default function GeoSelect({
  worldviewId,
  value,
  onChange,
  style,
  geoTree: geoTreeFromProps,
  loading: loadingProp,
  ...rest
}: GeoSelectProps) {
  const useExternalTree = geoTreeFromProps !== undefined;

  const { data: fetchedTree = [], isLoading } = useSWR<GeoTreeNode[]>(
    !useExternalTree && worldviewId ? ['geo-tree-select', worldviewId] : null,
    () => treeFetcher(worldviewId!)
  );

  const tree = useExternalTree ? geoTreeFromProps : fetchedTree;

  const treeData = useMemo(() => {
    if (!tree.length) return [];
    return mapGeoTreeToSelectData(tree);
  }, [tree]);

  const loading =
    loadingProp !== undefined ? loadingProp : useExternalTree ? false : isLoading;

  const normalizedStyle = useMemo(() => {
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
    //   dropdownStyle={{ minWidth: 300, ...rest.dropdownStyle }}
    //   dropdownMatchSelectWidth={false}
      loading={loading}
      treeData={treeData}
      value={value && value.trim() !== '' ? value : undefined}
      onChange={(v) => {
        if (v == null || v === '') {
          onChange?.(null);
        } else {
          onChange?.(String(v));
        }
      }}
      placeholder="请选择地点"
      allowClear
      treeDefaultExpandAll
      showSearch
      treeNodeFilterProp="title"
    />
  );
}
