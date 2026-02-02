import { IFactionRelation } from '@/src/types/IAiNoval';

/**
 * 关系类型分类枚举
 * 按照关系性质进行科学分类，支持复杂世界观
 */
export enum RelationCategory {
  /** 政治关系：涉及主权、统治、联盟等政治层面的关系 */
  POLITICAL = 'political',
  /** 军事关系：涉及战争、防御、军事合作等军事层面的关系 */
  MILITARY = 'military',
  /** 经济关系：涉及贸易、资源、经济依赖等经济层面的关系 */
  ECONOMIC = 'economic',
  /** 社会关系：涉及文化、血缘、社会联系等社会层面的关系 */
  SOCIAL = 'social',
  /** 宗教关系：涉及信仰、教派、宗教组织等宗教层面的关系 */
  RELIGIOUS = 'religious',
}

/**
 * 关系方向性
 */
export enum RelationDirection {
  /** 对称关系：双方关系对等（如盟友、敌对） */
  SYMMETRIC = 'symmetric',
  /** 非对称关系：存在主从或依赖关系（如附庸、保护者） */
  ASYMMETRIC = 'asymmetric',
}

/**
 * 关系类型定义接口
 */
export interface RelationTypeDefinition {
  /** 关系类型键值 */
  key: IFactionRelation['relation_type'];
  /** 中文显示名称 */
  label: string;
  /** 关系分类 */
  category: RelationCategory;
  /** 关系方向性 */
  direction: RelationDirection;
  /** 默认关系强度（0-100） */
  defaultStrength: number;
  /** 关系强度范围 [最小值, 最大值] */
  strengthRange: [number, number];
  /** 关系描述 */
  description: string;
  /** 反向关系（如果存在） */
  inverseRelation?: IFactionRelation['relation_type'];
}

/**
 * 关系类型定义映射
 * 科学分类，支持复杂世界观
 */
export const RELATION_TYPE_DEFINITIONS: Record<IFactionRelation['relation_type'], RelationTypeDefinition> = {
  // ========== 政治关系 ==========
  ally: {
    key: 'ally',
    label: '盟友',
    category: RelationCategory.POLITICAL,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 85,
    strengthRange: [60, 100],
    description: '政治联盟关系，双方在政治事务上相互支持',
  },
  enemy: {
    key: 'enemy',
    label: '敌对',
    category: RelationCategory.POLITICAL,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 15,
    strengthRange: [0, 40],
    description: '政治敌对关系，双方在政治立场上对立',
  },
  neutral: {
    key: 'neutral',
    label: '中立',
    category: RelationCategory.POLITICAL,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 50,
    strengthRange: [40, 60],
    description: '中立关系，双方保持政治距离，不偏不倚',
  },
  vassal: {
    key: 'vassal',
    label: '附庸',
    category: RelationCategory.POLITICAL,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 70,
    strengthRange: [50, 90],
    description: '附庸关系，一方对另一方存在政治依附',
    inverseRelation: 'overlord',
  },
  overlord: {
    key: 'overlord',
    label: '宗主',
    category: RelationCategory.POLITICAL,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 80,
    strengthRange: [60, 100],
    description: '宗主关系，一方对另一方拥有政治主导权',
    inverseRelation: 'vassal',
  },
  protector: {
    key: 'protector',
    label: '保护者',
    category: RelationCategory.POLITICAL,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 85,
    strengthRange: [60, 100],
    description: '保护关系，一方为另一方提供政治或军事保护',
    inverseRelation: 'dependent',
  },
  dependent: {
    key: 'dependent',
    label: '依附者',
    category: RelationCategory.POLITICAL,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 65,
    strengthRange: [40, 80],
    description: '依附关系，一方在政治或经济上依赖另一方',
    inverseRelation: 'protector',
  },
  rival: {
    key: 'rival',
    label: '竞争对手',
    category: RelationCategory.POLITICAL,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 35,
    strengthRange: [20, 50],
    description: '竞争关系，双方在政治、经济或军事领域存在竞争',
  },
  confederation: {
    key: 'confederation',
    label: '邦联',
    category: RelationCategory.POLITICAL,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 75,
    strengthRange: [60, 90],
    description: '邦联关系，多个政治实体组成的松散联盟',
  },
  federation: {
    key: 'federation',
    label: '联邦',
    category: RelationCategory.POLITICAL,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 80,
    strengthRange: [70, 95],
    description: '联邦关系，多个政治实体组成的紧密联盟',
  },
  puppet: {
    key: 'puppet',
    label: '傀儡',
    category: RelationCategory.POLITICAL,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 40,
    strengthRange: [20, 60],
    description: '傀儡关系，一方名义上独立但实际受另一方控制',
    inverseRelation: 'client_state',
  },
  client_state: {
    key: 'client_state',
    label: '附庸国',
    category: RelationCategory.POLITICAL,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 50,
    strengthRange: [30, 70],
    description: '附庸国关系，一方对另一方存在政治和经济依赖',
    inverseRelation: 'puppet',
  },
  exile_government: {
    key: 'exile_government',
    label: '流亡政府',
    category: RelationCategory.POLITICAL,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 60,
    strengthRange: [40, 80],
    description: '流亡政府关系，一方承认另一方流亡政府的合法性',
  },
  successor_state: {
    key: 'successor_state',
    label: '继承国',
    category: RelationCategory.POLITICAL,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 55,
    strengthRange: [40, 70],
    description: '继承国关系，一方继承另一方的政治遗产或领土',
  },
  suzerain: {
    key: 'suzerain',
    label: '宗主国',
    category: RelationCategory.POLITICAL,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 75,
    strengthRange: [60, 90],
    description: '宗主国关系，一方对另一方拥有宗主权',
    inverseRelation: 'tributary',
  },
  tributary: {
    key: 'tributary',
    label: '朝贡国',
    category: RelationCategory.POLITICAL,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 65,
    strengthRange: [50, 80],
    description: '朝贡国关系，一方定期向另一方进贡',
    inverseRelation: 'suzerain',
  },
  satellite: {
    key: 'satellite',
    label: '卫星国',
    category: RelationCategory.POLITICAL,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 45,
    strengthRange: [30, 65],
    description: '卫星国关系，一方在政治和军事上受另一方影响',
  },
  buffer_state: {
    key: 'buffer_state',
    label: '缓冲国',
    category: RelationCategory.POLITICAL,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 50,
    strengthRange: [40, 60],
    description: '缓冲国关系，作为两个大国之间的缓冲地带',
  },
  
  // ========== 军事关系 ==========
  war: {
    key: 'war',
    label: '宣战',
    category: RelationCategory.MILITARY,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 0,
    strengthRange: [0, 20],
    description: '战争状态，双方处于军事冲突中',
  },
  ceasefire: {
    key: 'ceasefire',
    label: '停火',
    category: RelationCategory.MILITARY,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 25,
    strengthRange: [10, 40],
    description: '停火状态，双方暂时停止军事行动',
  },
  armistice: {
    key: 'armistice',
    label: '休战',
    category: RelationCategory.MILITARY,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 30,
    strengthRange: [15, 45],
    description: '休战状态，双方达成临时停战协议',
  },
  military_cooperation: {
    key: 'military_cooperation',
    label: '军事合作',
    category: RelationCategory.MILITARY,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 70,
    strengthRange: [50, 90],
    description: '军事合作关系，双方在军事领域进行合作',
  },
  defense_pact: {
    key: 'defense_pact',
    label: '防御条约',
    category: RelationCategory.MILITARY,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 80,
    strengthRange: [65, 95],
    description: '防御条约关系，双方承诺在受到攻击时相互支援',
  },
  non_aggression: {
    key: 'non_aggression',
    label: '互不侵犯',
    category: RelationCategory.MILITARY,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 45,
    strengthRange: [30, 60],
    description: '互不侵犯关系，双方承诺不主动攻击对方',
  },
  military_alliance: {
    key: 'military_alliance',
    label: '军事同盟',
    category: RelationCategory.MILITARY,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 85,
    strengthRange: [70, 100],
    description: '军事同盟关系，双方在军事上紧密合作',
  },
  arms_race: {
    key: 'arms_race',
    label: '军备竞赛',
    category: RelationCategory.MILITARY,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 20,
    strengthRange: [10, 35],
    description: '军备竞赛关系，双方在军事装备上相互竞争',
  },
  military_observer: {
    key: 'military_observer',
    label: '军事观察',
    category: RelationCategory.MILITARY,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 50,
    strengthRange: [40, 60],
    description: '军事观察关系，一方在另一方领土部署观察员',
  },
  peacekeeping: {
    key: 'peacekeeping',
    label: '维和',
    category: RelationCategory.MILITARY,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 60,
    strengthRange: [45, 75],
    description: '维和关系，一方在另一方领土执行维和任务',
  },
  occupation: {
    key: 'occupation',
    label: '占领',
    category: RelationCategory.MILITARY,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 10,
    strengthRange: [0, 30],
    description: '占领关系，一方军事占领另一方领土',
  },
  liberation: {
    key: 'liberation',
    label: '解放',
    category: RelationCategory.MILITARY,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 75,
    strengthRange: [60, 90],
    description: '解放关系，一方帮助另一方从压迫中解放',
  },
  insurgency: {
    key: 'insurgency',
    label: '叛乱',
    category: RelationCategory.MILITARY,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 5,
    strengthRange: [0, 20],
    description: '叛乱关系，一方支持另一方内部的叛乱势力',
  },
  counter_insurgency: {
    key: 'counter_insurgency',
    label: '反叛乱',
    category: RelationCategory.MILITARY,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 40,
    strengthRange: [25, 55],
    description: '反叛乱关系，一方帮助另一方镇压内部叛乱',
  },
  
  // ========== 经济关系 ==========
  trade_partner: {
    key: 'trade_partner',
    label: '贸易伙伴',
    category: RelationCategory.ECONOMIC,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 65,
    strengthRange: [50, 85],
    description: '贸易伙伴关系，双方进行频繁的贸易往来',
  },
  economic_union: {
    key: 'economic_union',
    label: '经济联盟',
    category: RelationCategory.ECONOMIC,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 80,
    strengthRange: [70, 95],
    description: '经济联盟关系，双方在经济政策上高度协调',
  },
  customs_union: {
    key: 'customs_union',
    label: '关税同盟',
    category: RelationCategory.ECONOMIC,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 75,
    strengthRange: [65, 90],
    description: '关税同盟关系，双方统一关税政策',
  },
  resource_dependency: {
    key: 'resource_dependency',
    label: '资源依赖',
    category: RelationCategory.ECONOMIC,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 55,
    strengthRange: [40, 70],
    description: '资源依赖关系，一方依赖另一方的资源供应',
  },
  market_dominance: {
    key: 'market_dominance',
    label: '市场主导',
    category: RelationCategory.ECONOMIC,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 45,
    strengthRange: [30, 65],
    description: '市场主导关系，一方在另一方市场中占据主导地位',
  },
  economic_exploitation: {
    key: 'economic_exploitation',
    label: '经济剥削',
    category: RelationCategory.ECONOMIC,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 20,
    strengthRange: [5, 40],
    description: '经济剥削关系，一方对另一方进行经济剥削',
  },
  aid_donor: {
    key: 'aid_donor',
    label: '援助国',
    category: RelationCategory.ECONOMIC,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 70,
    strengthRange: [55, 85],
    description: '援助国关系，一方向另一方提供经济援助',
    inverseRelation: 'aid_recipient',
  },
  aid_recipient: {
    key: 'aid_recipient',
    label: '受援国',
    category: RelationCategory.ECONOMIC,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 60,
    strengthRange: [45, 75],
    description: '受援国关系，一方接受另一方的经济援助',
    inverseRelation: 'aid_donor',
  },
  sanctions: {
    key: 'sanctions',
    label: '制裁',
    category: RelationCategory.ECONOMIC,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 15,
    strengthRange: [0, 35],
    description: '制裁关系，一方对另一方实施经济制裁',
  },
  embargo: {
    key: 'embargo',
    label: '禁运',
    category: RelationCategory.ECONOMIC,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 10,
    strengthRange: [0, 30],
    description: '禁运关系，一方对另一方实施贸易禁运',
  },
  trade_war: {
    key: 'trade_war',
    label: '贸易战',
    category: RelationCategory.ECONOMIC,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 25,
    strengthRange: [10, 40],
    description: '贸易战关系，双方在贸易领域进行对抗',
  },
  economic_cooperation: {
    key: 'economic_cooperation',
    label: '经济合作',
    category: RelationCategory.ECONOMIC,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 70,
    strengthRange: [55, 85],
    description: '经济合作关系，双方在经济领域进行合作',
  },
  
  // ========== 社会关系 ==========
  cultural_exchange: {
    key: 'cultural_exchange',
    label: '文化交流',
    category: RelationCategory.SOCIAL,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 60,
    strengthRange: [45, 80],
    description: '文化交流关系，双方进行频繁的文化交流',
  },
  immigration: {
    key: 'immigration',
    label: '移民',
    category: RelationCategory.SOCIAL,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 55,
    strengthRange: [40, 70],
    description: '移民关系，一方接受来自另一方的移民',
  },
  refugee: {
    key: 'refugee',
    label: '难民',
    category: RelationCategory.SOCIAL,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 50,
    strengthRange: [35, 65],
    description: '难民关系，一方接收来自另一方的难民',
  },
  diaspora: {
    key: 'diaspora',
    label: '侨民',
    category: RelationCategory.SOCIAL,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 60,
    strengthRange: [45, 75],
    description: '侨民关系，一方有大量人口居住在另一方',
  },
  exile: {
    key: 'exile',
    label: '流亡',
    category: RelationCategory.SOCIAL,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 40,
    strengthRange: [25, 55],
    description: '流亡关系，一方接收来自另一方的流亡者',
  },
  cultural_dominance: {
    key: 'cultural_dominance',
    label: '文化主导',
    category: RelationCategory.SOCIAL,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 45,
    strengthRange: [30, 65],
    description: '文化主导关系，一方文化对另一方产生主导影响',
  },
  assimilation: {
    key: 'assimilation',
    label: '同化',
    category: RelationCategory.SOCIAL,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 50,
    strengthRange: [35, 70],
    description: '同化关系，一方逐渐融入另一方的文化',
  },
  segregation: {
    key: 'segregation',
    label: '隔离',
    category: RelationCategory.SOCIAL,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 30,
    strengthRange: [15, 45],
    description: '隔离关系，双方在社会层面相互隔离',
  },
  integration: {
    key: 'integration',
    label: '融合',
    category: RelationCategory.SOCIAL,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 70,
    strengthRange: [55, 85],
    description: '融合关系，双方在社会层面高度融合',
  },
  
  // ========== 宗教关系 ==========
  same_faith: {
    key: 'same_faith',
    label: '同教',
    category: RelationCategory.RELIGIOUS,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 75,
    strengthRange: [60, 90],
    description: '同教关系，双方信仰相同的宗教',
  },
  different_faith: {
    key: 'different_faith',
    label: '异教',
    category: RelationCategory.RELIGIOUS,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 40,
    strengthRange: [25, 55],
    description: '异教关系，双方信仰不同的宗教',
  },
  heresy: {
    key: 'heresy',
    label: '异端',
    category: RelationCategory.RELIGIOUS,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 20,
    strengthRange: [5, 35],
    description: '异端关系，一方认为另一方的信仰为异端',
  },
  crusade: {
    key: 'crusade',
    label: '圣战',
    category: RelationCategory.RELIGIOUS,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 5,
    strengthRange: [0, 20],
    description: '圣战关系，双方因宗教原因进行战争',
  },
  jihad: {
    key: 'jihad',
    label: '吉哈德',
    category: RelationCategory.RELIGIOUS,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 5,
    strengthRange: [0, 20],
    description: '吉哈德关系，双方因宗教原因进行战争',
  },
  religious_alliance: {
    key: 'religious_alliance',
    label: '宗教联盟',
    category: RelationCategory.RELIGIOUS,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 80,
    strengthRange: [70, 95],
    description: '宗教联盟关系，双方在宗教事务上紧密合作',
  },
  religious_supremacy: {
    key: 'religious_supremacy',
    label: '宗教至上',
    category: RelationCategory.RELIGIOUS,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 50,
    strengthRange: [35, 70],
    description: '宗教至上关系，一方在宗教上对另一方具有优势',
  },
  tolerance: {
    key: 'tolerance',
    label: '宗教宽容',
    category: RelationCategory.RELIGIOUS,
    direction: RelationDirection.SYMMETRIC,
    defaultStrength: 65,
    strengthRange: [50, 80],
    description: '宗教宽容关系，双方相互容忍对方的宗教信仰',
  },
  persecution: {
    key: 'persecution',
    label: '宗教迫害',
    category: RelationCategory.RELIGIOUS,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 10,
    strengthRange: [0, 30],
    description: '宗教迫害关系，一方对另一方进行宗教迫害',
  },
  missionary: {
    key: 'missionary',
    label: '传教',
    category: RelationCategory.RELIGIOUS,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 55,
    strengthRange: [40, 70],
    description: '传教关系，一方在另一方领土进行传教活动',
  },
  conversion: {
    key: 'conversion',
    label: '改宗',
    category: RelationCategory.RELIGIOUS,
    direction: RelationDirection.ASYMMETRIC,
    defaultStrength: 60,
    strengthRange: [45, 75],
    description: '改宗关系，一方帮助另一方改变宗教信仰',
  },
};

/**
 * 关系类型中文映射（向后兼容）
 * 供需要简单映射的场景使用
 */
export const RELATION_TYPE_MAP: Record<IFactionRelation['relation_type'], string> = 
  Object.fromEntries(
    Object.values(RELATION_TYPE_DEFINITIONS).map(def => [def.key, def.label])
  ) as Record<IFactionRelation['relation_type'], string>;

/**
 * 获取关系类型的中文显示文本
 */
export const getRelationTypeText = (type: IFactionRelation['relation_type']): string => {
  return RELATION_TYPE_DEFINITIONS[type]?.label || type;
};

/**
 * 获取关系类型的完整定义
 */
export const getRelationTypeDefinition = (type: IFactionRelation['relation_type']): RelationTypeDefinition | undefined => {
  return RELATION_TYPE_DEFINITIONS[type];
};

/**
 * 获取指定分类的所有关系类型
 */
export const getRelationTypesByCategory = (category: RelationCategory): IFactionRelation['relation_type'][] => {
  return Object.values(RELATION_TYPE_DEFINITIONS)
    .filter(def => def.category === category)
    .map(def => def.key);
};

/**
 * 获取对称关系类型
 */
export const getSymmetricRelationTypes = (): IFactionRelation['relation_type'][] => {
  return Object.values(RELATION_TYPE_DEFINITIONS)
    .filter(def => def.direction === RelationDirection.SYMMETRIC)
    .map(def => def.key);
};

/**
 * 获取非对称关系类型
 */
export const getAsymmetricRelationTypes = (): IFactionRelation['relation_type'][] => {
  return Object.values(RELATION_TYPE_DEFINITIONS)
    .filter(def => def.direction === RelationDirection.ASYMMETRIC)
    .map(def => def.key);
};

/**
 * 获取关系的反向关系类型（如果存在）
 */
export const getInverseRelationType = (type: IFactionRelation['relation_type']): IFactionRelation['relation_type'] | undefined => {
  return RELATION_TYPE_DEFINITIONS[type]?.inverseRelation;
};

/**
 * 验证关系强度是否在合理范围内
 */
export const validateRelationStrength = (
  type: IFactionRelation['relation_type'],
  strength: number
): { valid: boolean; message?: string } => {
  const definition = RELATION_TYPE_DEFINITIONS[type];
  if (!definition) {
    return { valid: false, message: `未知的关系类型: ${type}` };
  }

  const [min, max] = definition.strengthRange;
  if (strength < min || strength > max) {
    return {
      valid: false,
      message: `关系强度 ${strength} 超出 ${definition.label} 的合理范围 [${min}, ${max}]`,
    };
  }

  return { valid: true };
};
