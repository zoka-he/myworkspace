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
    parent_system_id?: number | null
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
    has_geo_area?: string
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
    has_geo_area?: string
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
    has_geo_area?: string
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
    has_geo_area?: string
}

export interface IGeoUnionData extends IGeoStarSystemData, IGeoStarData, IGeoPlanetData, IGeoSatelliteData, IGeoGeographyUnitData {
    data_type?: string | null,
}

export interface IFactionDefData {
    id?: number | null,
    worldview_id?: number | null,
    name?: string | null,
    description?: string | null,
    parent_id?: number | null,
    dify_document_id?: string | null,
    dify_dataset_id?: string | null,
}

export interface IRoleData {
    version_name?: any
    version_count?: number
    id?: number | null,
    name?: string | null,
    version?: number | null,
    created_at?: Date | null,
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

  export interface IFactionRelation {
    id?: number
    worldview_id: number
    source_faction_id: number
    target_faction_id: number
    relation_type: 'ally' | 'enemy' | 'neutral' | 'vassal' | 'overlord' | 'rival' | 'protector' | 'dependent' | 'war'
    relation_strength: number
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
