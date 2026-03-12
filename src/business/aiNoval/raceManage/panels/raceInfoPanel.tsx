import { Button, Descriptions, Typography } from 'antd';
import { EditOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { IRaceData } from '@/src/types/IAiNoval';
import { useCurrentRace, useRaceList, useGetEditModal } from '../RaceManageContext';
import { message } from '@/src/utils/antdAppMessage';
import apiCalls from '../apiCalls';
import { useLoadRaceList } from '../RaceManageContext';
import { Modal } from 'antd';
import { useState } from 'react';
import { generateRaceEmbedText } from '@/src/api/aiNovel';
import { prepareTextEmbedding } from '@/src/api/aiNovel';

function getDisplayValue(
  race: IRaceData | null,
  key: keyof IRaceData,
  raceList: IRaceData[]
): { text: string; inherited?: string } {
  if (!race) return { text: '-' };
  const raw = race[key];
  const str = raw != null && raw !== '' ? String(raw) : '';
  if (str) return { text: str };
  if (race.parent_id != null) {
    const parent = raceList.find((r) => r.id === race.parent_id);
    const parentVal = parent ? parent[key] : null;
    if (parentVal != null && parentVal !== '') {
      return { text: String(parentVal), inherited: parent?.name ?? '父族群' };
    }
  }
  return { text: '-' };
}

export default function RaceInfoPanel() {
  const currentRace = useCurrentRace();
  const [raceList] = useRaceList();
  const getEditModal = useGetEditModal();
  const loadRaceList = useLoadRaceList();
  const [embedLoading, setEmbedLoading] = useState(false);
  const [taskLoading, setTaskLoading] = useState(false);

  const handleEdit = () => {
    if (currentRace) getEditModal()?.showAndEdit(currentRace);
  };

  const getMergedForEmbed = (): { description?: string; appearance?: string; traits?: string; hasParent: boolean } => {
    if (!currentRace || !raceList.length) return { hasParent: false };
    let desc = currentRace.description ?? '';
    let appearance = currentRace.appearance ?? '';
    let traits = currentRace.traits ?? '';
    if (currentRace.parent_id != null) {
      const parent = raceList.find((r) => r.id === currentRace.parent_id);
      if (parent) {
        if (!desc) desc = parent.description ?? '';
        if (!appearance) appearance = parent.appearance ?? '';
        if (!traits) traits = parent.traits ?? '';
      }
    }
    return {
      description: desc || undefined,
      appearance: appearance || undefined,
      traits: traits || undefined,
      hasParent: currentRace.parent_id != null,
    };
  };

  const handleGenerateEmbedText = async () => {
    if (!currentRace?.id) return;
    const merged = getMergedForEmbed();
    setEmbedLoading(true);
    try {
      const embedText = await generateRaceEmbedText({
        description: merged.description ?? currentRace.description ?? undefined,
        appearance: merged.appearance ?? currentRace.appearance ?? undefined,
        lifespan: currentRace.lifespan ?? undefined,
        traits: merged.traits ?? currentRace.traits ?? undefined,
        weaknesses: currentRace.weaknesses ?? undefined,
        naming_habit: currentRace.naming_habit ?? undefined,
        customs: currentRace.customs ?? undefined,
        hasParent: merged.hasParent,
      });
      await apiCalls.updateRace({ ...currentRace, embed_document: embedText });
      message.success('嵌入文本已生成并保存');
      loadRaceList();
    } catch (e: unknown) {
      message.error((e as Error)?.message ?? '生成失败');
    } finally {
      setEmbedLoading(false);
    }
  };

  const handleSubmitEmbedTask = async () => {
    if (!currentRace?.id) return;
    setTaskLoading(true);
    try {
      await prepareTextEmbedding({
        worldviews: [],
        characters: [],
        locations: [],
        factions: [],
        events: [],
        races: [currentRace.id],
      });
      message.success('嵌入任务已提交');
    } catch (e: unknown) {
      message.error((e as Error)?.message ?? '提交失败');
    } finally {
      setTaskLoading(false);
    }
  };

  const handleDelete = () => {
    if (!currentRace?.id) return;
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除族群「${currentRace.name}」吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await apiCalls.deleteRace(currentRace.id!);
          message.success('族群删除成功');
          loadRaceList();
        } catch (err: unknown) {
          const res = err as { response?: { data?: { message?: string } } };
          const msg = res?.response?.data?.message ?? (err as Error)?.message ?? '删除失败';
          message.error(msg);
        }
      },
    });
  };

  if (!currentRace) {
    return <div className="p-4 text-gray-500">请从左侧选择族群</div>;
  }

  const desc = getDisplayValue(currentRace, 'description', raceList);
  const appearance = getDisplayValue(currentRace, 'appearance', raceList);
  const traits = getDisplayValue(currentRace, 'traits', raceList);
  const namingHabit = getDisplayValue(currentRace, 'naming_habit', raceList);

  return (
    <div className="f-fit-height" style={{ overflow: 'auto' }}>
      <Typography.Title level={5}>
        {currentRace.name ?? '-'}
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          style={{ marginLeft: 8 }}
          onClick={handleEdit}
        >
          编辑
        </Button>
        <Button type="link" size="small" danger onClick={handleDelete}>
          删除
        </Button>
      </Typography.Title>
      <Typography.Paragraph>
        <pre style={{ minHeight: '4em', whiteSpace: 'pre-wrap' }}>
          {desc.text}
          {desc.inherited && (
            <span style={{ color: '#888', fontSize: 12 }}>（继承自 {desc.inherited}）</span>
          )}
        </pre>
      </Typography.Paragraph>
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="外形">
          {appearance.text}
          {appearance.inherited && (
            <span style={{ color: '#888', fontSize: 12 }}> 继承自 {appearance.inherited}</span>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="寿命">{currentRace.lifespan ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="特质">
          {traits.text}
          {traits.inherited && (
            <span style={{ color: '#888', fontSize: 12 }}> 继承自 {traits.inherited}</span>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="弱点">{currentRace.weaknesses ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="命名习惯">
          {namingHabit.text}
          {namingHabit.inherited && (
            <span style={{ color: '#888', fontSize: 12 }}> 继承自 {namingHabit.inherited}</span>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="习俗">{currentRace.customs ?? '-'}</Descriptions.Item>
      </Descriptions>
      <Descriptions title="嵌入" size="small" bordered column={1} style={{ marginTop: 16 }}>
        <Descriptions.Item label="操作">
          <Button
            type="primary"
            size="small"
            icon={<ThunderboltOutlined />}
            loading={embedLoading}
            onClick={handleGenerateEmbedText}
          >
            生成嵌入文本
          </Button>
          <Button
            size="small"
            style={{ marginLeft: 8 }}
            loading={taskLoading}
            onClick={handleSubmitEmbedTask}
            disabled={!currentRace.embed_document}
          >
            提交嵌入任务
          </Button>
        </Descriptions.Item>
        <Descriptions.Item label="嵌入原文">
          <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto' }}>
            {currentRace.embed_document || '—'}
          </pre>
        </Descriptions.Item>
      </Descriptions>
    </div>
  );
}
