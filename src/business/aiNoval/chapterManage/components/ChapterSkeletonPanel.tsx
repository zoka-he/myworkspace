import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Space, Typography, Button, Input, Form, Tag, Select, TreeSelect, Row, Col, GetRef, Divider, Affix } from 'antd'
import { ReloadOutlined, EditOutlined, CopyOutlined, SortAscendingOutlined, RobotOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { IChapter, IWorldViewDataWithExtra, IGeoUnionData, IFactionDefData, IRoleData, ITimelineEvent, IGeoStarSystemData, IGeoGeographyUnitData, IGeoPlanetData, IGeoSatelliteData, IGeoStarData } from '@/src/types/IAiNoval'
import styles from './ChapterSkeletonPanel.module.scss'
import { getTimelineEventByIds, updateChapter, getChapterById, getChapterList } from '../apiCalls'
import _ from 'lodash'
import { TimelineDateFormatter } from '@/src/business/aiNoval/common/novelDateUtils'
import * as apiCalls from '../apiCalls'
import { loadGeoTree, transfromGeoUnionToGeoTree, type IGeoTreeItem } from '../../common/geoDataUtil'
import { ModalProvider, showGenSkeletonModal, useGenSkeletonModal } from './GenSkeletonModal'
import GenRolePanel from './GenRolePanel'
import copyToClip from '@/src/utils/common/copy'
import PromptTools from './PromptTools'
import AttentionRefModal from './AttentionRefModal'
import { message } from '@/src/utils/antdAppMessage'
import { useWorldViewContext } from '../WorldViewContext'
import { useChapterContext } from '../chapterContext'
import { getRoleListForChapter } from '@/src/api/aiNovel'
import roleGroupApiCalls from '@/src/business/aiNoval/roleGroupManage/apiCalls'
import { textDecorationLine } from 'html2canvas/dist/types/css/property-descriptors/text-decoration-line'
import CharacterGroupSelect from '@/src/components/aiNovel/characterGroupSelect'

const { Text } = Typography
const { TextArea } = Input
const { Option } = Select

/** 总体风格快速标签（与 GenChapterByDetailModal 对齐） */
const STYLE_QUICK_TAGS = [
  '第一人称', '第三人称', '快节奏', '细腻描写', '悬疑紧张', '轻松幽默',
  '硬核科幻', '冷硬写实', '诗意抒情', '对话驱动', '环境氛围', '热血战斗',
  '奇幻魔法', '银魂式搞笑', '周星驰式搞笑', '沙丘风',
]

interface ChapterSkeletonPanelProps {
  onEditEventPool: () => void
  onChapterChange: (chapterId: number | null) => void
}

interface ISkeletonItem {
  id: string
  content: string
  order: number
}

function ChapterSkeletonPanel({ 
  // selectedChapterId, 
  // novelId,
  onChapterChange,
  onEditEventPool,
  // onUpdateWorldView
}: ChapterSkeletonPanelProps) {
  const { state: chapterContext, forceUpdateChapter, forceRefreshChapter } = useChapterContext();
  const { worldViewData, geoUnionList, factionList, roleList, roleListForChapter } = useWorldViewContext();

  const [form] = Form.useForm()
  
  const [refreshing, setRefreshing] = useState(false)
  const [isReordering, setIsReordering] = useState(false)

  const [eventList, setEventList] = useState<ITimelineEvent[]>([])

  const [geoTree, setGeoTree] = useState<IGeoTreeItem<IGeoStarSystemData | IGeoStarData | IGeoPlanetData | IGeoSatelliteData | IGeoGeographyUnitData>[]>([])
  const [factionTree, setFactionTree] = useState<IFactionDefData[]>([])

  const [chapterList, setChapterList] = useState<IChapter[]>([])
  const [isGenRoleModalVisible, setIsGenRoleModalVisible] = useState(false)
  const [isAttentionRefModalVisible, setIsAttentionRefModalVisible] = useState(false)
  const [isGeneratingAttention, setIsGeneratingAttention] = useState(false)
  const [isExtractingEntities, setIsExtractingEntities] = useState(false)

  const promptTextAreaRef = useRef<GetRef<typeof Input.TextArea> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLElement | null>(null)

  // 获取事件关联信息
  const locations = useMemo(() => {
    if (!eventList?.length) {
      return chapterContext?.geo_ids || []
    }

    let locations = _.uniq(_.flatten(eventList.map(event => event.location)))
    return locations

  }, [chapterContext?.geo_ids, eventList])

  const factions = useMemo(() => {
    if (!eventList?.length) {
      return chapterContext?.faction_ids || []
    }

    let factions = _.uniq(_.flatten(eventList.map(event => event.faction_ids)))
    return factions
  }, [chapterContext?.faction_ids, eventList])

  const characters = useMemo(() => {
    if (!eventList?.length) {
      return chapterContext?.role_ids || []
    }

    let characters = _.uniq(_.flatten(eventList.map(event => event.role_ids)))
    return characters
  }, [chapterContext?.role_ids, eventList])

  // 查找滚动容器（Card 的 body）
  useEffect(() => {
    if (containerRef.current) {
      // 向上查找最近的 .ant-card-body 元素
      let parent = containerRef.current.parentElement
      while (parent) {
        if (parent.classList.contains('ant-card-body')) {
          scrollContainerRef.current = parent
          break
        }
        parent = parent.parentElement
      }
    }
  }, [])

  useEffect(() => {
    if (geoUnionList) {
      setGeoTree(transfromGeoUnionToGeoTree(geoUnionList)); 
    } else {
      setGeoTree([]);
    }
  }, [geoUnionList])

  // 重新加载章节
  const reloadCurrentChapter = async () => {
    if (chapterContext?.id) {
      await forceUpdateChapter(chapterContext.id);
    }
  }

  useEffect(() => {
    reloadFullChapterList();
  }, [chapterContext?.novel_id])

  // 获取章节列表
  const reloadFullChapterList = async () => {
    if (chapterContext?.novel_id) {
      const res = await getChapterList(chapterContext.novel_id, 1, 2000)
      setChapterList(res.data)
    } else {
      setChapterList([])
    }
  }

  
  // 当章节数据变更时，获取事件关联信息
  useEffect(() => {
    (async () => {
      if (!chapterContext?.event_ids?.length) {
        setEventList([]);
        return;
      }

      let timelineEvents = (await getTimelineEventByIds(chapterContext.event_ids)).data || []
      setEventList(timelineEvents);
    })();
  }, [chapterContext])

  // 监听关联信息变化，更新表单
  useEffect(() => {
    if (chapterContext) {
      console.debug('Updating form with chapter data:', chapterContext);

      // 应用章节数据
      form.setFieldsValue({
        geo_ids: chapterContext.geo_ids || [],
        faction_ids: chapterContext.faction_ids || [],
        role_ids: (chapterContext.role_ids || []).map(String),
        role_group_ids: chapterContext.role_group_ids || [],
        seed_prompt: chapterContext.seed_prompt || '',
        related_chapter_ids: chapterContext.related_chapter_ids || [],
        skeleton_prompt: chapterContext.skeleton_prompt || '',
        extra_settings: chapterContext.extra_settings || '',
        attension: chapterContext.attension || '',
        chapter_style: chapterContext.chapter_style || ''
      })
    }
  }, [chapterContext])

  // 当阵营列表更新时，自动构建阵营树
  useEffect(() => {
    if (!factionList || !factionList.length) {
      setFactionTree([]);
      return;
    }

    const result: IFactionDefData[] = [];

    const factionMap = new Map(); 
    factionList.forEach(item => {
      factionMap.set(item.id, { key: item.id, title: item.name, data: item, children: [] })
    });

    factionList.forEach(item => {
      if (item.parent_id) {
        const parent = factionMap.get(item.parent_id);
        const child = factionMap.get(item.id);
        if (parent && child) {
          parent.children.push(child);
        }
      } else {
        result.push(factionMap.get(item.id));
      }
    });

    setFactionTree(result);

  }, [])

  
  

  // 处理刷新
  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      await reloadCurrentChapter()
      await reloadFullChapterList()
      message.success('刷新成功')
    } catch (error) {
      message.error('刷新失败')
    } finally {
      setRefreshing(false)
    }
  }

  /** 从 geo 树中收集 code -> name 映射（递归） */
  const collectGeoCodeToName = (
    nodes: IGeoTreeItem<IGeoStarSystemData | IGeoStarData | IGeoPlanetData | IGeoSatelliteData | IGeoGeographyUnitData>[],
    acc: Map<string, string>
  ): void => {
    if (!nodes?.length) return
    for (const node of nodes) {
      if (node.key) acc.set(String(node.key), node.title || '')
      if (node.children?.length) collectGeoCodeToName(node.children as IGeoTreeItem<IGeoStarSystemData | IGeoStarData | IGeoPlanetData | IGeoSatelliteData | IGeoGeographyUnitData>[], acc)
    }
  }

  /** 从 geo 树中收集 name -> keys 映射（用于 Agent 提取后按名称匹配地点） */
  const collectGeoNameToKeys = (
    nodes: IGeoTreeItem<IGeoStarSystemData | IGeoStarData | IGeoPlanetData | IGeoSatelliteData | IGeoGeographyUnitData>[],
    acc: Map<string, string[]>
  ): void => {
    if (!nodes?.length) return
    for (const node of nodes) {
      const name = (node.title || '').trim()
      if (name && node.key) {
        const keys = acc.get(name) || []
        if (!keys.includes(String(node.key))) keys.push(String(node.key))
        acc.set(name, keys)
      }
      if (node.children?.length) collectGeoNameToKeys(node.children as IGeoTreeItem<IGeoStarSystemData | IGeoStarData | IGeoPlanetData | IGeoSatelliteData | IGeoGeographyUnitData>[], acc)
    }
  }

  /** 解析 pick 接口返回的文本为名称列表（支持换行、逗号、顿号、空格分隔；去除行首编号与前缀） */
  const parsePickNames = (raw: string): string[] => {
    if (!raw || typeof raw !== 'string') return []
    const skipValues = ['无', '无。', '暂无', '没有', '无相关']
    const items = raw
      .split(/[\n,，、\s]+/)
      .map((s) =>
        s
          .trim()
          .replace(/^\d+[.．、]\s*/, '') // 去掉 "1. " "1、"
          .replace(/^[名称：:]\s*/i, '')
          .trim()
      )
      .filter((s) => Boolean(s) && !skipValues.includes(s))
    return _.uniq(items)
  }

  /** 匹配用规范化：去空格、全角转半角（仅数字/英文），便于 LLM 返回与后台名称一致 */
  const normalizeNameForMatch = (s: string): string => {
    const t = (s || '').trim().replace(/\s+/g, '')
    return t
  }

  /** 部分匹配：提取名与实体名任一方包含另一方即视为匹配（用于不完整名称）；比较前先规范化 */
  const isPartialNameMatch = (extracted: string, entityName: string): boolean => {
    const a = normalizeNameForMatch(extracted)
    const b = normalizeNameForMatch(entityName)
    if (!a || !b) return false
    return b.includes(a) || a.includes(b)
  }

  /** 精确匹配（规范化后相等） */
  const isExactNameMatch = (extracted: string, entityName: string): boolean => {
    return normalizeNameForMatch(extracted) === normalizeNameForMatch(entityName)
  }

  /** Agent 从章节提示词与相关章节摘要中提取关联地点、阵营、角色，并自动更正表单选项 */
  const handleAgentFillEntities = async () => {
    if (!worldViewData?.id) {
      message.warning('请先选择世界观')
      return
    }
    const values = form.getFieldsValue()
    const seedPrompt = values.seed_prompt || ''
    const skeletonPrompt = values.skeleton_prompt || ''
    const relatedIds: number[] = Array.isArray(values.related_chapter_ids) ? values.related_chapter_ids : []

    const relatedSummaries: string[] = []
    for (const id of relatedIds) {
      try {
        const ch = await getChapterById(Number(id))
        const sum = (ch?.summary ?? '').toString().trim()
        if (sum) relatedSummaries.push(`【相关章节 ${ch?.chapter_number ?? id}】\n${sum}`)
      } catch {
        // 单章失败不影响其余
      }
    }

    const combinedText = [
      seedPrompt,
      skeletonPrompt,
      relatedSummaries.length ? '相关章节摘要：\n' + relatedSummaries.join('\n\n') : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    if (!combinedText.trim()) {
      message.warning('请先填写章节提示词或选择并加载相关章节摘要')
      return
    }

    const LOG = '[AgentFillEntities]'
    console.debug(LOG, '0. 当前世界观数据', {
      worldViewId: worldViewData?.id,
      geoTreeLength: geoTree?.length,
      factionListLength: factionList?.length,
      roleListForChapterLength: roleListForChapter?.length,
    })
    setIsExtractingEntities(true)
    try {
      const [locationsRaw, factionsRaw, rolesRaw] = await Promise.all([
        apiCalls.pickFromText('locations', combinedText),
        apiCalls.pickFromText('factions', combinedText),
        apiCalls.pickFromText('roles', combinedText),
      ])

      console.debug(LOG, '1. pick API 原始返回', {
        locationsRaw: typeof locationsRaw === 'string' ? locationsRaw.slice(0, 300) + (locationsRaw.length > 300 ? '...' : '') : locationsRaw,
        factionsRaw: typeof factionsRaw === 'string' ? factionsRaw.slice(0, 300) + (factionsRaw.length > 300 ? '...' : '') : factionsRaw,
        rolesRaw: typeof rolesRaw === 'string' ? rolesRaw.slice(0, 300) + (rolesRaw.length > 300 ? '...' : '') : rolesRaw,
      })

      const locationNames = parsePickNames(locationsRaw)
      const factionNames = parsePickNames(factionsRaw)
      const roleNames = parsePickNames(rolesRaw)
      console.debug(LOG, '2. 解析后的名称列表', { locationNames, factionNames, roleNames })

      const geoNameToKeys = new Map<string, string[]>()
      collectGeoNameToKeys(geoTree, geoNameToKeys)
      const geoEntries = Array.from(geoNameToKeys.entries()).map(([k, v]) => `${k}->[${v.join(',')}]`)
      console.debug(LOG, '3. 地点候选 geoNameToKeys', { size: geoNameToKeys.size, geoTreeNodes: geoTree?.length, entries: geoEntries.slice(0, 25) })

      const geoIds: string[] = []
      for (const name of locationNames) {
        const exactKeys =
          Array.from(geoNameToKeys.entries())
            .filter(([title]) => isExactNameMatch(name, title))
            .flatMap(([, keys]) => keys) ||
          geoNameToKeys.get(name) ||
          []
        const partialEntries = Array.from(geoNameToKeys.entries()).filter(([title]) => isPartialNameMatch(name, title))
        const partialKeys = partialEntries.flatMap(([, keys]) => keys)
        console.debug(LOG, '  地点匹配', { extracted: name, normalized: normalizeNameForMatch(name), exactKeys, partialTitles: partialEntries.map(([t]) => t), partialKeys })
        geoIds.push(...exactKeys, ...partialKeys)
      }
      const resolvedGeoIds = _.uniq(geoIds)

      const factionNamesFromData = (factionList || []).map((f) => f.name || '')
      console.debug(LOG, '4. 阵营候选 factionList', { count: factionList?.length ?? 0, names: factionNamesFromData })

      const factionIds: number[] = []
      for (const name of factionNames) {
        const exact = factionList?.find((x) => isExactNameMatch(name, x.name || ''))
        const partial = factionList?.filter((x) => isPartialNameMatch(name, x.name || '')) || []
        const matched = exact ? [exact] : partial
        console.debug(LOG, '  阵营匹配', { extracted: name, normalized: normalizeNameForMatch(name), exact: exact ? { id: exact.id, name: exact.name } : null, partialNames: partial.map((p) => p.name), matchedIds: matched.map((f) => f.id) })
        matched.forEach((f) => { if (f?.id != null) factionIds.push(f.id) })
      }
      const resolvedFactionIds = _.uniq(factionIds)

      const roleItemsPreview = (roleListForChapter || []).slice(0, 15).map((r) => ({ name: r.name, version_name: r.version_name, union_id: r.union_id }))
      console.debug(LOG, '5. 角色候选 roleListForChapter', { count: roleListForChapter?.length ?? 0, items: roleItemsPreview })

      const roleIds: string[] = []
      for (const name of roleNames) {
        const exact = roleListForChapter?.find(
          (x) =>
            isExactNameMatch(name, x.name || '') ||
            isExactNameMatch(name, String(x.version_name ?? ''))
        )
        const partial =
          roleListForChapter?.filter(
            (x) =>
              isPartialNameMatch(name, x.name || '') ||
              isPartialNameMatch(name, String(x.version_name ?? ''))
          ) || []
        const matched = exact ? [exact] : partial
        console.debug(LOG, '  角色匹配', { extracted: name, normalized: normalizeNameForMatch(name), exact: exact ? { union_id: exact.union_id, name: exact.name, version_name: exact.version_name } : null, partialCount: partial.length, matchedUnionIds: matched.map((r) => r.union_id) })
        matched.forEach((r) => { if (r?.union_id) roleIds.push(String(r.union_id)) })
      }
      const resolvedRoleIds = _.uniq(roleIds)

      // 根据匹配到的角色尝试自动补全角色组
      let resolvedRoleGroupIds: number[] = []
      try {
        const worldviewId = worldViewData?.id
        if (worldviewId && resolvedRoleIds.length && roleListForChapter?.length) {
          // 1）先把 union_id -> info_id 建立映射
          const unionIdToInfoId = new Map<string, number>()
          for (const r of roleListForChapter) {
            if (r.union_id && r.info_id != null) {
              unionIdToInfoId.set(String(r.union_id), Number(r.info_id))
            }
          }

          const selectedInfoIds = resolvedRoleIds
            .map((id) => unionIdToInfoId.get(String(id)))
            .filter((v): v is number => v != null)

          console.debug(LOG, '6.1 角色 info_id 映射', {
            unionIdToInfoIdSize: unionIdToInfoId.size,
            selectedInfoIds,
          })

          if (selectedInfoIds.length) {
            // 2）获取世界观下的所有活跃角色组
            const groupResp = await roleGroupApiCalls.getRoleGroupList(worldviewId, {
              limit: 500,
              group_status: 'active',
            })
            const groups = (groupResp as { data?: any[] })?.data || []

            console.debug(LOG, '6.2 角色组列表', {
              worldviewId,
              groupCount: groups.length,
            })

            const roleGroupMembersMap = new Map<number, number[]>()

            // 优先使用列表中已经带上的 members 字段，避免额外请求
            for (const g of groups) {
              if (g?.id == null) continue
              const members = Array.isArray(g.members) ? g.members : []
              if (members.length) {
                roleGroupMembersMap.set(
                  Number(g.id),
                  members
                    .map((m: any) => m.role_info_id)
                    .filter((v: any): v is number => v != null)
                    .map((v: any) => Number(v)),
                )
              }
            }

            // 如果大部分 group 没有 members，再按需补充请求
            if (roleGroupMembersMap.size === 0 && groups.length) {
              const memberResults = await Promise.all(
                groups
                  .filter((g: any) => g?.id != null)
                  .map(async (g: any) => {
                    try {
                      const members = await roleGroupApiCalls.getRoleGroupMembers(Number(g.id))
                      return {
                        id: Number(g.id),
                        members: Array.isArray((members as any)?.data)
                          ? (members as any).data
                          : (members as any),
                      }
                    } catch (e) {
                      console.warn(LOG, 'getRoleGroupMembers 失败', g.id, e)
                      return { id: Number(g.id), members: [] as any[] }
                    }
                  }),
              )

              for (const item of memberResults) {
                const memberInfoIds = (item.members || [])
                  .map((m: any) => m.role_info_id)
                  .filter((v: any): v is number => v != null)
                  .map((v: any) => Number(v))
                if (memberInfoIds.length) {
                  roleGroupMembersMap.set(item.id, memberInfoIds)
                }
              }
            }

            console.debug(LOG, '6.3 角色组成员映射', {
              groupCount: groups.length,
              mappedGroups: roleGroupMembersMap.size,
            })

            const matchedGroupIds: number[] = []
            roleGroupMembersMap.forEach((memberInfoIds, groupId) => {
              const hasIntersection = memberInfoIds.some((infoId) => selectedInfoIds.includes(infoId))
              if (hasIntersection) {
                matchedGroupIds.push(groupId)
              }
            })

            resolvedRoleGroupIds = _.uniq(matchedGroupIds)

            console.debug(LOG, '6.4 基于角色匹配到的角色组', {
              resolvedRoleGroupIds,
            })
          }
        }
      } catch (e) {
        console.warn(LOG, '自动回填角色组失败（忽略不中断主流程）', e)
      }

      console.debug(LOG, '7. 最终结果', { resolvedGeoIds, resolvedFactionIds, resolvedRoleIds, resolvedRoleGroupIds })

      const currentValues = form.getFieldsValue()
      const mergedRoleGroupIds = _.uniq([
        ...(Array.isArray(currentValues.role_group_ids) ? currentValues.role_group_ids : []),
        ...resolvedRoleGroupIds,
      ])

      form.setFieldsValue({
        geo_ids: resolvedGeoIds,
        faction_ids: resolvedFactionIds,
        role_ids: resolvedRoleIds,
        role_group_ids: mergedRoleGroupIds,
      })
      const parts = []
      if (resolvedGeoIds.length) parts.push(`地点 ${resolvedGeoIds.length} 个`)
      if (resolvedFactionIds.length) parts.push(`阵营 ${resolvedFactionIds.length} 个`)
      if (resolvedRoleIds.length) parts.push(`角色 ${resolvedRoleIds.length} 个`)
      if (mergedRoleGroupIds.length) parts.push(`角色组 ${mergedRoleGroupIds.length} 个`)
      message.success(parts.length ? `已根据提示词与相关章节摘要补全：${parts.join('、')}` : '未匹配到可用的地点/阵营/角色/角色组，请检查世界观配置或提示词')
    } catch (e: unknown) {
      console.error(LOG, 'Agent 提取失败', e)
      message.error((e as Error)?.message || 'Agent 提取关联信息失败')
    } finally {
      setIsExtractingEntities(false)
    }
  }

  /** 注意事项 AI 生成（与 ChapterContinueModal 一致）：根据本章要点与设定生成，生成后直接覆盖。输入项为表单的 ID/编码，需转换为 API 需要的名称字符串 */
  const handleGenAttention = async () => {
    const worldviewId = worldViewData?.id
    if (!worldviewId) {
      message.error('无法获取世界观，请先选择世界观')
      return
    }
    const values = form.getFieldsValue()
    const seedPrompt = values.seed_prompt || ''

    const processTreeSelectValue = <T extends string | number>(value: T | { value: T }): T =>
      typeof value === 'object' && value !== null && 'value' in value ? (value as { value: T }).value : value
    const processIds = <T extends string | number>(value: T[] | { value: T }[] | T | undefined): T[] =>
      !value ? [] : Array.isArray(value) ? (value.map(processTreeSelectValue) as T[]) : []

    const roleIds = processIds<string>(values.role_ids)
    const factionIds = processIds<number>(values.faction_ids)
    const geoIds = processIds<string>(values.geo_ids)

    const roleNames = (roleListForChapter || [])
      .filter((r) => r.union_id != null && roleIds.includes(r.union_id))
      .map((r) => r.name ?? '')
      .filter(Boolean)
      .join('，') || ''
    const factionNames = (factionList || [])
      .filter((f) => f.id != null && factionIds.includes(f.id))
      .map((f) => f.name ?? '')
      .filter(Boolean)
      .join('，') || ''
    const geoCodeToName = new Map<string, string>()
    collectGeoCodeToName(geoTree, geoCodeToName)
    const geoNames = geoIds.map((code: string) => geoCodeToName.get(code) || code).filter(Boolean).join('，') || ''

    setIsGeneratingAttention(true)
    try {
      const text = await apiCalls.genChapterAttention({
        worldview_id: worldviewId,
        curr_context: seedPrompt,
        role_names: roleNames,
        faction_names: factionNames,
        geo_names: geoNames,
        chapter_style: values.chapter_style || '',
      })
      form.setFieldsValue({ attension: text || '' })
      if (text) message.success('注意事项已生成')
      else message.warning('未生成内容')
    } catch (e: unknown) {
      message.error((e as Error)?.message || '生成注意事项失败')
    } finally {
      setIsGeneratingAttention(false)
    }
  }

  // 从关联信息复制
  const copyFromWorldView = (type: 'geo' | 'faction' | 'role') => {
    if (!worldViewData) {
      message.warning('请先选择世界观')
      return
    }

    let sourceData: (string | number)[] = []
    let emptyMessage = ''

    switch (type) {
      case 'geo':
        sourceData = Array.from(locations)
        emptyMessage = '世界观中暂无关联地点'
        break
      case 'faction':
        sourceData = Array.from(factions)
        emptyMessage = '世界观中暂无关联阵营'
        break
      case 'role':
        sourceData = Array.from(characters).map(def_id => {
          const roleForChapter = roleListForChapter?.find(
            role => role.union_id === def_id || String(role.role_id) === String(def_id)
          );
          return roleForChapter?.union_id;
        }).filter((union_id): union_id is string => union_id != null);
        emptyMessage = '世界观中暂无关联角色'
        break
    }

    if (!sourceData.length) {
      message.warning(emptyMessage)
      return
    }

    const currentValues = form.getFieldsValue()
    let newValues = { ...currentValues }

    switch (type) {
      case 'geo':
        newValues.geo_ids = sourceData
        break
      case 'faction':
        newValues.faction_ids = sourceData
        break
      case 'role':
        newValues.role_ids = sourceData
        break
    }

    form.setFieldsValue(newValues)
    message.success('已从关联信息复制关联信息')
  }

  // 保存章节关联信息
  const handleSaveChapterInfo = async () => {
    try {
      const values = await form.validateFields()
      if (!chapterContext?.id) {
        message.warning('请先选择章节')
        return
      }

      // 处理飘忽不定的树选择器值，fuck antd
      const processTreeSelectValue = <T extends string | number>(value: T | { value: T }): T => {
        if (typeof value === 'string') {
          return value;
        }

        if (typeof value === 'number') {
          return value;
        }

        return value.value;
      }

      // 处理异常值
      const processIds = <T extends string | number>(value: T[] | { value: T }[] | T | undefined): T[] => {
        if (!value) {
          return [];
        }

        if (value instanceof Array) {
          return value.map(processTreeSelectValue<T>)
        } else {
          return [];
        }
      }

      let updateObject: IChapter = {
        id: chapterContext.id,
        geo_ids: processIds<string>(values.geo_ids),
        faction_ids: processIds<number>(values.faction_ids),
        role_ids: processIds<string>(values.role_ids),
        role_group_ids: processIds<number>(values.role_group_ids),
        seed_prompt: values.seed_prompt,
        related_chapter_ids: values.related_chapter_ids,
        skeleton_prompt: values.skeleton_prompt,
        attension: values.attension,
        chapter_style: values.chapter_style,
        extra_settings: values.extra_settings
      };

      // console.debug('updateObject', updateObject);

      await updateChapter(updateObject);
      message.success('保存成功')

      onChapterChange(chapterContext.id)
      // await forceRefreshChapter();
    } catch (error) {
      console.error('保存失败', error);
      message.error('保存失败：' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  // 格式化小说时间
  const formatDate = (date: number) => {
    if (!worldViewData) {
      return '时间点 ' + date
    }

    const timelineDateFormatter = TimelineDateFormatter.fromWorldViewWithExtra(worldViewData)
    return timelineDateFormatter.formatSecondsToDate(date)
  }

  // 添加关联上一章
  const handleAddPreviousChapter = () => {
    if (!chapterList.length) {
      message.warning('未加载到章节，请检查数据或代码')
      return
    }

    let currentChapterNumber = chapterContext?.chapter_number;
    let currentChaoterVersion = chapterContext?.version;

    if (!currentChapterNumber || !currentChaoterVersion) {
      message.warning('当前章节号或版本号缺失，请检查数据或代码')
      return
    }

    let previousChapter = chapterList.find(chapter => chapter.chapter_number === currentChapterNumber! - 1 && chapter.version === currentChaoterVersion)
    if (!previousChapter) {
      message.warning('未找到上一章节，请确认不是第一章、不是故事线第一张，再检查数据或代码');
      return
    }
    
    // 假如上一章不在列表中，加入列表
    const currentValues = form.getFieldsValue()
    const relatedChapters = currentValues.related_chapter_ids || []
    if (!relatedChapters.includes(previousChapter.id)) {
      relatedChapters.push(previousChapter.id)
    }

    // 按章节id排序
    const sortedChapters = [...relatedChapters].sort((a, b) => a - b)
    
    // 更新表单值
    form.setFieldsValue({
      related_chapter_ids: sortedChapters
    })

  }

  // 处理章节重排序
  const handleReorderChapters = () => {
    const currentValues = form.getFieldsValue()
    const relatedChapters = currentValues.related_chapter_ids || []
    
    if (relatedChapters.length <= 1) {
      message.warning('请先选择多个相关章节')
      return
    }

    setIsReordering(true)
    
    // 获取选中章节的详细信息
    const selectedChapters = relatedChapters.map((chapterId: number) => 
      chapterList.find(chapter => chapter.id === chapterId)
    ).filter((chapter: IChapter | undefined): chapter is IChapter => 
      chapter !== undefined && typeof chapter.chapter_number === 'number'
    )

    // 按章节号排序
    const sortedChapters = [...selectedChapters].sort((a, b) => a.chapter_number - b.chapter_number)
    
    // 更新表单值
    form.setFieldsValue({
      related_chapter_ids: sortedChapters.map(chapter => chapter.id)
    })

    message.success('已按章节号重新排序')
    setIsReordering(false)
  }


  return (
    <div ref={containerRef} className={styles.container}>
      <ModalProvider>
        {/* 世界观信息展示 */}
        <div className={styles.worldViewInfo}>
          {worldViewData ? (
            <>
              <div className={styles.worldViewTitle}>
                <Space>
                  <Text strong>世界观：</Text>
                  <Text>{worldViewData.title}</Text>
                  <Button type="link" icon={<ReloadOutlined />} onClick={handleRefresh} loading={refreshing}>
                    刷新
                  </Button>
                </Space>
              </div>

              <div className={styles.relatedInfo}>
                <div className={styles.relatedInfoItem}>
                  <Text strong>关联地点：</Text>
                  <div className={styles.tagsContainer}>
                    {locations.length > 0 ? (
                      locations.map((code) => (
                        <LocationTag key={code} code={code} />
                      ))
                    ) : (
                      <Text type="secondary">暂无关联地点</Text>
                    )}
                  </div>
                </div>

                <div className={styles.relatedInfoItem}>
                  <Text strong>关联阵营：</Text>
                  <div className={styles.tagsContainer}>
                    {factions.length > 0 ? (
                      factions.map((faction, index) => (
                        <FactionTag key={index} faction={faction} />
                      ))
                    ) : (
                      <Text type="secondary">暂无关联阵营</Text>
                    )}
                  </div>
                </div>
                <div className={styles.relatedInfoItem}>
                  <Text strong>关联角色：</Text>
                  <div className={styles.tagsContainer}>
                    {characters.length > 0 ? (
                      characters.map((character, index) => (
                        <CharacterTag key={index} character={character} />
                      ))
                    ) : (
                      <Text type="secondary">暂无关联角色</Text>
                    )}
                  </div>
                </div>

                {/* <div className={styles.relatedInfoItem}>
                  <Text strong>关联事件：</Text>
                  <div className={styles.eventsContainer}>
                    {eventList.length > 0 ? (
                      eventList.map((event, index) => (
                        <EventTag key={index} event={event} />
                      ))
                    ) : (
                      <Text type="secondary">暂无关联事件</Text>
                    )}
                  </div>
                </div> */}
              </div>
            </>
          ) : (
            <div className={styles.emptyWorldView}>
              <Space direction="vertical" align="center" style={{ width: '100%' }}>
                <Text type="secondary">请先编辑章节事件池，设置世界观和关联信息</Text>
                <Space>
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={onEditEventPool}
                  >
                    编辑事件池
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={handleRefresh}
                    loading={refreshing}
                  >
                    刷新
                  </Button>
                </Space>
              </Space>
            </div>
          )}
        </div>

        {/* 章节关联信息表单 */}
        <Form
          form={form}
          className={styles.chapterInfo}
          layout="vertical"
        >
          <div className={styles.formHeader}>
            <Text strong>章节关联信息</Text>
            <Button type="primary" onClick={handleSaveChapterInfo}>
              保存
            </Button>
          </div>

          <Form.Item label={
              <div className={styles.formItemLabel}>
                <Text strong>相关章节</Text>
                <Button
                  type="link"
                  icon={<CopyOutlined />}
                  onClick={handleAddPreviousChapter}
                >
                  关联上一章
                </Button>
                <Button
                  type="link"
                  icon={<SortAscendingOutlined />}
                  onClick={handleReorderChapters}
                  loading={isReordering}
                >
                  重排序
                </Button>
              </div>
            } name="related_chapter_ids">
            <Select
              mode="multiple"
              placeholder="请选择相关章节"
              optionFilterProp="children"
              className={styles.multiSelect}
            >
              { chapterList.reverse().map(chapter => (
                <Select.Option value={chapter.id}>{chapter.chapter_number} {chapter.title} : v{chapter.version}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label={
              <div className={styles.formItemLabel}>
                <Text strong>章节关联地点</Text>
                <Button
                  type="link"
                  icon={<CopyOutlined />}
                  onClick={() => copyFromWorldView('geo')}
                  disabled={!locations?.length}
                >
                  从关联信息复制
                </Button>
                
              </div>
            }
            name="geo_ids"
          >
            <TreeSelect
              treeData={geoTree || []}
              placeholder="请选择发生地点"
              allowClear
              treeDefaultExpandAll
              showSearch
              treeNodeFilterProp="title"
              multiple
              treeCheckable
              treeCheckStrictly={true}
              showCheckedStrategy={TreeSelect.SHOW_ALL}
              fieldNames={{label:'title', value: 'key'}}    // fuck antd
            >
            </TreeSelect>
          </Form.Item>

          <Form.Item
            label={
              <div className={styles.formItemLabel}>
                <Text strong>章节关联阵营</Text>
                <Button
                  type="link"
                  icon={<CopyOutlined />}
                  onClick={() => copyFromWorldView('faction')}
                  disabled={!factions?.length}
                >
                  从关联信息复制
                </Button>
              </div>
            }
            name="faction_ids"
          >
            <TreeSelect
              treeData={factionTree || []}
              placeholder="请选择关联阵营"
              allowClear
              treeDefaultExpandAll
              showSearch
              treeNodeFilterProp="title"
              multiple
              treeCheckable
              treeCheckStrictly={true}
              showCheckedStrategy={TreeSelect.SHOW_ALL}
              fieldNames={{label:'title', value: 'key'}}    // fuck antd
            >
            </TreeSelect>
          </Form.Item>

          <Form.Item
            label={
              <div className={styles.formItemLabel}>
                <Text strong>章节关联角色组</Text>
              </div>
            }
            name="role_group_ids"
          >
            <CharacterGroupSelect
              worldviewId={worldViewData?.id || null}
            />
          </Form.Item>

          <Form.Item
            label={
              <div className={styles.formItemLabel}>
                <Text strong>章节关联角色</Text>
                <Button
                  type="link"
                  icon={<CopyOutlined />}
                  onClick={() => copyFromWorldView('role')}
                  disabled={!characters?.length}
                >
                  从关联信息复制
                </Button>
                <Button
                  type="link"
                  icon={<RobotOutlined />}
                  onClick={() => setIsGenRoleModalVisible(true)}
                >
                  获取人设灵感
                </Button>
              </div>
            }
            name="role_ids"
          >
            <Select
              mode="multiple"
              placeholder="请选择关联角色"
              showSearch
              optionFilterProp="label"
              className={styles.multiSelect}
            >
              {(roleListForChapter || []).map(role => {
                let factionName = factionList?.find(faction => faction.id === role.faction_id)?.name;
                let factionTag = factionName ? <Tag color="green">{factionName}</Tag> : <Tag>无阵营</Tag>;

                let disabledProps = role.is_enabled === 'N' ? { textDecoration: 'line-through', color: 'red' } : {};

                return (
                  <Option
                    key={role.union_id}
                    value={role.union_id}
                    label={`${role.name || ''} ${factionName || ''} ${role.version_name || ''}`}
                    style={{ display: 'inline-block' }}
                  >
                    <Space>
                      <div style={{ minWidth: 130 }}>
                        {factionTag}
                      </div>
                      <div style={{ minWidth: 160, ...disabledProps }}>
                        {role.name}
                      </div>
                      <Tag color="purple">{role.version_name}</Tag>
                    </Space>
                  </Option>
                )
              })}
            </Select>
          </Form.Item>

          

          <div>
            <Text strong>注意事项：</Text>
            <Button type="link" size="small" loading={isGeneratingAttention} onClick={handleGenAttention}>AI 生成</Button>
            <Button type="link" icon={<InfoCircleOutlined />} onClick={() => setIsAttentionRefModalVisible(true)}>注意事项参考模板</Button>
          </div>
          <Form.Item label={null} name="attension">
            <TextArea autoSize={{ minRows: 1 }} placeholder="扩写注意事项，可点击「AI 生成」由 AI 根据本章要点与设定生成（生成后直接覆盖）" />
          </Form.Item>

          <div className={styles.formItemLabel} style={{ marginBottom: 8 }}>
            <Text strong>章节总体风格（文风）：</Text>
          </div>
          <Space wrap size={[6, 6]} style={{ marginBottom: 8 }}>
            {STYLE_QUICK_TAGS.map((tag) => (
              <Tag
                key={tag}
                style={{ cursor: 'pointer', marginRight: 0 }}
                onClick={() => {
                  const values = form.getFieldsValue()
                  const current = values.chapter_style || ''
                  const next = current.trim() ? `${current.trim()}，${tag}` : tag
                  form.setFieldsValue({ chapter_style: next })
                }}
              >
                {tag}
              </Tag>
            ))}
          </Space>
          <Form.Item label={null} name="chapter_style">
            <TextArea
              autoSize={{ minRows: 2 }}
              placeholder="叙述视角、文风、节奏等整体风格要求（可选），可点击上方标签快速填入"
            />
          </Form.Item>

          <div>
            <Text strong>额外设置：(慎用，会触发全库检索，产生巨大耗时，建议先切换GPU)。</Text>
          </div>
          <Form.Item label={null} name="extra_settings">
            <TextArea autoSize={{ minRows: 1 }} />
          </Form.Item>

          <Divider size='large'/>
          <Row gutter={8}>
            <Col span={6}>
              <Affix offsetTop={12} target={() => scrollContainerRef.current || window}>
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong>关联事件</Text>
                  </div>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {eventList.length > 0 ? (
                      eventList.map((event, index) => (
                        <EventTag key={index} event={event} />
                      ))
                    ) : (
                      <Text type="secondary">暂无关联事件</Text>
                    )}
                  </Space>
                </div>
              </Affix>
            </Col>
            <Col span={18}>
              <div className="f-flex-two-side f-fit-width" style={{marginBottom: 12}}>
                <Space>
                  <Text strong>章节提示词</Text>
                  <Button
                    type="link"
                    size="small"
                    icon={<RobotOutlined />}
                    onClick={handleAgentFillEntities}
                    loading={isExtractingEntities}
                  >
                    Agent 自动补全地点、阵营、角色
                  </Button>
                </Space>
                <Space>
                  <Button size="small" type="primary" onClick={handleSaveChapterInfo}>保存</Button>
                  <Button size="small" type="primary" danger onClick={() => handleSaveChapterInfo()}>保存并覆盖实际配置</Button>
                </Space>
              </div>
              
              <div className="f-flex-row">
                <div className="f-flex-1">
                  <Form.Item
                    label={null}
                    name="seed_prompt"
                  >
                    <TextArea
                      ref={promptTextAreaRef}
                      placeholder="请输入章节根提示词"
                      autoSize={{ minRows: 22 }}
                      className={styles.promptTextArea}
                      showCount
                    />
                  </Form.Item>
                </div>
                <div style={{ marginLeft: 10 }}>
                  <Affix offsetTop={12} target={() => scrollContainerRef.current || window}>
                    <PromptTools
                      promptTextArea={promptTextAreaRef?.current}
                      layout="vertical"
                      onChange={(prompt) => {
                        form.setFieldsValue({
                          seed_prompt: prompt
                        });
                      }}
                    />
                  </Affix>
                </div>
              </div>
            </Col>
          </Row>
        </Form>

      </ModalProvider>

      <GenRolePanel
          open={isGenRoleModalVisible}
          onCancel={() => setIsGenRoleModalVisible(false)}
          onOk={() => {}}
          worldviewId={worldViewData?.id}
          title="生成角色人设建议"
          width="80vw"
          rootPrompt={() => form.getFieldsValue()['seed_prompt']}
        />

      <AttentionRefModal
        isVisible={isAttentionRefModalVisible}
        onClose={() => setIsAttentionRefModalVisible(false)}
        content={''}
        onApply={(str) => {
          form.setFieldsValue({
            attension: str
          });
        }}
      />

    </div>
  )
}

function FactionTag({ faction }: { faction: number }) {
  const { factionList } = useWorldViewContext();
  const factionItem = factionList?.find(item => item.id === faction);
  return <Tag color="green">{factionItem?.name}</Tag>
}

function CharacterTag({ character }: { character: number | string }) {
  const { roleList, roleListForChapter } = useWorldViewContext();
  const byUnionId = typeof character === 'string' ? roleListForChapter?.find(r => r.union_id === character) : undefined;
  const byRoleId = roleList?.find(item => item.id === Number(character));
  const characterItem = byUnionId ?? byRoleId;
  return <Tag color="purple">{characterItem?.name}</Tag>
}

function LocationTag({ code }: { code: string }) {
  const { geoUnionList } = useWorldViewContext();
  const locationItem = geoUnionList?.find(item => item.code === code);
  return <Tag color="blue">{locationItem?.name}</Tag>
}

function formatDate(date: number, worldViewData?: IWorldViewDataWithExtra | null) {
  if (!worldViewData) {
    return '时间点 ' + date
  }

  const timelineDateFormatter = TimelineDateFormatter.fromWorldViewWithExtra(worldViewData)
  return timelineDateFormatter.formatSecondsToDate(date)
}

function EventTag({ event }: { event: ITimelineEvent }) {
  const { worldViewData } = useWorldViewContext();

  return (
    <div className={styles.eventCard}>
      <div className={styles.eventCardHeader}>
        <div className={styles.eventCardTitle}>{event.title}</div>
        <div className={styles.eventCardTimestamp}>
          {formatDate(event.date, worldViewData)}
        </div>
      </div>
      <div className={styles.eventCardDescription}>
        <Space>
          {event.description}
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => {
              const formattedDate = formatDate(event.date, worldViewData)
              const copyText = `${formattedDate}\n${event.title}\n${event.description}`
              try {
                copyToClip(copyText)
                message.success('已复制到剪贴板')
              } catch (error) {
                console.error('handleCopyEvent error -> ', error)
                message.error('复制失败')
              }
            }}
            title="复制事件内容"
          />
        </Space>
      </div>
    </div>
  )
}

export default ChapterSkeletonPanel 