import React, { useEffect, useState } from 'react';
import { Modal, Form, Button, message, theme } from 'antd';
import { IBrainstorm } from '@/src/types/IAiNoval';
import { useWorldviewId, useBrainstormList } from '../../BrainstormManageContext';
import apiCalls from '../../apiCalls';
import BrainstormFormSection from './BrainstormFormSection';
import BrainstormAnalysisPanel from './BrainstormAnalysisPanel';
import { AnalysisType } from '../constants';

const { useToken } = theme;

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
  const [savingForm, setSavingForm] = useState(false);
  const [expandingDirection, setExpandingDirection] = useState(false);
  const [showParentPreview, setShowParentPreview] = useState(false);
  const [parentBrainstorm, setParentBrainstorm] = useState<IBrainstorm | null>(null);
  const [parentLoading, setParentLoading] = useState(false);
  const [analysisType, setAnalysisType] = useState<AnalysisType>('feasibility_and_expansion');
  const { token } = useToken();
  
  // 监听表单中的 parent_ids 字段
  const formParentIds = Form.useWatch('parent_ids', form);

  useEffect(() => {
    if (visible) {
      if (brainstorm) {
        // 处理向后兼容：如果有 parent_id 但没有 parent_ids，转换为 parent_ids
        const formValues: any = { ...brainstorm };
        if (brainstorm.parent_id && (!brainstorm.parent_ids || brainstorm.parent_ids.length === 0)) {
          formValues.parent_ids = [brainstorm.parent_id];
        }
        form.setFieldsValue(formValues);
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
      setAnalysisType('feasibility_and_expansion'); // 默认选择可行性及思路扩展
    }
  }, [visible, brainstorm, form, worldviewId]);


  /** 保存表单数据（人工填写部分）- 只保存表单字段，不覆盖分析相关字段 */
  const handleSaveForm = async () => {
    try {
      const values = await form.validateFields();
      setSavingForm(true);
      
      // 只保存表单相关字段，排除分析相关字段；角色构思数据从 currentBrainstorm 带出
      const formFields = {
        title: values.title,
        brainstorm_type: values.brainstorm_type,
        status: values.status,
        priority: values.priority,
        category: values.category,
        content: values.content,
        user_question: values.user_question,
        expanded_questions: values.expanded_questions,
        plot_planning: values.plot_planning,
        chapter_outline: values.chapter_outline,
        parent_ids: values.parent_ids,
        tags: values.tags,
        related_faction_ids: values.related_faction_ids,
        related_role_ids: values.related_role_ids,
        related_geo_codes: values.related_geo_codes,
        related_event_ids: values.related_event_ids,
        related_chapter_ids: values.related_chapter_ids,
        related_world_state_ids: values.related_world_state_ids,
        role_seeds: currentBrainstorm?.role_seeds,
        role_drafts: currentBrainstorm?.role_drafts,
      };
      
      let savedBrainstorm: IBrainstorm;
      
      if (brainstorm?.id) {
        // 更新时，只更新表单字段，不覆盖分析相关字段（analysis_result, analysis_status, analyzed_at, analysis_model）
        await apiCalls.updateBrainstorm(brainstorm.id, formFields);
        savedBrainstorm = await apiCalls.getBrainstorm(brainstorm.id);
        message.success('表单保存成功');
      } else {
        savedBrainstorm = await apiCalls.createBrainstorm({ ...formFields, worldview_id: worldviewId! });
        message.success('创建成功');
      }
      
      // 更新本地状态
      setCurrentBrainstorm(savedBrainstorm);
      
      // 通知父组件刷新列表
      onSave({ ...savedBrainstorm });
    } catch (error) {
      console.error('Validation failed:', error);
      message.error('保存失败');
    } finally {
      setSavingForm(false);
    }
  };

  /** 生成扩展问题（ReAct + MCP），将扩展问题 + 限制性假设回写到「扩展后的问题」 */
  const handleExpandQuestions = async () => {
    if (!worldviewId) {
      message.error('缺少世界观上下文');
      return;
    }
    const { title = '', content = '', user_question = '', expanded_questions = '' } = form.getFieldsValue(['title', 'content', 'user_question', 'expanded_questions']);
    if (!title?.trim() && !content?.trim()) {
      message.warning('请先填写标题或内容');
      return;
    }
    try {
      setExpandingDirection(true);
      message.loading({ content: '正在生成扩展问题（ReAct 推演中）...', key: 'expandDirection' });
      const result = await apiCalls.expandAnalysisDirection({
        worldview_id: worldviewId,
        title: title?.trim() || '',
        content: content?.trim() || '',
        user_question: user_question?.trim() || undefined,
        expanded_questions: expanded_questions?.trim() || undefined,
      });
      if (result.expanded_questions) {
        form.setFieldValue('expanded_questions', result.expanded_questions);
      }
      message.success({ content: '已回写到扩展后的问题', key: 'expandDirection' });
    } catch (e: any) {
      message.error({ content: e?.message || '生成扩展问题失败', key: 'expandDirection' });
    } finally {
      setExpandingDirection(false);
    }
  };

  const handleChapterOutlineGenerated = async (outline: string) => {
    // 更新本地状态和表单值
    if (currentBrainstorm?.id) {
      // 重新加载脑洞数据以确保同步
      const updated = await apiCalls.getBrainstorm(currentBrainstorm.id);
      setCurrentBrainstorm(updated);
      form.setFieldValue('chapter_outline', updated.chapter_outline);
    }
  };

  const handleAnalyze = async () => {
    // 如果是新建，先保存表单数据
    if (!currentBrainstorm?.id) {
      try {
        const values = await form.validateFields();
        const formFields = {
          title: values.title,
          brainstorm_type: values.brainstorm_type,
          status: values.status,
          priority: values.priority,
          category: values.category,
          content: values.content,
          user_question: values.user_question,
          expanded_questions: values.expanded_questions,
          plot_planning: values.plot_planning,
          chapter_outline: values.chapter_outline,
          parent_ids: values.parent_ids,
          tags: values.tags,
          related_faction_ids: values.related_faction_ids,
          related_role_ids: values.related_role_ids,
          related_geo_codes: values.related_geo_codes,
          related_event_ids: values.related_event_ids,
          related_chapter_ids: values.related_chapter_ids,
          related_world_state_ids: values.related_world_state_ids,
          role_seeds: currentBrainstorm?.role_seeds,
          role_drafts: currentBrainstorm?.role_drafts,
        };
        const newBrainstorm = await apiCalls.createBrainstorm({ ...formFields, worldview_id: worldviewId! });
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
      message.loading({ content: '保存表单并分析中（自然语言输出）...', key: 'analyze' });
      
      // 分析 API 会在后端先保存表单数据再进行分析
      const formValues = form.getFieldsValue();
      await apiCalls.analyzeBrainstorm(brainstormId, formValues);
      message.success({ content: '分析完成', key: 'analyze' });
      
      // 重新加载脑洞数据以获取分析结果（analysis_result.analysis_text 为自然语言全文）
      const updated = await apiCalls.getBrainstorm(brainstormId);
      setCurrentBrainstorm(updated);
      // 同步表单值（以防后端更新了某些字段）
      form.setFieldsValue(updated);
    } catch (error) {
      message.error({ content: '分析失败', key: 'analyze' });
    } finally {
      setAnalyzing(false);
    }
  };

  // 加载父脑洞数据（支持多个父脑洞）
  useEffect(() => {
    const loadParentBrainstorms = async () => {
      // 优先使用 parent_ids，如果没有则使用 parent_id（向后兼容）
      const parentIds = currentBrainstorm?.parent_ids || 
                       (currentBrainstorm?.parent_id ? [currentBrainstorm.parent_id] : []) ||
                       formParentIds || 
                       [];
      
      if (showParentPreview && parentIds.length > 0) {
        try {
          setParentLoading(true);
          // 加载第一个父脑洞用于预览（后续可以扩展为显示多个）
          const parent = await apiCalls.getBrainstorm(parentIds[0]);
          setParentBrainstorm(parent);
        } catch (error) {
          message.error('加载父脑洞失败');
          setParentBrainstorm(null);
        } finally {
          setParentLoading(false);
        }
      } else {
        setParentBrainstorm(null);
      }
    };

    loadParentBrainstorms();
  }, [showParentPreview, currentBrainstorm?.parent_ids, currentBrainstorm?.parent_id, formParentIds]);

  return (
    <Modal
      title={brainstorm ? '编辑脑洞' : '创建脑洞'}
      visible={visible}
      onCancel={onCancel}
      width={'80vw'}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onCancel}>
          关闭
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        {/* 人工填写部分 */}
        <BrainstormFormSection
          brainstorm={brainstorm}
          brainstormList={brainstormList}
          worldviewId={worldviewId}
          expandingDirection={expandingDirection}
          onExpandQuestions={handleExpandQuestions}
          onSave={handleSaveForm}
          saving={savingForm}
        />

        {/* 分析面板 */}
        <BrainstormAnalysisPanel
          currentBrainstorm={currentBrainstorm}
          parentBrainstorm={parentBrainstorm}
          parentLoading={parentLoading}
          analyzing={analyzing}
          showParentPreview={showParentPreview}
          formParentIds={formParentIds}
          currentParentIds={currentBrainstorm?.parent_ids || (currentBrainstorm?.parent_id ? [currentBrainstorm.parent_id] : [])}
          analysisType={analysisType}
          onAnalysisTypeChange={setAnalysisType}
          onAnalyze={handleAnalyze}
          onToggleParentPreview={setShowParentPreview}
          onChapterOutlineGenerated={handleChapterOutlineGenerated}
          onRoleSeedsChange={(seeds) => setCurrentBrainstorm((prev) => (prev ? { ...prev, role_seeds: seeds } : null))}
          onRoleDraftsChange={(drafts) => setCurrentBrainstorm((prev) => (prev ? { ...prev, role_drafts: drafts } : null))}
        />
      </Form>
    </Modal>
  );
}
