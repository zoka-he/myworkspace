import React, { useState } from 'react';
import { Button, Card, Checkbox, Input, Select, Space, theme, message, Collapse } from 'antd';
import { ReloadOutlined, UserOutlined, FormOutlined } from '@ant-design/icons';
import { IBrainstorm, IRoleSeed, IRoleDraft } from '@/src/types/IAiNoval';
import apiCalls from '../../apiCalls';

const { useToken } = theme;
const DEFAULT_SEED_COUNT = 5;

interface RoleIdeationPanelProps {
  currentBrainstorm: IBrainstorm | null;
  onSeedsChange: (seeds: IRoleSeed[]) => void;
  onDraftsChange: (drafts: IRoleDraft[]) => void;
}

/**
 * 角色卡构思面板：阶段一抽样生成/重骰种子，阶段二为选中种子生成角色草稿（角色卡+背景）
 */
export default function RoleIdeationPanel({
  currentBrainstorm,
  onSeedsChange,
  onDraftsChange,
}: RoleIdeationPanelProps) {
  const { token } = useToken();
  const seeds = currentBrainstorm?.role_seeds ?? [];
  const drafts = currentBrainstorm?.role_drafts ?? [];

  const [selectedSeedIds, setSelectedSeedIds] = useState<Set<string>>(new Set());
  const [generatingSeeds, setGeneratingSeeds] = useState(false);
  const [rerollingId, setRerollingId] = useState<string | null>(null);
  const [generatingDrafts, setGeneratingDrafts] = useState(false);
  const [seedCount, setSeedCount] = useState(DEFAULT_SEED_COUNT);

  const handleGenerateSeeds = async () => {
    if (!currentBrainstorm?.id) {
      message.warning('请先保存脑洞');
      return;
    }
    try {
      setGeneratingSeeds(true);
      message.loading({ content: `正在生成 ${seedCount} 个角色种子...`, key: 'roleSeeds' });
      const newSeeds = await apiCalls.generateRoleSeeds(currentBrainstorm.id, {
        count: seedCount,
        randomness: 'medium',
        adhere_worldview: true,
      });
      onSeedsChange(newSeeds);
      onDraftsChange([]);
      setSelectedSeedIds(new Set());
      message.success({ content: '角色种子已生成', key: 'roleSeeds' });
    } catch (e: any) {
      message.error({ content: e?.message || '生成角色种子失败', key: 'roleSeeds' });
    } finally {
      setGeneratingSeeds(false);
    }
  };

  const handleRerollSeed = async (seedId: string) => {
    if (!currentBrainstorm?.id) return;
    const seed = seeds.find((s) => s.id === seedId);
    if (seed?.edited) {
      const confirmed = window.confirm('此种子已被修改，重骰将覆盖当前内容，是否继续？');
      if (!confirmed) return;
    }
    try {
      setRerollingId(seedId);
      const updated = await apiCalls.rerollRoleSeed(currentBrainstorm.id, seedId);
      const next = seeds.map((s) => (s.id === seedId ? { ...updated, edited: false } : s));
      onSeedsChange(next);
      message.success('已重骰该种子');
    } catch (e: any) {
      message.error(e?.message || '重骰失败');
    } finally {
      setRerollingId(null);
    }
  };

  const handleSeedContentChange = (seedId: string, content: string) => {
    const next = seeds.map((s) =>
      s.id === seedId ? { ...s, content, edited: true } : s
    );
    onSeedsChange(next);
  };

  const toggleSeedSelected = (seedId: string, checked: boolean) => {
    setSelectedSeedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(seedId);
      else next.delete(seedId);
      return next;
    });
  };

  const handleGenerateDrafts = async () => {
    const ids = Array.from(selectedSeedIds);
    if (ids.length === 0) {
      message.warning('请先勾选要生成草稿的种子');
      return;
    }
    if (!currentBrainstorm?.id) {
      message.warning('请先保存脑洞');
      return;
    }
    try {
      setGeneratingDrafts(true);
      let worldviewSummary: string | undefined;
      let currentDrafts = [...drafts];
      for (let i = 0; i < ids.length; i++) {
        message.loading({ content: `正在生成角色草稿（${i + 1}/${ids.length}）...`, key: 'roleDrafts' });
        const { drafts: newDrafts, worldview_summary: nextSummary } = await apiCalls.generateRoleDrafts(
          currentBrainstorm.id,
          [ids[i]],
          seeds,
          worldviewSummary
        );
        if (nextSummary) worldviewSummary = nextSummary;
        const bySeedId = new Map(currentDrafts.map((d) => [d.seed_id, d]));
        newDrafts.forEach((d) => bySeedId.set(d.seed_id, d));
        currentDrafts = Array.from(bySeedId.values());
        onDraftsChange(currentDrafts);
      }
      message.success({ content: '角色草稿已全部生成', key: 'roleDrafts' });
    } catch (e: any) {
      message.error({ content: e?.message || '生成角色草稿失败', key: 'roleDrafts' });
    } finally {
      setGeneratingDrafts(false);
    }
  };

  const draftBySeedId = new Map(drafts.map((d) => [d.seed_id, d]));
  const seedOrdinal = (index: number) => ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'][index] ?? `#${index + 1}`;
  const seedLabel = (seedId: string) => {
    const idx = seeds.findIndex((s) => s.id === seedId);
    return idx >= 0 ? seedOrdinal(idx) : seedId;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 阶段一：角色种子 */}
      <div>
        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontWeight: 'bold' }}>角色种子（自然语言，可编辑与重骰）</span>
          <Space>
            <Select
              value={seedCount}
              onChange={setSeedCount}
              options={[3, 5, 7].map((n) => ({ value: n, label: `生成 ${n} 个` }))}
              style={{ width: 110 }}
            />
            <Button
              type="primary"
              size="small"
              icon={<FormOutlined />}
              loading={generatingSeeds}
              disabled={generatingSeeds || !currentBrainstorm?.id}
              onClick={handleGenerateSeeds}
            >
              {generatingSeeds ? '生成中...' : '生成角色种子'}
            </Button>
          </Space>
        </div>
        {seeds.length === 0 ? (
          <div style={{ padding: '16px', color: token.colorTextSecondary, fontSize: '12px', fontStyle: 'italic' }}>
            点击「生成角色种子」后，将基于脑洞、问题、分析与剧情规划抽样生成若干角色种子，可逐条编辑或重骰
          </div>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {seeds.map((seed, idx) => (
              <Card
                key={seed.id}
                size="small"
                title={
                  <Space>
                    <Checkbox
                      checked={selectedSeedIds.has(seed.id)}
                      onChange={(e) => toggleSeedSelected(seed.id, e.target.checked)}
                    />
                    <span>种子 {seedOrdinal(idx)}</span>
                    {seed.edited && <span style={{ color: token.colorWarning, fontSize: '12px' }}>已编辑</span>}
                    <Button
                      type="text"
                      size="small"
                      icon={<ReloadOutlined />}
                      loading={rerollingId === seed.id}
                      onClick={() => handleRerollSeed(seed.id)}
                    >
                      重骰
                    </Button>
                  </Space>
                }
              >
                <Input.TextArea
                  value={seed.content}
                  onChange={(e) => handleSeedContentChange(seed.id, e.target.value)}
                  placeholder="自然语言描述该角色的雏形（定位、特征、剧情钩子等）"
                  autoSize={{ minRows: 3, maxRows: 8 }}
                  style={{ fontSize: '13px' }}
                />
                {draftBySeedId.has(seed.id) && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: token.colorSuccess }}>
                    已生成角色草稿，见下方「角色草稿」区
                  </div>
                )}
              </Card>
            ))}
          </Space>
        )}
      </div>

      {/* 阶段二：角色草稿 */}
      <div style={{ borderTop: `1px solid ${token.colorBorderSecondary}`, paddingTop: '16px' }}>
        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold' }}>角色草稿（角色卡 + 背景）</span>
          <Button
            type="default"
            size="small"
            icon={<UserOutlined />}
            loading={generatingDrafts}
            disabled={generatingDrafts || selectedSeedIds.size === 0 || !currentBrainstorm?.id}
            onClick={handleGenerateDrafts}
          >
            为选中种子生成草稿（{selectedSeedIds.size}）
          </Button>
        </div>
        {drafts.length === 0 ? (
          <div style={{ padding: '12px', color: token.colorTextSecondary, fontSize: '12px', fontStyle: 'italic' }}>
            勾选上方种子后点击「为选中种子生成草稿」，将生成结构化角色卡与背景文本
          </div>
        ) : (
          <Collapse
            items={drafts.map((d, idx) => {
              const card = d.card || {};
              const name = card.name || card.personality || '未命名';
              return {
                key: d.seed_id,
                label: `${name}（种子 ${seedLabel(d.seed_id)}）`,
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '8px' }}>角色卡</div>
                      <div style={{ padding: '12px', background: token.colorFillAlter, borderRadius: '4px', fontSize: '13px' }}>
                        {Object.entries(card).filter(([, v]) => v != null && String(v).trim()).length === 0
                          ? '无结构化字段'
                          : Object.entries(card)
                              .filter(([, v]) => v != null && String(v).trim())
                              .map(([k, v]) => (
                                <div key={k} style={{ marginBottom: '4px' }}>
                                  <span style={{ color: token.colorTextSecondary }}>{k}:</span> {String(v)}
                                </div>
                              ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '8px' }}>角色背景</div>
                      <div
                        style={{
                          padding: '12px',
                          background: token.colorFillAlter,
                          borderRadius: '4px',
                          whiteSpace: 'pre-wrap',
                          fontSize: '13px',
                          lineHeight: 1.6,
                        }}
                      >
                        {d.background || '（无）'}
                      </div>
                    </div>
                  </div>
                ),
              };
            })}
          />
        )}
      </div>
    </div>
  );
}
