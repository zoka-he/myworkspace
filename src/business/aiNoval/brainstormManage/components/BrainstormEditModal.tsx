import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Row, Col, Button, Collapse, Tag, Space, message, theme, Switch } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { IBrainstorm, BrainstormType, BrainstormStatus, Priority, BrainstormCategory } from '@/src/types/IAiNoval';
import { useWorldviewId, useBrainstormList } from '../BrainstormManageContext';
import apiCalls from '../apiCalls';

const { Option } = Select;
const { TextArea } = Input;
const { Panel } = Collapse;
const { useToken } = theme;

const typeOptions: { value: BrainstormType; label: string }[] = [
  { value: 'inspiration', label: '灵感' },
  { value: 'problem', label: '问题' },
  { value: 'idea', label: '想法' },
  { value: 'note', label: '笔记' },
  { value: 'to_verify', label: '待验证' },
];

const statusOptions: { value: BrainstormStatus; label: string }[] = [
  { value: 'draft', label: '草稿' },
  { value: 'feasible_unused', label: '可行未使用' },
  { value: 'in_use', label: '使用中' },
  { value: 'used', label: '已使用' },
  { value: 'suspended', label: '暂时搁置' },
];

const priorityOptions: { value: Priority; label: string }[] = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' },
];

const categoryOptions: { value: BrainstormCategory; label: string }[] = [
  { value: 'plot', label: '情节' },
  { value: 'character', label: '角色' },
  { value: 'worldview', label: '世界观' },
  { value: 'style', label: '风格' },
  { value: 'other', label: '其他' },
];

const statusMap: Record<BrainstormStatus, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  feasible_unused: { text: '可行未使用', color: 'blue' },
  in_use: { text: '使用中', color: 'processing' },
  used: { text: '已使用', color: 'success' },
  suspended: { text: '暂时搁置', color: 'warning' },
};

interface BrainstormEditModalProps {
  visible: boolean;
  brainstorm: IBrainstorm | null;
  onCancel: () => void;
  onSave: (values: any) => void;
}

export default function BrainstormEditModal({ visible, brainstorm, onCancel, onSave }: BrainstormEditModalProps) {
  const [form] = Form.useForm();
  const [worldviewId] = useWorldviewId();
  const [brainstormList] = useBrainstormList();
  const [currentBrainstorm, setCurrentBrainstorm] = useState<IBrainstorm | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandingDirection, setExpandingDirection] = useState(false);
  const [showParentPreview, setShowParentPreview] = useState(false);
  const [parentBrainstorm, setParentBrainstorm] = useState<IBrainstorm | null>(null);
  const { token } = useToken();
  
  // 监听表单中的 parent_id 字段
  const formParentId = Form.useWatch('parent_id', form);

  useEffect(() => {
    if (visible) {
      if (brainstorm) {
        form.setFieldsValue(brainstorm);
        setCurrentBrainstorm(brainstorm);
      } else {
        form.resetFields();
        form.setFieldsValue({ 
          worldview_id: worldviewId,
          brainstorm_type: 'inspiration',
          status: 'draft',
          priority: 'medium',
        });
        setCurrentBrainstorm(null);
      }
      setShowParentPreview(false);
      setParentBrainstorm(null);
    }
  }, [visible, brainstorm, form, worldviewId]);

  // 加载父脑洞数据
  useEffect(() => {
    const loadParentBrainstorm = async () => {
      const parentId = currentBrainstorm?.parent_id || formParentId;
      if (showParentPreview && parentId) {
        try {
          const parent = await apiCalls.getBrainstorm(parentId);
          setParentBrainstorm(parent);
        } catch (error) {
          message.error('加载父脑洞失败');
          setParentBrainstorm(null);
        }
      } else {
        setParentBrainstorm(null);
      }
    };

    loadParentBrainstorm();
  }, [showParentPreview, currentBrainstorm?.parent_id, formParentId]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      let savedBrainstorm: IBrainstorm;
      
      // 先保存数据
      if (brainstorm?.id) {
        await apiCalls.updateBrainstorm(brainstorm.id, { ...brainstorm, ...values });
        savedBrainstorm = await apiCalls.getBrainstorm(brainstorm.id);
        message.success('更新成功');
      } else {
        savedBrainstorm = await apiCalls.createBrainstorm({ ...values, worldview_id: worldviewId! });
        message.success('创建成功');
      }
      
      // 更新本地状态
      setCurrentBrainstorm(savedBrainstorm);
      
      // 通知父组件刷新列表
      onSave({ ...savedBrainstorm });
    } catch (error) {
      console.error('Validation failed:', error);
      message.error('保存失败');
    }
  };

  /** 方案 A：先分析问题（ReAct + MCP），将扩展问题 + 限制性假设回写到「分析方向」 */
  const handleExpandAnalysisDirection = async () => {
    if (!worldviewId) {
      message.error('缺少世界观上下文');
      return;
    }
    const { title = '', content = '', analysis_direction = '' } = form.getFieldsValue(['title', 'content', 'analysis_direction']);
    if (!title?.trim() && !content?.trim()) {
      message.warning('请先填写标题或内容');
      return;
    }
    try {
      setExpandingDirection(true);
      message.loading({ content: '正在生成分析方向（ReAct 推演中）...', key: 'expandDirection' });
      const result = await apiCalls.expandAnalysisDirection({
        worldview_id: worldviewId,
        title: title?.trim() || '',
        content: content?.trim() || '',
        analysis_direction: analysis_direction?.trim() || undefined,
      });
      form.setFieldValue('analysis_direction', result.analysis_direction);
      message.success({ content: '已回写到分析方向', key: 'expandDirection' });
    } catch (e: any) {
      message.error({ content: e?.message || '生成分析方向失败', key: 'expandDirection' });
    } finally {
      setExpandingDirection(false);
    }
  };

  const handleAnalyze = async () => {
    if (!currentBrainstorm?.id) {
      // 如果是新建，先保存
      try {
        const values = await form.validateFields();
        const newBrainstorm = await apiCalls.createBrainstorm({ ...values, worldview_id: worldviewId! });
        setCurrentBrainstorm(newBrainstorm);
        message.success('已保存，开始分析...');
      } catch (error) {
        message.error('保存失败，无法分析');
        return;
      }
    }

    const brainstormId = currentBrainstorm?.id;
    if (!brainstormId) return;

    try {
      setAnalyzing(true);
      message.loading({ content: '分析中...', key: 'analyze' });
      await apiCalls.analyzeBrainstorm(brainstormId);
      message.success({ content: '分析完成', key: 'analyze' });
      // 重新加载脑洞数据以获取分析结果
      const updated = await apiCalls.getBrainstorm(brainstormId);
      setCurrentBrainstorm(updated);
    } catch (error) {
      message.error({ content: '分析失败', key: 'analyze' });
    } finally {
      setAnalyzing(false);
    }
  };

  const renderAnalysisSection = () => {
    // 如果没有当前脑洞
    if (!currentBrainstorm) {
      return (
        <div style={{ textAlign: 'center', padding: '20px', color: token.colorTextSecondary }}>
          保存后即可进行分析
        </div>
      );
    }

    // 如果切换到父脑洞预览
    if (showParentPreview) {
      const parentId = currentBrainstorm.parent_id || formParentId;
      if (!parentId) {
        return (
          <div style={{ textAlign: 'center', padding: '20px', color: token.colorTextSecondary }}>
            当前脑洞没有父脑洞
          </div>
        );
      }

      if (!parentBrainstorm) {
        return (
          <div style={{ textAlign: 'center', padding: '20px', color: token.colorTextSecondary }}>
            加载中...
          </div>
        );
      }

      // 显示父脑洞预览
      return (
        <div>
          <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>父脑洞：{parentBrainstorm.title}</div>
            <div style={{ fontSize: '12px', color: token.colorTextSecondary, marginBottom: '8px' }}>
              {parentBrainstorm.content?.substring(0, 100)}...
            </div>
            <Space size="small">
              {parentBrainstorm.status && (
                <Tag color={statusMap[parentBrainstorm.status]?.color || 'default'}>
                  {statusMap[parentBrainstorm.status]?.text || parentBrainstorm.status}
                </Tag>
              )}
              {parentBrainstorm.priority && (
                <Tag>{parentBrainstorm.priority}</Tag>
              )}
            </Space>
          </div>

          {/* 父脑洞分析结果 */}
          {parentBrainstorm.analysis_status === 'completed' && parentBrainstorm.analysis_result ? (
            <div>
              {(() => {
                const result = parentBrainstorm.analysis_result!;
                const activeKeys: string[] = [];
                if (result.impact_analysis) activeKeys.push('impact');
                if (result.consistency_check) activeKeys.push('consistency');
                if (result.suggestions && result.suggestions.length > 0) activeKeys.push('suggestions');
                if (result.opportunities && result.opportunities.length > 0) activeKeys.push('opportunities');
                
                return (
                  <Collapse 
                    defaultActiveKey={activeKeys}
                    size="small"
                  >
                    {result.impact_analysis && (
                      <Panel header="影响分析" key="impact">
                        <p style={{ margin: 0 }}>{result.impact_analysis.description}</p>
                      </Panel>
                    )}
                    {result.consistency_check && (
                      <Panel header="一致性检查" key="consistency">
                        <p style={{ margin: '0 0 8px 0' }}>一致性评分: {result.consistency_check.consistency_score}</p>
                        {result.consistency_check.conflicts?.map((conflict, idx) => (
                          <div key={idx} style={{ marginTop: 8 }}>
                            <Tag color="red">{conflict.severity}</Tag>
                            {conflict.description}
                          </div>
                        ))}
                      </Panel>
                    )}
                    {result.suggestions && result.suggestions.length > 0 && (
                      <Panel header="建议" key="suggestions">
                        {result.suggestions.map((suggestion, idx) => (
                          <div key={idx} style={{ marginTop: idx === 0 ? 0 : 8 }}>
                            <Tag color="blue">{suggestion.priority}</Tag>
                            {suggestion.content}
                          </div>
                        ))}
                      </Panel>
                    )}
                    {result.opportunities && result.opportunities.length > 0 && (
                      <Panel header="机会" key="opportunities">
                        {result.opportunities.map((opp, idx) => (
                          <div key={idx} style={{ marginTop: idx === 0 ? 0 : 8 }}>
                            <Tag color="green">{opp.potential}</Tag>
                            {opp.description}
                          </div>
                        ))}
                      </Panel>
                    )}
                  </Collapse>
                );
              })()}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: token.colorTextSecondary }}>
              父脑洞暂无分析结果
            </div>
          )}
        </div>
      );
    }

    // 显示当前脑洞分析
    return (
      <div>
        {/* 分析按钮 */}
        {currentBrainstorm.analysis_status !== 'analyzing' && (
          <div style={{ marginBottom: '16px' }}>
            <Button
              type="primary"
              icon={<RobotOutlined />}
              onClick={handleAnalyze}
              loading={analyzing}
              block
            >
              分析
            </Button>
          </div>
        )}

        {/* 分析中状态 */}
        {currentBrainstorm.analysis_status === 'analyzing' && (
          <div style={{ textAlign: 'center', padding: '20px', color: token.colorTextSecondary }}>
            分析中...
          </div>
        )}

        {/* 分析结果 */}
        {currentBrainstorm.analysis_status === 'completed' && currentBrainstorm.analysis_result && (
          <div>
            {(() => {
              const result = currentBrainstorm.analysis_result!;
              const activeKeys: string[] = [];
              if (result.impact_analysis) activeKeys.push('impact');
              if (result.consistency_check) activeKeys.push('consistency');
              if (result.suggestions && result.suggestions.length > 0) activeKeys.push('suggestions');
              if (result.opportunities && result.opportunities.length > 0) activeKeys.push('opportunities');
              
              return (
                <Collapse 
                  defaultActiveKey={activeKeys}
                  size="small"
                >
                  {result.impact_analysis && (
                    <Panel header="影响分析" key="impact">
                      <p style={{ margin: 0 }}>{result.impact_analysis.description}</p>
                    </Panel>
                  )}
                  {result.consistency_check && (
                    <Panel header="一致性检查" key="consistency">
                      <p style={{ margin: '0 0 8px 0' }}>一致性评分: {result.consistency_check.consistency_score}</p>
                      {result.consistency_check.conflicts?.map((conflict, idx) => (
                        <div key={idx} style={{ marginTop: 8 }}>
                          <Tag color="red">{conflict.severity}</Tag>
                          {conflict.description}
                        </div>
                      ))}
                    </Panel>
                  )}
                  {result.suggestions && result.suggestions.length > 0 && (
                    <Panel header="建议" key="suggestions">
                      {result.suggestions.map((suggestion, idx) => (
                        <div key={idx} style={{ marginTop: idx === 0 ? 0 : 8 }}>
                          <Tag color="blue">{suggestion.priority}</Tag>
                          {suggestion.content}
                        </div>
                      ))}
                    </Panel>
                  )}
                  {result.opportunities && result.opportunities.length > 0 && (
                    <Panel header="机会" key="opportunities">
                      {result.opportunities.map((opp, idx) => (
                        <div key={idx} style={{ marginTop: idx === 0 ? 0 : 8 }}>
                          <Tag color="green">{opp.potential}</Tag>
                          {opp.description}
                        </div>
                      ))}
                    </Panel>
                  )}
                </Collapse>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal
      title={brainstorm ? '编辑脑洞' : '创建脑洞'}
      visible={visible}
      onCancel={onCancel}
      width={1400}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onCancel}>
          关闭
        </Button>,
        <Button key="save" type="primary" onClick={handleOk}>
          保存
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
      <Row gutter={24}>
        {/* 左侧表单 */}
        <Col span={10}>
            <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
              <Input placeholder="请输入标题" />
            </Form.Item>

            {/* 条目类型、状态、优先级一行 */}
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="brainstorm_type" label="条目类型" rules={[{ required: true, message: '请选择条目类型' }]}>
                  <Select placeholder="请选择条目类型">
                    {typeOptions.map(opt => (
                      <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="status" label="状态">
                  <Select placeholder="请选择状态">
                    {statusOptions.map(opt => (
                      <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="priority" label="优先级">
                  <Select placeholder="请选择优先级">
                    {priorityOptions.map(opt => (
                      <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]}>
              <TextArea autoSize={{ minRows: 8 }} placeholder="请输入内容（支持Markdown）" />
            </Form.Item>

            <Form.Item name="category" label="内容分类">
              <Select placeholder="请选择内容分类">
                {categoryOptions.map(opt => (
                  <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="parent_id" label="父脑洞">
              <Select
                placeholder="选择父脑洞（可选）"
                allowClear
                showSearch
                filterOption={(input, option) =>
                  String(option?.label ?? option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {brainstormList
                  .filter(b => b.id && b.id !== brainstorm?.id) // 排除当前编辑的脑洞，避免循环引用
                  .map(b => (
                    <Option key={b.id} value={b.id}>
                      {b.title}
                    </Option>
                  ))}
              </Select>
            </Form.Item>

            <Form.Item name="tags" label="标签">
              <Select
                mode="tags"
                placeholder="输入标签后按回车添加，可输入多个标签"
                style={{ width: '100%' }}
                tokenSeparators={[',', '，']}
              />
            </Form.Item>
        </Col>

        {/* 右侧：分析方向 + 分析区域 */}
        <Col span={14}>
          <div style={{ 
            borderLeft: `1px solid ${token.colorBorderSecondary}`, 
            paddingLeft: '24px',
            height: '100%'
          }}>
            <div className='f-flex-two-side' style={{ width: '100%', marginBottom: '10px' }}>
              <span style={{ fontWeight: 'bold' }}>分析方向</span>
              <Space size="middle">
                <Button
                  type="default"
                  size="small"
                  loading={expandingDirection}
                  disabled={!worldviewId}
                  onClick={handleExpandAnalysisDirection}
                >
                  生成分析方向
                </Button>
              </Space>
            </div>
            <Form.Item
              name="analysis_direction"
              label={false}
            >
              <Input.TextArea
                autoSize={{ minRows: 3 }}
                placeholder="希望 AI 分析时侧重或关注的方向（可选）；可点击「生成分析方向」通过 ReAct+MCP 自动生成扩展问题与限制性假设"
                allowClear
              />
            </Form.Item>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0 }}>分析</h4>
              <Space>
                <span style={{ fontSize: '12px', color: token.colorTextSecondary }}>当前脑洞</span>
                <Switch
                  checked={showParentPreview}
                  onChange={setShowParentPreview}
                  checkedChildren="父脑洞"
                  unCheckedChildren="当前"
                  disabled={!currentBrainstorm || (!currentBrainstorm.parent_id && !formParentId)}
                />
                <span style={{ fontSize: '12px', color: token.colorTextSecondary }}>父脑洞</span>
              </Space>
            </div>
            {renderAnalysisSection()}
          </div>
        </Col>
      </Row>
      </Form>
    </Modal>
  );
}
