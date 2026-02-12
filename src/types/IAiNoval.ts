export interface INovalData {
    id?: number | null,
    title?: string | null,
    description?: string | null,
    createdAt?: Date | null,
    updatedAt?: Date | null,
}

export interface IWorldViewData {
    id?: number | null,
    title?: string | null,
    content?: string | null,
    is_dify_knowledge_base?: number | null,
    base_timeline_id?: number | null,
    worldrule_snapshot_id?: number | null,
}

export interface IGeoStarSystemData {
    id?: number | null,
    worldview_id?: number | null,
    name?: string | null,
    code?: string | null,
    described_in_llm?: number | null,
    dify_document_id?: string | null,
    dify_dataset_id?: string | null,
    area_coef?: number | null,
    children_area_coef?: number | null,
    has_geo_area?: string,
    parent_system_id?: number | null,
    embed_document?: string | null,
}

export interface IGeoStarData {
    id?: number | null,
    worldview_id?: number | null,
    star_system_id?: number | null,
    name?: string | null,
    code?: string | null,
    type?: string | null,
    description?: string | null,
    described_in_llm?: number | null,
    dify_document_id?: string | null,
    dify_dataset_id?: string | null,
    area_coef?: number | null,
    children_area_coef?: number | null,
    has_geo_area?: string,
    embed_document?: string | null,
}

export interface IGeoPlanetData {
    id?: number | null,
    worldview_id?: number | null,
    star_system_id?: number | null,
    name?: string | null,
    code?: string | null,
    description?: string | null,
    described_in_llm?: number | null,
    dify_document_id?: string | null,
    dify_dataset_id?: string | null,
    area_coef?: number | null,
    children_area_coef?: number | null,
    has_geo_area?: string,
    embed_document?: string | null,
}

export interface IGeoSatelliteData {
    id?: number | null,
    worldview_id?: number | null,
    star_system_id?: number | null,
    planet_id?: number | null,
    name?: string | null,
    code?: string | null,
    description?: string | null,
    described_in_llm?: number | null,
    dify_document_id?: string | null,
    dify_dataset_id?: string | null,
    area_coef?: number | null,
    children_area_coef?: number | null,
    has_geo_area?: string,
    embed_document?: string | null,
}

export interface IGeoGeographyUnitData {
    id?: number | null,
    worldview_id?: number | null,
    star_system_id?: number | null,
    name?: string | null,
    code?: string | null,
    type?: string | null,
    parent_id?: number | null,
    parent_type?: string | null,
    planet_id?: number | null,
    satellite_id?: number | null,
    description?: string | null,
    described_in_llm?: number | null,
    dify_document_id?: string | null,
    dify_dataset_id?: string | null,
    area_coef?: number | null,
    children_area_coef?: number | null,
    has_geo_area?: string,
    embed_document?: string | null,
}

export interface IGeoUnionData extends IGeoStarSystemData, IGeoStarData, IGeoPlanetData, IGeoSatelliteData, IGeoGeographyUnitData {
    fingerprint?: string
    data_type?: string | null,
}

export interface IFactionTerritory {
    id?: number | null,
    worldview_id: number | null,
    faction_id?: number | null,
    geo_code?: string | null,
    geo_type?: string | null,
    alias_name?: string | null,
    start_date?: number | null,
    end_date?: number | null,
    description?: string | null,
}

export interface IFactionDefData {
    id?: number | null,
    worldview_id?: number | null,
    name?: string | null,
    description?: string | null,
    parent_id?: number | null,
    dify_document_id?: string | null,
    dify_dataset_id?: string | null,
    embed_document?: string | null,
    /** 阵营类型 */
    faction_type?: string | null,
    /** 阵营文化 */
    faction_culture?: string | null,
    /** 输出或用于整活的文化 */
    ideology_or_meme?: string | null,
    /** 阵营决策尺度：地区级、大陆级、行星级、多星级、文明级 */
    scale_of_operation?: string | null,
    /** 阵营绝不会做的事情 */
    decision_taboo?: string | null,
    /** 最大威胁来源 */
    primary_threat_model?: string | null,
    /** 阵营内部允许被公开展示的矛盾 */
    internal_contradictions?: string | null,
    /** 阵营正统来源 */
    legitimacy_source?: string | null,
    /** 阵营创伤后遗症 */
    known_dysfunctions?: string | null,
    /** 地理·命名习惯：风格、偏好、通用要求 */
    geo_naming_habit?: string | null,
    /** 地理·命名后缀：后缀及层级对应 */
    geo_naming_suffix?: string | null,
    /** 地理·命名禁忌：严禁事项 */
    geo_naming_prohibition?: string | null,
    /** 人物·命名习惯：角色/人名的风格、偏好、通用要求 */
    person_naming_habit?: string | null,
    /** 人物·命名后缀：人名结构、尊称/辈分等约定 */
    person_naming_suffix?: string | null,
    /** 人物·命名禁忌：严禁用于人名的字、风格等 */
    person_naming_prohibition?: string | null,
    /** 阵营关系列表 */
    relations?: IFactionRelation[] | null,
}

export interface IRoleData {
    version_name?: any
    version_count?: number
    id?: number | null,
    name?: string | null,
    version?: number | null,
    created_at?: Date | null,
    is_enabled?: 'Y' | 'N' | null,
}

export interface IRoleInfo {
    id?: number | null,
    role_id?: number | null,
    version_name?: string | null,
    worldview_id?: number | null,
    name_in_worldview?: string | null,
    gender_in_worldview?: string | null,
    age_in_worldview?: string | null,
    race_id?: number | null,
    faction_id?: number | null,
    root_faction_id?: number | null,
    background?: string | null,
    personality?: string | null,
    created_at?: Date | null,
    dify_document_id?: string | null,
    dify_dataset_id?: string | null,
    embed_document?: string | null,
    is_enabled?: 'Y' | 'N' | null,
}


export interface IRoleRelation {
    id?: number
    role_id?: number
    related_role_id?: number
    relation_type?: string
    relation_strength?: number
    description?: string
    start_time?: string
    end_time?: string
    is_active?: number
    worldview_id?: number
  }

  export const RELATION_TYPES = [
    { value: 'friend', label: '朋友', color: 'blue', presetStrength: 80 },
    { value: 'confidant', label: '知己', color: 'blue', presetStrength: 85 },
    { value: 'enemy', label: '敌人', color: 'red', presetStrength: 20 },
    { value: 'frenemy', label: '亦敌亦友', color: 'orange', presetStrength: 45 },
    { value: 'nemesis', label: '宿敌', color: 'red', presetStrength: 15 },
    { value: 'acquaintance', label: '熟人', color: 'blue', presetStrength: 50 },
    { value: 'stranger', label: '陌生人', color: 'default', presetStrength: 30 },
    { value: 'family', label: '家人', color: 'green', presetStrength: 90 },
    { value: 'sibling', label: '兄弟姐妹', color: 'green', presetStrength: 85 },
    { value: 'parent', label: '父母', color: 'green', presetStrength: 90 },
    { value: 'child', label: '子女', color: 'green', presetStrength: 90 },
    { value: 'cousin', label: '表亲', color: 'green', presetStrength: 75 },
    { value: 'lover', label: '恋人', color: 'pink', presetStrength: 95 },
    { value: 'rival', label: '对手', color: 'orange', presetStrength: 40 },
    { value: 'mentor', label: '导师', color: 'cyan', presetStrength: 75 },
    { value: 'mentee', label: '学生', color: 'purple', presetStrength: 70 },
    { value: 'apprentice', label: '学徒', color: 'purple', presetStrength: 70 },
    { value: 'classmate', label: '同学', color: 'purple', presetStrength: 70 },
    { value: 'leader', label: '领导', color: 'cyan', presetStrength: 75 },
    { value: 'subordinate', label: '下属', color: 'geekblue', presetStrength: 60 },
    { value: 'colleague', label: '同事', color: 'geekblue', presetStrength: 60 },
    { value: 'ally', label: '盟友', color: 'lime', presetStrength: 70 },
    { value: 'betrayer', label: '背叛者', color: 'volcano', presetStrength: 10 },
    { value: 'guardian', label: '监护人', color: 'purple', presetStrength: 80 },
    { value: 'protector', label: '保护者', color: 'blue', presetStrength: 85 },
    { value: 'benefactor', label: '恩人', color: 'cyan', presetStrength: 80 },
    { value: 'business_partner', label: '商业伙伴', color: 'geekblue', presetStrength: 65 },
    { value: 'debtor', label: '欠债人', color: 'orange', presetStrength: 30 },
    { value: 'creditor', label: '债主', color: 'orange', presetStrength: 30 },
    { value: 'competitor', label: '竞争者', color: 'orange', presetStrength: 35 },
    { value: 'neighbor', label: '邻居', color: 'blue', presetStrength: 55 },
    { value: 'believer', label: '信徒', color: 'gold', presetStrength: 75 },
    { value: 'priest', label: '神职人员', color: 'gold', presetStrength: 80 },
    { value: 'deity', label: '神明', color: 'gold', presetStrength: 95 },
    { value: 'disciple', label: '门徒', color: 'gold', presetStrength: 85 },
    { value: 'prophet', label: '先知', color: 'gold', presetStrength: 90 },
    { value: 'heretic', label: '异教徒', color: 'red', presetStrength: 20 },
    { value: 'cultist', label: '教派成员', color: 'purple', presetStrength: 70 },
    { value: 'religious_leader', label: '宗教领袖', color: 'gold', presetStrength: 85 },
    { value: 'worshipper', label: '崇拜者', color: 'gold', presetStrength: 80 },
    { value: 'apostle', label: '使徒', color: 'gold', presetStrength: 85 },
    { value: 'other', label: '其他', color: 'default', presetStrength: 50 },
  ]

  /**
   * 阵营关系类型
   * 支持复杂世界观的各种关系类型
   */
  export type FactionRelationType = 
    // 政治关系
    | 'ally' | 'enemy' | 'neutral' | 'vassal' | 'overlord' | 'rival' | 'protector' | 'dependent'
    | 'confederation' | 'federation' | 'puppet' | 'exile_government' | 'successor_state'
    | 'client_state' | 'suzerain' | 'tributary' | 'satellite' | 'buffer_state'
    // 军事关系
    | 'war' | 'ceasefire' | 'armistice' | 'military_cooperation' | 'defense_pact'
    | 'non_aggression' | 'military_alliance' | 'arms_race' | 'military_observer'
    | 'peacekeeping' | 'occupation' | 'liberation' | 'insurgency' | 'counter_insurgency'
    // 经济关系
    | 'trade_partner' | 'economic_union' | 'customs_union' | 'resource_dependency'
    | 'market_dominance' | 'economic_exploitation' | 'aid_donor' | 'aid_recipient'
    | 'sanctions' | 'embargo' | 'trade_war' | 'economic_cooperation'
    // 社会关系
    | 'cultural_exchange' | 'immigration' | 'refugee' | 'diaspora' | 'exile'
    | 'cultural_dominance' | 'assimilation' | 'segregation' | 'integration'
    // 宗教关系
    | 'same_faith' | 'different_faith' | 'heresy' | 'crusade' | 'jihad'
    | 'religious_alliance' | 'religious_supremacy' | 'tolerance' | 'persecution'
    | 'missionary' | 'conversion';

  export interface IFactionRelation {
    id?: number
    worldview_id: number
    source_faction_id: number
    source_faction_name?: string
    target_faction_id: number
    target_faction_name?: string
    relation_type: FactionRelationType
    relation_strength?: number
    description: string
  }

  export interface ITimelineDef {
    id: number                      // 时间线定义ID
    worldview_id: number           // 世界观ID
    epoch: string                  // 时间线公元点名称
    start_seconds: number          // 起始时间（秒），负值表示公元前
    hour_length_in_seconds: number // 标准时长度（秒）
    day_length_in_hours: number    // 标准日长度（时）
    month_length_in_days: number   // 标准月长度（天）
    year_length_in_months: number  // 标准年长度（月）
    faction_id?: number            // 所属势力ID
    description?: string           // 描述
    base_seconds: number          // 基准点（秒）
  }

  export interface IWorldViewDataWithExtra {
    id?: number | null,
    title?: string | null,
    content?: string | null,
    base_timeline_id?: number | null,
    is_dify_knowledge_base?: number | null,
    worldrule_snapshot_id?: number | null,
    tl_id?: number | null,
    tl_worldview_id?: number | null,
    tl_epoch?: string | null,
    tl_start_seconds?: number | null,
    tl_hour_length_in_seconds?: number | null,
    tl_day_length_in_hours?: number | null,
    tl_month_length_in_days?: number | null,
    tl_year_length_in_months?: number | null,
    te_max_seconds?: number | null,
    tl_base_seconds?: number | null,
}

export interface IStoryLine {
    id: number
    worldview_id: number
    name: string
    type: string
    description: string
  }


/** timeline_events.state 可选值 */
export type TimelineEventState = 'enabled' | 'questionable' | 'not_yet' | 'blocked' | 'closed'

export interface ITimelineEvent {
    id: number
    title: string
    description: string
    date: number // seconds
    location: string
    faction_ids: number[]
    role_ids: number[]
    story_line_id: number
    worldview_id: number
    /** 状态：enabled | questionable | not_yet | blocked | closed */
    state?: TimelineEventState
}

// Chapter types
export interface IChapter {
    id?: number
    novel_id?: number
    chapter_number?: number
    version?: number
    title?: string
    worldview_id?: number
    storyline_ids?: number[]
    event_line_start1?: number
    event_line_end1?: number
    event_line_start2?: number
    event_line_end2?: number
    event_ids?: number[]
    geo_ids?: string[]
    faction_ids?: number[]
    role_ids?: number[]
    seed_prompt?: string
    skeleton_prompt?: string
    content?: string
    related_chapter_ids?: number[]
    actual_roles?: string
    actual_factions?: string
    actual_locations?: string
    attension?: string
    extra_settings?: string
    actual_seed_prompt?: string
    actual_skeleton_prompt?: string
}

export const GEO_UNIT_TYPES = [
    { enName: 'continent', cnName: '大陆', codePrefix: 'CO'},
    { enName: 'ocean', cnName: '海洋', codePrefix: 'OC'},
    { enName: 'river', cnName: '河流', codePrefix: 'RV'},
    { enName: 'province', cnName: '行省', codePrefix: 'PR'},
    { enName: 'city', cnName: '城市', codePrefix: 'CT'},
    { enName: 'town', cnName: '镇', codePrefix: 'TO'},
    { enName: 'village', cnName: '村', codePrefix: 'VI'},
    { enName: 'street', cnName: '街道', codePrefix: 'ST'},
    { enName: 'mountain', cnName: '山脉', codePrefix: 'MT'},
    { enName: 'plain', cnName: '平原', codePrefix: 'PN'},
    { enName: 'hill', cnName: '丘陵', codePrefix: 'HL'},
    { enName: 'plateau', cnName: '高原', codePrefix: 'PT'},
    { enName: 'forest', cnName: '森林', codePrefix: 'FR'},
    { enName: 'desert', cnName: '沙漠', codePrefix: 'DS'},
    { enName: 'swamp', cnName: '沼泽', codePrefix: 'SW'},
    { enName: 'valley', cnName: '峡谷', codePrefix: 'VL'},
    { enName: 'lake', cnName: '湖泊', codePrefix: 'LK'},
    { enName: 'cascade', cnName: '瀑布', codePrefix: 'CC'},
    { enName: 'beatch', cnName: '海滩', codePrefix: 'BH'},
    { enName: 'island', cnName: '岛屿', codePrefix: 'IL'},
    { enName: 'hole', cnName: '洞穴', codePrefix: 'HO'},
    { enName: 'building', cnName: '建筑', codePrefix: 'BL'},
    { enName: 'fort', cnName: '防御工事', codePrefix: 'FT'},
    { enName: 'hub', cnName: '枢纽', codePrefix: 'HB'},
    { enName: 'port', cnName: '港口', codePrefix: 'PG'},
    { enName: 'airport', cnName: '机场', codePrefix: 'AP'},
    { enName: 'military_base', cnName: '军事基地', codePrefix: 'MB'},
    { enName: 'factory', cnName: '工厂', codePrefix: 'FA'},
    { enName: 'mine', cnName: '矿山', codePrefix: 'MI'},
    { enName: 'power_plant', cnName: '发电站', codePrefix: 'PP'},
]


export interface IWorldRuleGroup {
    id?: number | null,
    worldview_id?: number | null,
    title?: string | null,
    parent_id?: number | null,
    order?: number | null,
    content?: string | null,
    created_at?: Date | null,
    updated_at?: Date | null,
}

export interface IWorldRuleItem {
    id?: number | null,
    worldview_id?: number | null,
    group_id?: number | null,
    summary?: string | null,
    content?: string | null,
    order?: number | null,
    created_at?: Date | null,
    updated_at?: Date | null,
}

export interface IWorldRuleSnapshot {
    id?: number | null,
    worldview_id?: number | null,
    title?: string | null,
    config?: string | null,
    content?: string | null,
    created_at?: Date | null,
    updated_at?: Date | null,
}

export interface IMagicSystemDef {
    id: number,
    worldview_id: number,   // 世界观ID
    system_name: string,   // 系统名称
    order_num: number,   // 排序号
    version_id: number,   // 版本ID
    created_at: Date,      // 创建时间
    updated_at: Date,      // 更新时间
}

export interface IMagicSystemVersion {
    id: number,
    def_id: number,      // 定义ID
    worldview_id: number,   // 世界观ID
    version_name: string,   // 版本名称
    content: string,       // 系统内容
    created_at: Date,      // 创建时间
    updated_at: Date,      // 更新时间
}

// 世界态类型
export type WorldStateType = 
  | 'world_event'           // 世界大事件
  | 'natural_disaster'      // 天灾
  | 'faction_agreement'     // 阵营协约
  | 'faction_misunderstanding' // 阵营误判
  | 'faction_tech_limit'    // 阵营科技限制
  | 'character_agreement'  // 人物协议
  | 'character_perception_gap' // 人物认知差
  | 'character_long_term_action'; // 人物长期行动

export type WorldStateStatus = 
  | 'active'     // 活跃中
  | 'expired'    // 已过期
  | 'resolved'   // 已解决
  | 'suspended'; // 已暂停

export type ImpactLevel = 
  | 'low'      // 低影响
  | 'medium'   // 中等影响
  | 'high'     // 高影响
  | 'critical'; // 关键影响

export type AffectedArea = 
  | 'politics'  // 政治
  | 'economy'   // 经济
  | 'military'  // 军事
  | 'society'   // 社会
  | 'culture'   // 文化
  | 'other';    // 其他

export interface IWorldState {
  id?: number;
  worldview_id: number;
  state_type: WorldStateType;
  title: string;
  description?: string;
  status?: WorldStateStatus;
  start_time?: number;  // 时间线秒数
  end_time?: number;    // 时间线秒数，null表示持续
  duration_days?: number;
  related_faction_ids?: number[];
  related_role_ids?: number[];
  related_geo_codes?: string[];
  related_event_ids?: number[];
  related_chapter_ids?: number[];
  related_world_state_ids?: number[];  // 引用关系：本世界态引用了哪些其他世界态
  impact_level?: ImpactLevel;
  impact_description?: string;
  affected_areas?: AffectedArea[];
  tags?: string[];
  created_at?: Date;
  updated_at?: Date;
  created_by?: string;
}

export interface IWorldStateHistory {
  id?: number;
  world_state_id: number;
  old_status?: WorldStateStatus;
  new_status: WorldStateStatus;
  change_reason?: string;
  changed_at?: Date;
  changed_by?: string;
}

// 脑洞类型
export type BrainstormType = 
  | 'inspiration'  // 灵感
  | 'problem'      // 问题
  | 'idea'         // 想法
  | 'note'         // 笔记
  | 'to_verify';   // 待验证

export type BrainstormStatus = 
  | 'draft'            // 草稿
  | 'feasible_unused'  // 可行未使用
  | 'in_use'           // 使用中
  | 'used'             // 已使用
  | 'suspended';       // 暂时搁置

export type AnalysisStatus = 
  | 'pending'    // 待分析
  | 'analyzing'  // 分析中
  | 'completed'  // 已完成
  | 'failed';    // 分析失败

export type Priority = 
  | 'low'     // 低
  | 'medium'  // 中
  | 'high'    // 高
  | 'urgent'; // 紧急

export type BrainstormCategory = 
  | 'plot'      // 情节
  | 'character' // 角色
  | 'worldview' // 世界观
  | 'style'     // 风格
  | 'other';    // 其他

export interface IBrainstormAnalysisResult {
  /** 自然语言分析全文（与下方结构化字段二选一，优先展示） */
  analysis_text?: string;
  impact_analysis?: {
    description: string;
    affected_entities?: {
      factions?: number[];
      roles?: number[];
      geos?: string[];
      events?: number[];
      chapters?: number[];
    };
  };
  consistency_check?: {
    conflicts?: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }>;
    consistency_score?: number; // 0-100
  };
  suggestions?: Array<{
    type: string;
    content: string;
    priority: Priority;
  }>;
  risks?: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  opportunities?: Array<{
    type: string;
    description: string;
    potential: 'low' | 'medium' | 'high';
  }>;
}

/** 角色种子：自然语言描述，用于两阶段角色构思的第一阶段 */
export interface IRoleSeed {
  id: string;
  content: string;
  edited?: boolean;
}

/** 角色草稿卡：与角色管理字段对齐的结构化信息 */
export interface IRoleDraftCard {
  name?: string;
  gender?: string;
  age?: string;
  race_or_species?: string;
  faction_or_stance?: string;
  appearance?: string;
  strengths?: string;
  weaknesses?: string;
  resources?: string;
  behavior_style?: string;
  personality?: string;
  [key: string]: string | undefined;
}

/** 角色草稿：基于种子生成，含结构化卡 + 背景长文本 */
export interface IRoleDraft {
  seed_id: string;
  card: IRoleDraftCard;
  background: string;
  status?: 'generating';
}

export interface IBrainstorm {
  id?: number;
  worldview_id: number;
  novel_id?: number;
  brainstorm_type: BrainstormType;
  title: string;
  content: string;  // Markdown格式
  status?: BrainstormStatus;
  priority?: Priority;
  category?: BrainstormCategory;
  /** 用户原始问题：用户提出的原始问题或关注点 */
  user_question?: string;
  /** 扩展后的问题：通过 ReAct+MCP 扩展生成的问题列表（JSON字符串或数组） */
  expanded_questions?: string;
  /** 剧情规划：用户对脑洞的剧情规划或期望的发展方向 */
  plot_planning?: string;
  /** 章节纲要：该脑洞对应的章节纲要或结构 */
  chapter_outline?: string;
  /** 分析方向：希望 AI 分析时侧重或关注的方向说明（保留用于向后兼容） */
  analysis_direction?: string;
  tags?: string[];
  related_faction_ids?: number[];
  related_role_ids?: number[];
  related_geo_codes?: string[];
  related_event_ids?: number[];
  related_chapter_ids?: number[];
  related_world_state_ids?: number[];
  /** 父脑洞ID列表（支持多个父脑洞） */
  parent_ids?: number[];
  /** 父脑洞ID（单个，已废弃，保留用于向后兼容） */
  parent_id?: number;
  analysis_status?: AnalysisStatus;
  analysis_result?: IBrainstormAnalysisResult;
  analyzed_at?: Date;
  analysis_model?: string;
  /** 角色构思：种子列表（自然语言，可重骰与编辑） */
  role_seeds?: IRoleSeed[];
  /** 角色构思：基于种子生成的角色草稿（角色卡 + 背景） */
  role_drafts?: IRoleDraft[];
  created_at?: Date;
  updated_at?: Date;
  created_by?: string;
}

export interface IBrainstormAnalysisHistory {
  id?: number;
  brainstorm_id: number;
  analysis_result: IBrainstormAnalysisResult;
  analysis_model?: string;
  analyzed_at?: Date;
}
