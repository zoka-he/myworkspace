import React, { useEffect, useState } from 'react';
import { Row, Col, Select, Button, Space, Input, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { BrainstormManageContextProvider, useWorldviewId, useWorldviewList, useBrainstormList, useFilters, useCurrentBrainstorm } from './BrainstormManageContext';
import BrainstormList from './components/BrainstormList';
import BrainstormDetailPanel from './components/BrainstormDetailPanel';
import BrainstormEditModal from './components/BrainstormEditModal';
import BrainstormFilterPanel from './components/BrainstormFilterPanel';
import apiCalls from './apiCalls';

const { Option } = Select;
const { Search } = Input;

function BrainstormManageContent() {
  const [worldviewId, setWorldviewId] = useWorldviewId();
  const [worldviewList, loadWorldviewList] = useWorldviewList();
  const [brainstormList, loadBrainstormList] = useBrainstormList();
  const [filters, setFilters] = useFilters();
  const { currentBrainstormId, setCurrentBrainstormId } = useCurrentBrainstorm();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingBrainstorm, setEditingBrainstorm] = useState<any>(null);

  useEffect(() => {
    loadWorldviewList();
  }, []);

  useEffect(() => {
    if (worldviewId) {
      loadBrainstormList();
    }
  }, [worldviewId, filters, loadBrainstormList]);

  const handleCreate = () => {
    setEditingBrainstorm(null);
    setEditModalVisible(true);
  };

  const handleEdit = (brainstorm: any) => {
    setEditingBrainstorm(brainstorm);
    setEditModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await apiCalls.deleteBrainstorm(id);
      message.success('删除成功');
      loadBrainstormList();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleAnalyze = async (id: number) => {
    try {
      message.loading({ content: '分析中...', key: 'analyze' });
      await apiCalls.analyzeBrainstorm(id);
      message.success({ content: '分析完成', key: 'analyze' });
      loadBrainstormList();
    } catch (error) {
      message.error({ content: '分析失败', key: 'analyze' });
    }
  };

  const handleSave = async (values: any) => {
    try {
      // 刷新列表，但不关闭模态框（让用户在模态框中继续编辑和分析）
      loadBrainstormList();
      // 如果保存的是新创建的，更新编辑中的脑洞
      if (!editingBrainstorm && values.id) {
        setEditingBrainstorm(values);
      }
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部工具栏 - 合并成一行 */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <Space size="middle" wrap>
          <Space.Compact size="middle">
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
            <Search
              placeholder="搜索脑洞..."
              allowClear
              style={{ width: 300 }}
              onSearch={handleSearch}
              onChange={(e) => {
                if (!e.target.value) {
                  handleSearch('');
                }
              }}
            />
          </Space.Compact>
          
          <BrainstormFilterPanel />
        </Space>
        
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} disabled={!worldviewId}>
          创建脑洞
        </Button>
      </div>

      <Row gutter={16} style={{ flex: 1, overflow: 'hidden' }}>
        {/* 主列表 */}
        <Col span={14} style={{ height: '100%', overflow: 'auto' }}>
          <BrainstormList
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSelect={setCurrentBrainstormId}
          />
        </Col>

        {/* 右侧详情面板 */}
        <Col span={10} style={{ height: '100%', overflow: 'auto' }}>
          <BrainstormDetailPanel onAnalyze={handleAnalyze} />
        </Col>
      </Row>

      {/* 编辑模态框 */}
      <BrainstormEditModal
        visible={editModalVisible}
        brainstorm={editingBrainstorm}
        onCancel={() => setEditModalVisible(false)}
        onSave={handleSave}
      />
    </div>
  );
}

export default function BrainstormManage() {
  return (
    <BrainstormManageContextProvider>
      <BrainstormManageContent />
    </BrainstormManageContextProvider>
  );
}
