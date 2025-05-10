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
    is_dify_knowledge_base?: number | null
}

export interface IGeoStarSystemData {
    id?: number | null,
    worldview_id?: number | null,
    name?: string | null,
    code?: string | null,
    described_in_llm?: number | null
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
}

export interface IGeoPlanetData {
    id?: number | null,
    worldview_id?: number | null,
    star_system_id?: number | null,
    name?: string | null,
    code?: string | null,
    description?: string | null,
    described_in_llm?: number | null,
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
}

export interface IFactionDefData {
    id?: number | null,
    worldview_id?: number | null,
    name?: string | null,
    description?: string | null,
    parent_id?: number | null,
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
    { value: 'enemy', label: '敌人', color: 'red', presetStrength: 20 },
    { value: 'family', label: '家人', color: 'green', presetStrength: 90 },
    { value: 'lover', label: '恋人', color: 'pink', presetStrength: 95 },
    { value: 'master', label: '师徒', color: 'purple', presetStrength: 85 },
    { value: 'rival', label: '对手', color: 'orange', presetStrength: 40 },
    { value: 'mentor', label: '导师', color: 'cyan', presetStrength: 75 },
    { value: 'leader', label: '领导', color: 'cyan', presetStrength: 75 },
    { value: 'subordinate', label: '下属', color: 'geekblue', presetStrength: 60 },
    { value: 'ally', label: '盟友', color: 'lime', presetStrength: 70 },
    { value: 'betrayer', label: '背叛者', color: 'volcano', presetStrength: 10 },
    { value: 'sibling', label: '兄弟姐妹', color: 'green', presetStrength: 85 },
    { value: 'parent', label: '父母', color: 'green', presetStrength: 90 },
    { value: 'child', label: '子女', color: 'green', presetStrength: 90 },
    { value: 'cousin', label: '表亲', color: 'green', presetStrength: 75 },
    { value: 'guardian', label: '监护人', color: 'purple', presetStrength: 80 },
    { value: 'protector', label: '保护者', color: 'blue', presetStrength: 85 },
    { value: 'benefactor', label: '恩人', color: 'cyan', presetStrength: 80 },
    { value: 'debtor', label: '欠债人', color: 'orange', presetStrength: 30 },
    { value: 'creditor', label: '债主', color: 'orange', presetStrength: 30 },
    { value: 'business_partner', label: '商业伙伴', color: 'geekblue', presetStrength: 65 },
    { value: 'competitor', label: '竞争者', color: 'orange', presetStrength: 35 },
    { value: 'nemesis', label: '宿敌', color: 'red', presetStrength: 15 },
    { value: 'frenemy', label: '亦敌亦友', color: 'orange', presetStrength: 45 },
    { value: 'confidant', label: '知己', color: 'blue', presetStrength: 85 },
    { value: 'mentee', label: '学生', color: 'purple', presetStrength: 70 },
    { value: 'apprentice', label: '学徒', color: 'purple', presetStrength: 70 },
    { value: 'colleague', label: '同事', color: 'geekblue', presetStrength: 60 },
    { value: 'neighbor', label: '邻居', color: 'blue', presetStrength: 55 },
    { value: 'acquaintance', label: '熟人', color: 'blue', presetStrength: 50 },
    { value: 'stranger', label: '陌生人', color: 'default', presetStrength: 30 },
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