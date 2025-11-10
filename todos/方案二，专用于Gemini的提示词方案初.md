基于Gemini的特性，设计专用于Gemini的提示词方案初稿如下。

## **Gemini专属提示词方案初稿**

### **一、Gemini在小说创作中的定位**

#### **核心优势**
- 超长上下文：支持100万+ token，可一次性处理整部小说
- 检索增强：与知识库结合强，适合世界观规则查询
- 多模态：可理解图片、图表，适合可视化分析
- 技术准确：逻辑严密，适合一致性检查
- 成本适中：API价格相对较低

#### **核心定位**
> **Gemini = 小说创作的"百科全书"和"质量把关者"**

---

### **二、Gemini适用场景优先级**

**P0（核心场景）**：
1. 世界观一致性检查（跨章节、跨角色）
2. 专有名词词典生成与维护
3. 长文本综合分析（整部小说架构分析）
4. 时间线逻辑验证

**P1（重要场景）**：
5. 世界观规则手册生成
6. 多章节上下文综合生成（需要参考10+章节）
7. 角色关系网络分析
8. 伏笔与呼应的全局分析

**P2（辅助场景）**：
9. 章节摘要生成（准确、全面）
10. 术语提取与标准化
11. 情节逻辑链分析
12. 多语言翻译（如需要）

---

### **三、Gemini提示词设计思路**

#### **核心原则**
1. 结构化输入：JSON格式的世界观数据优先
2. 分步处理：复杂任务拆分为多个阶段
3. 上下文丰富：充分利用长上下文优势
4. 规则明确：明确的检查标准和输出格式
5. 可验证性：输出结果可被程序自动验证

---

### **四、核心提示词模板**

### **4.1 世界观一致性检查（核心功能）**

**场景**：检查单章或多章是否违反世界观规则

**提示词结构**：
```typescript
const geminiConsistencyCheckPrompt = {
    // 第一部分：完整世界观规则手册（核心）
    worldRules: {
        physics: [...],      // 物理规则列表
        magic: [...],        // 魔法规则列表  
        society: [...],     // 社会规则列表
        time: [...],        // 时间规则列表
        biology: [...],     // 生物规则列表（如有）
        technology: [...]   // 技术规则列表（如有）
    },
    
    // 第二部分：专有名词词典（必须）
    glossary: [
        {
            term: "术语",
            type: "location/person/item/ability/concept",
            definition: "完整定义",
            firstAppear: "首次出现章节",
            aliases: ["别名1", "别名2"]
        }
    ],
    
    // 第三部分：待检查内容
    targetContent: {
        chapters: [
            {
                id: 1,
                number: 3,
                title: "章节标题",
                content: "完整章节内容",
                timestamp: "小说时间戳",
                characters: ["出场角色列表"],
                locations: ["发生地点列表"]
            }
        ],
        // 或者检查单个章节
        singleChapter: {
            content: "...",
            context: "前后文摘要"
        }
    },
    
    // 第四部分：检查配置
    checkConfig: {
        strictMode: true,           // 严格模式（所有规则必须遵守）
        checkTypes: [
            "rule_violation",        // 规则违反
            "term_inconsistency",    // 术语不一致
            "timeline_logic",        // 时间线逻辑
            "character_consistency", // 角色一致性
            "plot_logic"            // 情节逻辑
        ],
        returnFormat: "structured"   // structured/detailed/markdown
    }
}
```

**完整提示词模板**：
```markdown
你是一位严格的小说世界观一致性检查专家。你的任务是检查章节内容是否严格遵守已设定的世界观规则。

## 📋 世界观规则手册（必须严格遵守）

### 物理规则
${worldRules.physics.map(r => `
**${r.rule_name}**
- 规则内容：${r.rule_description}
- 优先级：${r.priority || 'high'}
- 示例：${r.rule_examples || '无'}
`).join('\n')}

### 魔法/超自然规则
${worldRules.magic.map(r => `
**${r.rule_name}**
- 规则内容：${r.rule_description}
- 优先级：${r.priority || 'high'}
- 示例：${r.rule_examples || '无'}
`).join('\n')}

### 社会规则
${worldRules.society.map(r => `
**${r.rule_name}**
- 规则内容：${r.rule_description}
- 优先级：${r.priority || 'high'}
- 示例：${r.rule_examples || '无'}
`).join('\n')}

### 时间规则
${worldRules.time.map(r => `
**${r.rule_name}**
- 规则内容：${r.rule_description}
- 示例：${r.rule_examples || '无'}
`).join('\n')}

## 📖 专有名词词典（术语使用必须一致）

${glossary.map(g => `
**${g.term}** (${g.type})
- 定义：${g.definition}
- 首次出现：${g.firstAppear}
- 别名：${g.aliases?.join('、') || '无'}
`).join('\n')}

## 📝 待检查内容

${targetContent.chapters.map(c => `
### 第${c.number}章：${c.title}
**时间点**：${c.timestamp}
**地点**：${c.locations.join('、')}
**出场角色**：${c.characters.join('、')}

**章节内容**：
${c.content}
`).join('\n\n')}

## ✅ 检查任务

请按照以下维度进行详细检查：

### 1. 世界观规则违反检查
- 逐条对比章节内容与世界规则手册
- 识别所有规则违反（即使看起来合理也要标注）
- 标注违反位置（第X段、第X行或关键词）
- 评估严重程度：critical（严重违反）/warning（轻微违反）/info（建议优化）

### 2. 专有名词使用一致性检查
- 检查所有术语拼写是否正确
- 检查术语使用是否符合定义
- 识别可能是新术语但未在词典中出现的词汇
- 检查别名使用是否一致

### 3. 时间线逻辑检查
- 验证章节时间点是否合理
- 检查事件顺序是否符合逻辑
- 检查角色年龄是否与时间线一致
- 识别时间冲突或跳跃

### 4. 角色一致性检查
- 检查角色行为是否符合性格设定（参考角色档案）
- 检查角色能力是否与设定一致
- 检查角色动机是否合理
- 检查角色关系是否与设定一致

### 5. 情节逻辑检查
- 检查因果关系是否清晰
- 识别逻辑漏洞
- 检查情节发展是否符合情理

## 📊 输出格式

请以JSON格式返回检查结果：

```json
{
  "overall_consistency_score": 85,
  "summary": {
    "total_issues": 5,
    "critical_issues": 1,
    "warnings": 3,
    "info": 1
  },
  "rule_violations": [
    {
      "id": "R001",
      "severity": "critical",
      "rule_name": "魔法规则：不能同时使用两种元素",
      "violation_location": {
        "chapter": 3,
        "paragraph": 5,
        "snippet": "他同时释放了火球和水盾..."
      },
      "violation_description": "章节中角色同时使用了火元素和水元素，违反了世界观规则",
      "suggestion": "改为先后使用两种元素，或者添加特殊设定解释为什么可以同时使用"
    }
  ],
  "term_inconsistencies": [
    {
      "id": "T001",
      "type": "spelling_error",
      "term": "魔法师",
      "incorrect_usage": "魔法師",
      "correct_form": "魔法师",
      "location": {
        "chapter": 3,
        "paragraph": 2
      },
      "suggestion": "统一使用简体中文'魔法师'"
    }
  ],
  "new_terms_detected": [
    {
      "term": "元素共鸣",
      "location": {
        "chapter": 3,
        "paragraph": 7
      },
      "suggested_definition": "可能需要添加到专有名词词典",
      "context": "...元素共鸣是一种特殊的魔法现象..."
    }
  ],
  "timeline_issues": [
    {
      "id": "TL001",
      "type": "age_inconsistency",
      "description": "角色A在第2章时15岁，但第3章中提及'三年前'的事件时年龄计算有误",
      "location": {
        "chapter": 3
      },
      "suggestion": "重新核对时间线"
    }
  ],
  "character_consistency_issues": [
    {
      "id": "C001",
      "character": "角色A",
      "issue_type": "behavior_inconsistency",
      "description": "角色A性格设定为'冷静沉着'，但此处表现出'冲动易怒'",
      "location": {
        "chapter": 3,
        "paragraph": 10
      },
      "suggestion": "要么调整行为描述，要么添加触发情绪变化的原因"
    }
  ],
  "plot_logic_issues": [
    {
      "id": "P001",
      "type": "causation_unclear",
      "description": "事件A导致事件B的因果关系不够明确",
      "location": {
        "chapter": 3
      },
      "suggestion": "补充因果关系描述"
    }
  ],
  "recommendations": [
    "建议添加'元素共鸣'到世界观规则手册",
    "建议统一术语'魔法师'的写法",
    "建议完善角色A的情绪转变逻辑"
  ]
}
```

**注意**：
- 如果${checkConfig.strictMode ? '开启严格模式，所有规则违反都必须标注，即使是微小的不一致' : '采用灵活模式，只标注明显错误'}
- 必须准确标注问题位置，方便后续定位和修改
- 建议应该具体、可执行，而不是泛泛而谈
```

---

### **4.2 专有名词词典生成与维护**

**场景**：从章节内容中提取专有名词，建立或更新词典

**提示词结构**：
```typescript
const geminiGlossaryGenerationPrompt = {
    // 输入：章节内容或整部小说
    sourceContent: {
        chapters: [
            {
                id: 1,
                number: 3,
                content: "完整章节内容",
                timestamp: "时间点"
            }
        ],
        // 或整部小说
        fullNovel: {
            title: "小说标题",
            allChapters: [...]
        }
    },
    
    // 现有词典（如果存在）
    existingGlossary: [
        {
            term: "已存在的术语",
            definition: "定义",
            // ...其他字段
        }
    ],
    
    // 提取配置
    extractionConfig: {
        termTypes: ["location", "person", "item", "ability", "concept"],
        minFrequency: 2,           // 至少出现2次才认为是专有名词
        includeContext: true,      // 是否包含上下文示例
        detectAliases: true        // 是否检测别名
    }
}
```

**提示词模板**：
```markdown
你是一位专业的术语学家，负责从小说文本中提取和管理专有名词词典。

## 📚 源文本内容

${sourceContent.chapters.map(c => `
### 第${c.number}章
**时间点**：${c.timestamp}

${c.content}
`).join('\n\n')}

## 📖 现有词典（避免重复）

${existingGlossary.length > 0 ? existingGlossary.map(g => `
- **${g.term}** (${g.type})：${g.definition}
`).join('\n') : '暂无现有词典'}

## 🔍 提取任务

请从源文本中提取以下类型的专有名词：

1. **地点类** (location)：地名、建筑名、区域名等
2. **人物类** (person)：人名、角色称谓等
3. **物品类** (item)：道具名、装备名、特殊物品等
4. **能力类** (ability)：技能名、魔法名、特殊能力等
5. **概念类** (concept)：组织名、理论名、法则名等

### 提取标准

- 必须是在小说世界中具有特殊意义的词汇
- 普通词汇（如"桌子"、"天空"）不应提取
- 必须出现至少${extractionConfig.minFrequency}次才确认
- 检测可能的别名和变体写法

### 对于每个术语，请提供：

1. **术语名称**：标准形式
2. **类型**：location/person/item/ability/concept
3. **定义**：基于上下文的推断定义（尽量准确）
4. **首次出现**：第X章
5. **出现位置**：所有出现位置的章节号和段落号
6. **上下文示例**：2-3个典型的使用示例
7. **可能别名**：如果检测到别名（如"帝国"可能是"神圣帝国"的简称）

## 📊 输出格式

请以JSON格式返回：

```json
{
  "extracted_terms": [
    {
      "term": "魔法师学院",
      "type": "location",
      "confidence": "high",
      "definition": "培养魔法师的教育机构",
      "first_appear": {
        "chapter": 1,
        "paragraph": 5
      },
      "all_appearances": [
        {"chapter": 1, "paragraph": 5},
        {"chapter": 3, "paragraph": 2},
        {"chapter": 5, "paragraph": 8}
      ],
      "context_examples": [
        "他走进了魔法师学院的大门",
        "魔法师学院的院长是一位传奇法师",
        "这座魔法师学院已经存在了数百年"
      ],
      "possible_aliases": ["学院", "魔法学院"],
      "suggested_priority": "high"  // high/medium/low，基于出现频率和重要性
    }
  ],
  "ambiguous_terms": [
    {
      "term": "元素共鸣",
      "context": "可能是新概念，但定义不够清晰",
      "suggestion": "需要作者确认是否为专有名词"
    }
  ],
  "statistics": {
    "total_terms": 15,
    "locations": 5,
    "persons": 4,
    "items": 3,
    "abilities": 2,
    "concepts": 1
  }
}
```

**注意**：
- 尽量准确，不要过度提取普通词汇
- 定义应该基于文本推断，如果无法确定，标记为"ambiguous"
- 优先提取出现频率高、在情节中重要的术语
```

---

### **4.3 长文本综合分析（整部小说架构）**

**场景**：分析整部小说的结构、节奏、角色弧线等

**提示词结构**：
```typescript
const geminiNovelAnalysisPrompt = {
    // 完整小说内容
    novel: {
        title: "小说标题",
        description: "小说描述",
        allChapters: [
            {
                id: 1,
                number: 1,
                title: "章节标题",
                content: "完整内容",
                wordCount: 5000,
                timestamp: "时间点"
            }
        ],
        // 章节摘要（如果内容太长）
        chapterSummaries: [
            {
                chapterNumber: 1,
                summary: "章节摘要",
                keyEvents: ["关键事件1", "关键事件2"],
                characters: ["出场角色"],
                wordCount: 5000
            }
        ]
    },
    
    // 世界观设定
    worldview: {
        rules: [...],
        timeline: {...},
        glossary: [...]
    },
    
    // 分析维度
    analysisDimensions: [
        "overall_structure",      // 整体结构
        "plot_pacing",           // 情节节奏
        "character_arcs",        // 角色弧线
        "worldview_consistency", // 世界观一致性
        "narrative_techniques",  // 叙事技巧
        "strengths_weaknesses"   // 优缺点
    ]
}
```

**提示词模板**：
```markdown
你是一位资深的小说编辑和文学分析专家。请对以下整部小说进行全面的专业分析。

## 📖 小说基本信息

**标题**：${novel.title}
**描述**：${novel.description}
**总章节数**：${novel.allChapters.length}
**总字数**：${novel.allChapters.reduce((sum, c) => sum + c.wordCount, 0)}字

## 📚 完整章节内容

${novel.allChapters.map(c => `
### 第${c.number}章：${c.title}
**时间点**：${c.timestamp}
**字数**：${c.wordCount}字

${c.content}
`).join('\n\n')}

## 🌍 世界观设定（参考）

**世界观规则**：${worldview.rules.length}条规则
**专有名词**：${worldview.glossary.length}个术语
**时间线**：${worldview.timeline ? '已设置' : '未设置'}

## 🔍 分析任务

请从以下维度进行全面分析：

### 1. 整体结构分析
- 小说的叙事结构（线性/非线性/多线并行）
- 章节划分是否合理
- 三幕结构（如果有）的执行情况
- 整体叙事完整性评估

### 2. 情节节奏分析
- 每章的节奏快慢
- 节奏变化趋势（是否单调或过于起伏）
- 高潮章节的分布
- 节奏与情节匹配度
- 建议：哪些章节需要加速/减速

### 3. 角色弧线分析
- 主要角色的成长轨迹
- 角色弧线是否清晰完整
- 角色关系网络
- 角色功能是否重叠
- 建议：哪些角色需要加强/削弱

### 4. 世界观一致性分析
- 跨章节的世界观一致性
- 规则执行的严格程度
- 专有名词使用的一致性
- 时间线逻辑的合理性

### 5. 叙事技巧分析
- POV使用是否得当
- 伏笔设置的分布和呼应情况
- 叙事视角切换的合理性
- 描写/对话/行动的比例分布

### 6. 优缺点分析
- 小说的突出优点（3-5点）
- 主要问题和不足（3-5点）
- 与同类优秀作品的对比
- 改进优先级建议

## 📊 输出格式

请以JSON格式返回详细分析报告：

```json
{
  "overall_assessment": {
    "score": 82,
    "level": "good",
    "summary": "整体质量良好，但在节奏控制和角色弧线方面有提升空间"
  },
  "structure_analysis": {
    "narrative_structure": "非线性，多线并行",
    "act_division": {
      "act1": {"chapters": [1, 2, 3], "assessment": "良好"},
      "act2": {"chapters": [4, 5, 6, 7], "assessment": "有些拖沓"},
      "act3": {"chapters": [8, 9, 10], "assessment": "高潮部分精彩"}
    },
    "chapter_division_quality": "章节划分合理，但第5-7章可以考虑合并或拆分",
    "completeness": "叙事完整，但有2个伏笔未回应"
  },
  "pacing_analysis": {
    "chapter_pacing": [
      {"chapter": 1, "pacing": "medium", "word_count": 5000},
      {"chapter": 2, "pacing": "fast", "word_count": 3000},
      {"chapter": 3, "pacing": "slow", "word_count": 8000}
    ],
    "pacing_trend": "整体节奏变化合理，但第3章过慢",
    "climax_distribution": [3, 7, 10],
    "recommendations": [
      "第3章建议压缩至5000字，删除部分环境描写",
      "第6-7章之间可以加快节奏"
    ]
  },
  "character_arcs": {
    "main_characters": [
      {
        "name": "角色A",
        "arc_completeness": "完整",
        "growth_moments": [
          {"chapter": 2, "event": "初次战斗", "impact": "建立勇气"},
          {"chapter": 7, "event": "重要抉择", "impact": "思想成熟"}
        ],
        "assessment": "角色弧线清晰，成长合理"
      }
    ],
    "supporting_characters": [
      {
        "name": "角色B",
        "function": "导师",
        "presence": "适中",
        "assessment": "角色功能明确"
      }
    ],
    "recommendations": [
      "角色C的出场时间过少，建议增加戏份",
      "角色D和角色E功能重叠，可以考虑合并"
    ]
  },
  "worldview_consistency": {
    "overall_score": 88,
    "rule_violations": 2,
    "term_inconsistencies": 3,
    "timeline_issues": 1,
    "details": "整体一致性好，但有几处小的不一致"
  },
  "narrative_techniques": {
    "pov_usage": {
      "assessment": "POV使用合理",
      "switching_quality": "视角切换自然",
      "issues": ["第4章POV切换过于频繁"]
    },
    "foreshadowing": {
      "total_foreshadows": 12,
      "resolved": 10,
      "unresolved": 2,
      "assessment": "伏笔设置良好，但有两处未呼应"
    },
    "description_ratio": {
      "dialogue": 30,
      "narration": 40,
      "action": 20,
      "description": 10,
      "assessment": "比例合理"
    }
  },
  "strengths": [
    "世界观设定丰富且一致",
    "角色塑造立体，有成长弧线",
    "情节设计巧妙，有意外转折"
  ],
  "weaknesses": [
    "部分章节节奏拖沓",
    "两个伏笔未回应",
    "次要角色功能重叠"
  ],
  "improvement_priorities": [
    {"priority": 1, "action": "压缩第3章内容，加快节奏"},
    {"priority": 2, "action": "补充回应未解决的伏笔"},
    {"priority": 3, "action": "优化次要角色功能分布"}
  ],
  "comparison": {
    "similar_works": ["作品A", "作品B"],
    "competitive_analysis": "在同类作品中属于中上水平，世界观设定有创新"
  }
}
```

**注意**：
- 分析应该客观、具体，避免泛泛而谈
- 每个结论都应该有具体章节和数据支撑
- 建议应该可执行，而不是空泛的"建议改进"
```

---

### **4.4 世界观规则手册生成**

**场景**：基于小说内容，自动提取和整理世界观规则

**提示词模板**：
```markdown
你是一位世界构建专家，负责从小说内容中提取和整理世界观规则。

## 📖 小说内容

${chapters.map(c => `
### 第${c.number}章
${c.content}
`).join('\n\n')}

## 📋 现有规则（如果有）

${existingRules.map(r => `
- **${r.rule_name}** (${r.rule_type})：${r.rule_description}
`).join('\n')}

## 🔍 提取任务

请从小说内容中识别以下类型的规则：

1. **物理规则**：世界的基础物理法则
2. **魔法/超自然规则**：超自然现象的运作规律
3. **社会规则**：社会制度、法律、习俗
4. **时间规则**：时间流速、时间线设定
5. **生物规则**：生物特性、种族设定（如有）
6. **技术规则**：科技水平、技术限制（如有）

### 提取标准

- 规则应该是明确的、可执行的法则
- 避免提取偶然事件或一次性设定
- 规则应该在小说的多个地方都有体现
- 如果规则有例外情况，也要标注

### 对于每条规则，请提供：

1. **规则名称**：简洁明了的名称
2. **规则类型**：physics/magic/society/time/biology/technology
3. **规则分类**：更细的分类（如"魔法规则"下的"元素魔法"）
4. **规则描述**：完整、准确的描述
5. **规则示例**：小说中体现该规则的例子
6. **优先级**：high/medium/low（基于规则的重要性）
7. **例外情况**：如果有例外，也要说明

## 📊 输出格式

```json
{
  "extracted_rules": [
    {
      "rule_name": "元素魔法不能同时使用两种元素",
      "rule_type": "magic",
      "rule_category": "元素魔法",
      "rule_description": "在小说世界中，魔法师在同一时刻只能使用一种元素的力量，无法同时操控火元素和水元素等相冲突的元素",
      "examples": [
        "第2章：'他集中精神，只能释放火球术，无法同时使用水盾'",
        "第5章：'她必须在火系魔法和冰系魔法之间切换，无法同时使用'"
      ],
      "priority": "high",
      "exceptions": "传说中达到'元素共鸣'境界的极少数法师可以打破这个规则",
      "confidence": "high"  // high/medium/low，基于规则在文本中的明确程度
    }
  ],
  "ambiguous_rules": [
    {
      "rule_description": "关于'魔法师学院'的规则似乎有不一致之处",
      "context": "第3章提到'学院禁止学生外出'，但第7章有学生外出的情节",
      "suggestion": "需要作者确认是否规则有例外，或情节有矛盾"
    }
  ],
  "suggested_rules": [
    {
      "rule_name": "时间流速规则",
      "reason": "小说中提到'一年过去了'，但未明确说明小说世界的时间流速与现实的对应关系",
      "suggestion": "建议明确时间流速设定，或标注为'不确定'"
    }
  ],
  "statistics": {
    "total_rules": 15,
    "physics": 3,
    "magic": 5,
    "society": 4,
    "time": 2,
    "other": 1
  }
}
```

**注意**：
- 只提取明确的、反复出现的规则
- 不确定的规则标记为"ambiguous"
- 建议的规则应该基于文本中明显的设定缺失
```

---

### **4.5 时间线逻辑验证**

**场景**：验证小说中的时间线是否合理，检测时间冲突

**提示词模板**：
```markdown
你是一位时间线逻辑专家，负责验证小说中的时间线设定是否合理。

## ⏰ 时间线设定

**纪元名称**：${timeline.epoch}
**起始时间**：${timeline.start_seconds}秒
**时间单位换算**：
- 1小时 = ${timeline.hour_length_in_seconds}秒
- 1天 = ${timeline.day_length_in_hours}小时
- 1月 = ${timeline.month_length_in_days}天
- 1年 = ${timeline.year_length_in_months}月

## 📚 章节时间线

${chapters.map(c => `
### 第${c.number}章：${c.title}
**时间点**：${c.timestamp}秒（${formatTime(c.timestamp)}）
**事件**：
${c.events.map(e => `- ${e.title}：${e.timestamp}秒`).join('\n')}
`).join('\n\n')}

## 👥 角色年龄设定

${characters.map(c => `
**${c.name}**
- 出生时间：${c.birthTime}秒
- 当前状态：在第${c.currentChapter}章时${c.currentAge}岁
`).join('\n')}

## 🔍 验证任务

请检查以下时间线问题：

1. **时间顺序验证**
   - 章节时间点是否按顺序排列
   - 事件时间是否符合时间顺序
   - 是否有时间倒流或跳跃不合理的情况

2. **角色年龄一致性**
   - 角色的年龄是否与时间线一致
   - "X年前"、"X年后"等表述是否准确
   - 角色年龄增长是否符合时间流逝

3. **时间跨度合理性**
   - 章节间的时间跨度是否合理
   - 事件间隔是否符合逻辑
   - 是否有时间跨度过大或过小的问题

4. **时间表述一致性**
   - "三年前"、"去年"等表述是否准确
   - 相对时间表述是否与绝对时间一致

## 📊 输出格式

```json
{
  "timeline_validity": {
    "overall_valid": true,
    "score": 92,
    "total_issues": 2
  },
  "time_order_issues": [
    {
      "id": "TO001",
      "type": "chapter_order_conflict",
      "description": "第3章时间点（公元100年1月）早于第2章（公元100年3月）",
      "chapters": [2, 3],
      "suggestion": "调整章节顺序或修正时间点"
    }
  ],
  "character_age_issues": [
    {
      "id": "CA001",
      "character": "角色A",
      "issue": "在第5章时角色A应该是18岁，但文中提到'三年前15岁'，计算应该是17岁",
      "location": {"chapter": 5, "snippet": "三年前，他还是15岁的少年"},
      "suggestion": "将'三年前'改为'四年前'，或调整角色年龄设定"
    }
  ],
  "time_span_issues": [
    {
      "id": "TS001",
      "type": "too_long",
      "description": "第3章到第4章之间跨越了10年，但没有说明原因",
      "chapters": [3, 4],
      "time_span": "10年",
      "suggestion": "如果是有意跳过，建议添加'十年后'等过渡说明"
    }
  ],
  "time_expression_issues": [
    {
      "id": "TE001",
      "type": "relative_time_inconsistency",
      "description": "第7章提到'去年发生的事件'，但根据时间线计算应该是'两年前'",
      "location": {"chapter": 7},
      "suggestion": "修正相对时间表述"
    }
  ],
  "recommendations": [
    "建议制作时间线可视化图表，方便检查和展示",
    "建议在重要章节明确标注绝对时间"
  ]
}
```
```

---

### **4.6 角色关系网络分析**

**场景**：分析整部小说中的角色关系网络

**提示词模板**：
```markdown
你是一位社会网络分析专家，负责分析小说中的角色关系网络。

## 👥 角色列表

${characters.map(c => `
**${c.name}**
- 身份：${c.identity}
- 阵营：${c.faction}
- 性格：${c.personality}
- 动机：${c.motivation}
`).join('\n')}

## 📚 章节内容（含角色互动）

${chapters.map(c => `
### 第${c.number}章
**出场角色**：${c.characters.join('、')}
**主要内容**：${c.summary}
${c.keyInteractions.map(i => `- ${i.character1}与${i.character2}：${i.interaction}`).join('\n')}
`).join('\n\n')}

## 🔗 现有关系设定

${existingRelations.map(r => `
**${r.character1}** -[${r.relation_type}]-> **${r.character2}**
- 关系强度：${r.relation_strength}
- 描述：${r.description}
`).join('\n')}

## 🔍 分析任务

请分析以下内容：

1. **关系网络结构**
   - 角色间的直接关系
   - 关系的类型和强度
   - 关系网络的核心节点（重要角色）
   - 关系网络的子群（小团体）

2. **关系变化轨迹**
   - 各角色关系在时间线上的变化
   - 关系转折点分析
   - 关系变化是否合理

3. **关系功能分析**
   - 哪些关系推动了情节
   - 哪些关系是冗余的
   - 缺失的重要关系

4. **关系一致性检查**
   - 文本中的关系描述是否与设定一致
   - 关系强度是否与互动频率匹配
   - 是否有矛盾的关系描述

## 📊 输出格式

```json
{
  "network_structure": {
    "total_characters": 15,
    "total_relations": 28,
    "core_characters": ["角色A", "角色B", "角色C"],
    "isolated_characters": ["角色D"],
    "subgroups": [
      {
        "name": "主角团",
        "members": ["角色A", "角色B", "角色C"],
        "cohesion": "high"
      }
    ]
  },
  "relation_analysis": [
    {
      "character1": "角色A",
      "character2": "角色B",
      "relation_type": "friend",
      "current_strength": 85,
      "trajectory": [
        {"chapter": 1, "strength": 50, "event": "初次相遇"},
        {"chapter": 5, "strength": 70, "event": "共同战斗"},
        {"chapter": 10, "strength": 85, "event": "生死与共"}
      ],
      "assessment": "关系发展合理，有清晰的成长轨迹"
    }
  ],
  "relation_issues": [
    {
      "id": "R001",
      "type": "inconsistency",
      "description": "设定中角色A和角色B是'敌人'，但第7章中他们的互动更像是'竞争对手'",
      "suggestion": "要么调整关系设定，要么调整互动描述"
    }
  ],
  "missing_relations": [
    {
      "suggestion": "角色C和角色D在多个章节中同时出场，但未设定明确关系",
      "recommendation": "建议明确他们的关系类型"
    }
  ],
  "recommendations": [
    "角色D与其他角色缺乏互动，建议增加戏份",
    "角色A的关系网络过于集中，建议分散一些关系给次要角色"
  ]
}
```
```

---

### **4.7 章节摘要生成（长文本压缩）**

**场景**：将长章节压缩为准确、保留关键信息的摘要

**提示词模板**：
```markdown
你是一位专业的文本摘要专家，负责将章节内容压缩为准确、完整的摘要。

## 📝 待摘要章节

### 第${chapter.number}章：${chapter.title}
**字数**：${chapter.wordCount}字
**目标摘要长度**：${targetLength}字（保留${targetRatio}%）

**章节内容**：
${chapter.content}

## 📋 前情摘要（上下文）

${previousSummaries.map(s => `
**第${s.chapterNumber}章摘要**：${s.summary}
`).join('\n')}

## ✂️ 摘要要求

请生成一个准确、完整的章节摘要，要求：

1. **保留关键信息**
   - 主要事件和情节推进
   - 重要角色的行动和决策
   - 关键对话或心理描写
   - 世界观元素的展示

2. **保持逻辑连贯**
   - 摘要应该能独立理解
   - 与前文摘要衔接自然
   - 因果关系清晰

3. **控制长度**
   - 目标字数：${targetLength}字（±100字）
   - 删除细节描写，保留情节要点
   - 删除重复表述

4. **格式要求**
   - 使用第三人称客观叙述
   - 段落清晰，结构合理
   - 关键人物和地名保持完整

## 📊 输出格式

请提供以下格式的输出：

```json
{
  "summary": "完整的章节摘要文本（${targetLength}字左右）",
  "key_events": [
    "事件1：...",
    "事件2：..."
  ],
  "key_characters": ["角色A", "角色B"],
  "key_locations": ["地点A", "地点B"],
  "important_quotes": [
    {
      "speaker": "角色A",
      "quote": "关键对话或独白",
      "significance": "说明其重要性"
    }
  ],
  "worldview_elements": [
    "展示的世界观元素1",
    "展示的世界观元素2"
  ],
  "compression_ratio": 0.15,
  "information_loss_assessment": "low"  // low/medium/high
}
```

**注意**：
- 摘要应该准确反映原文内容，不要添加或删除关键情节
- 如果原章节本身就很简短，摘要可以接近原文
- 如果信息损失较大，请标注为"medium"或"high"
```

---

## **五、在你的工程中的集成方案**

### **5.1 API调用封装**

```typescript
// src/business/aiNoval/common/geminiApi.ts

interface GeminiPromptConfig {
    template: string;
    inputs: Record<string, any>;
    worldviewId: number;
    returnType: 'json' | 'text' | 'structured';
}

async function callGemini(config: GeminiPromptConfig) {
    // 1. 加载提示词模板
    const template = await loadPromptTemplate(config.template);
    
    // 2. 加载世界观数据（规则、词典等）
    const worldviewData = await loadWorldViewData(config.worldviewId);
    
    // 3. 构建完整提示词
    const fullPrompt = buildGeminiPrompt(template, config.inputs, worldviewData);
    
    // 4. 调用Gemini API
    const response = await fetch(`${GEMINI_API_URL}/generateContent`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${await getGeminiApiKey(config.worldviewId)}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: fullPrompt
                }]
            }],
            generationConfig: {
                temperature: 0.3,  // Gemini适合较低温度，保持准确性
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,  // 充分利用长输出能力
                responseMimeType: "application/json"  // 如果返回JSON
            }
        })
    });
    
    return response;
}
```

### **5.2 前端组件集成**

```typescript
// src/business/aiNoval/worldViewManage/components/ConsistencyCheckPanel.tsx

// 使用Gemini进行一致性检查的组件
const ConsistencyCheckPanel = ({ worldviewId, chapterIds }) => {
    const [checking, setChecking] = useState(false);
    const [result, setResult] = useState(null);
    
    const handleCheck = async () => {
        setChecking(true);
        try {
            // 调用Gemini一致性检查API
            const response = await geminiApi.consistencyCheck({
                worldviewId,
                chapterIds,
                strictMode: true
            });
            setResult(response);
        } finally {
            setChecking(false);
        }
    };
    
    // 展示检查结果...
}
```

---

## **六、实施优先级**

**Phase 1（立即实施）**：
1. 世界观一致性检查
2. 专有名词词典生成

**Phase 2（1-2周内）**：
3. 时间线逻辑验证
4. 章节摘要生成

**Phase 3（2-4周内）**：
5. 世界观规则手册生成
6. 长文本综合分析

**Phase 4（可选）**：
7. 角色关系网络分析

---

该方案充分利用 Gemini 的长上下文能力，重点做一致性检查和质量把关。需要我调整某些提示词模板，或补充更多场景吗？