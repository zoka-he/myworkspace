import { Tree, Button, Modal } from 'antd';
import { message } from '@/src/utils/antdAppMessage';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMemo, useState, useEffect } from 'react';
import { IRaceData } from '@/src/types/IAiNoval';
import {
  useCurrentRaceId,
  useRaceList,
  useWorldViewId,
  useGetEditModal,
  useLoadRaceList,
} from './RaceManageContext';
import apiCalls from './apiCalls';

interface TreeNodeData {
  key: number;
  title: JSX.Element;
  children?: TreeNodeData[];
}

export default function RaceTree() {
  const [raceList] = useRaceList();
  const [worldViewId] = useWorldViewId();
  const [currentRaceId, setCurrentRaceId] = useCurrentRaceId();
  const getEditModal = useGetEditModal();
  const loadRaceList = useLoadRaceList();

  const handleAddRoot = () => {
    if (!worldViewId) {
      message.warning('请先选择世界观');
      return;
    }
    getEditModal()?.showAndEdit({
      worldview_id: worldViewId,
      parent_id: null,
      order_num: 0,
    } as IRaceData);
  };

  const handleAddChild = (race: IRaceData) => {
    getEditModal()?.showAndEdit({
      worldview_id: worldViewId ?? undefined,
      parent_id: race.id ?? undefined,
      order_num: 0,
    } as IRaceData);
  };

  const handleDelete = (race: IRaceData) => {
    if (!race.id) {
      message.error('无效的族群 ID');
      return;
    }
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除族群「${race.name}」吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await apiCalls.deleteRace(race.id!);
          message.success('族群删除成功');
          loadRaceList();
        } catch (err: unknown) {
          const res = err as { response?: { data?: { message?: string; code?: string; count?: number } } };
          const msg = res?.response?.data?.message ?? (err as Error)?.message ?? '删除失败';
          message.error(msg);
          if (res?.response?.data?.code === 'HAS_CHILDREN' || res?.response?.data?.code === 'ROLE_REFERENCES') {
            loadRaceList();
          }
        }
      },
    });
  };

  const treeData = useMemo((): TreeNodeData[] => {
    const build = (parentId: number | null): TreeNodeData[] =>
      raceList
        .filter((r) => (r.parent_id ?? null) === parentId)
        .sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0))
        .map((race) => {
          const children = build(race.id ?? null);
          const isLeaf = children.length === 0;
          return {
            key: race.id!,
            title: (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{race.name}</span>
                <div>
                  <Button
                    type="link"
                    icon={<PlusOutlined />}
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddChild(race);
                    }}
                  />
                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    size="small"
                    danger
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(race);
                    }}
                  />
                </div>
              </div>
            ),
            children: children.length > 0 ? children : undefined,
          };
        });
    return build(null);
  }, [raceList]);

  const allExpandableKeys = useMemo((): React.Key[] => {
    const keys: React.Key[] = [];
    const collect = (nodes: TreeNodeData[]) => {
      for (const node of nodes) {
        if (node.children?.length) {
          keys.push(node.key);
          collect(node.children);
        }
      }
    };
    collect(treeData);
    return keys;
  }, [treeData]);

  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  useEffect(() => {
    if (allExpandableKeys.length > 0) {
      setExpandedKeys(allExpandableKeys);
    }
  }, [allExpandableKeys]);

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <Tree
        treeData={treeData}
        showLine
        showIcon={false}
        blockNode
        expandedKeys={expandedKeys}
        onExpand={(keys) => setExpandedKeys(keys)}
        onSelect={(keys) => {
          if (keys.length > 0 && keys[0]) {
            setCurrentRaceId(keys[0] as number);
          }
        }}
      />
    </div>
  );
}
