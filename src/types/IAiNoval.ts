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