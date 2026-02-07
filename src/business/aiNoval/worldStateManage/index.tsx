import React, { useEffect, useState } from 'react';
import { Row, Col, Select, Button, Space, message } from 'antd';
import { PlusOutlined, ImportOutlined } from '@ant-design/icons';
import { WorldStateManageContextProvider, useWorldviewId, useWorldviewList, useWorldStateList, useFilters, useCurrentWorldState } from './WorldStateManageContext';
import WorldStateList from './components/WorldStateList';
import WorldStateDetailPanel from './components/WorldStateDetailPanel';
import WorldStateEditModal from './components/WorldStateEditModal';
import WorldStateFilterPanel from './components/WorldStateFilterPanel';
import apiCalls from './apiCalls';

const { Option } = Select;

function WorldStateManageContent() {
  const [worldviewId, setWorldviewId] = useWorldviewId();
  const [worldviewList, loadWorldviewList] = useWorldviewList();
  const [worldStateList, loadWorldStateList] = useWorldStateList();
  const [filters, setFilters] = useFilters();
  const { currentWorldStateId, setCurrentWorldStateId } = useCurrentWorldState();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingWorldState, setEditingWorldState] = useState<any>(null);
  const [migrationPanelVisible, setMigrationPanelVisible] = useState(false);

  useEffect(() => {
    loadWorldviewList();
  }, []);

  useEffect(() => {
    if (worldviewId) {
      loadWorldStateList();
    }
  }, [worldviewId, filters, loadWorldStateList]);

  const handleCreate = () => {
    setEditingWorldState(null);
    setEditModalVisible(true);
  };

  const handleEdit = (worldState: any) => {
    setEditingWorldState(worldState);
    setEditModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await apiCalls.deleteWorldState(id);
      message.success('删除成功');
      loadWorldStateList();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleSave = async (values: any) => {
    try {
      if (values.id) {
        await apiCalls.updateWorldState(values.id, values);
        message.success('更新成功');
      } else {
        await apiCalls.createWorldState({ ...values, worldview_id: worldviewId! });
        message.success('创建成功');
      }
      setEditModalVisible(false);
      loadWorldStateList();
    } catch (error) {
      message.error(values.id ? '更新失败' : '创建失败');
    }
  };

  return (
    <div style={{ padding: '0px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部工具栏：世界观 + 筛选 + 操作按钮 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Space wrap>
          <Select
            style={{ width: 200 }}
            value={worldviewId}
            onChange={setWorldviewId}
            placeholder="选择世界观"
          >
            {worldviewList.map(w => (
              <Option key={w.id} value={w.id}>{w.title}</Option>
            ))}
          </Select>
          <WorldStateFilterPanel />
        </Space>
        <Space>
          <Button icon={<ImportOutlined />} onClick={() => setMigrationPanelVisible(true)}>
            数据迁移
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} disabled={!worldviewId}>
            创建世界态
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ flex: 1, overflow: 'hidden' }}>
        {/* 表格 */}
        <Col span={12} style={{ height: '100%', overflow: 'auto' }}>
          <WorldStateList
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSelect={setCurrentWorldStateId}
          />
        </Col>
        {/* 右侧详情面板 */}
        <Col span={12} style={{ height: '100%', overflow: 'auto' }}>
          <WorldStateDetailPanel />
        </Col>
      </Row>

      {/* 编辑模态框 */}
      <WorldStateEditModal
        visible={editModalVisible}
        worldState={editingWorldState}
        onCancel={() => setEditModalVisible(false)}
        onSave={handleSave}
      />
    </div>
  );
}

export default function WorldStateManage() {
  return (
    <WorldStateManageContextProvider>
      <WorldStateManageContent />
    </WorldStateManageContextProvider>
  );
}
