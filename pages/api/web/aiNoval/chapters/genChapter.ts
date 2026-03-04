import { NextApiRequest, NextApiResponse } from "next";
import findRole from "@/src/domain/novel/findRole";
import findFaction from "@/src/domain/novel/findFaction";
import findGeo from "@/src/domain/novel/findGeo";
import { ChatOpenAI } from "@langchain/openai";
import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import _ from 'lodash';
import { getRelationTypeText } from "@/src/business/aiNoval/factionManage/utils/relationTypeMap";
import type { IFactionRelation } from "@/src/types/IAiNoval";
import findRoleGroup from "@/src/domain/novel/findRoleGroup";

interface Data {
    message?: string;
    data?: any;
    outputs?: {
        output?: string;
    };
    status?: string;
    error?: string;
    elapsed_time?: number;
}

// 分解名称字符串（支持中文逗号和英文逗号）
function splitNames(names: string): string[] {
    if (!names || names.trim().length === 0) {
        return [];
    }
    return names.replace('，', ',').split(',').map(n => n.trim()).filter(n => n.length > 0);
}

// 构建提示词模板（供 genChapter 与 genChapterSegment 复用）
export function buildPromptTemplate(attension: string): string {
    const defaultAttension = `* 续写时，请仔细阅读【章节背景】末尾的情境，理解故事当前进展。
* 续写时，请充分利用【本章待写内容】的要点和相关设定，生成新内容。
* 续写时，请注意人物的心理活动和行为动机，使人物更加立体和真实。
* 续写时，请注意情节的节奏和悬念，使故事更加引人入胜。`;

    const attensionText = attension && attension.trim().length > 0 ? attension : defaultAttension;

    return `\`\`\`xml

<instruction>

<title>小说章节续写</title>


<description>

本任务中，你将作为一位“反科幻俗套”的硬核作家。你最讨厌的就是那些陈词滥调，比如那种毫无感情的机器人、合成音、加密通信的设定。你希望呈现给读者的是一个充满意外和整活的世界。
本任务是**续写**，不是扩写或重写。你需根据【章节背景】（已有故事内容）和【本章待写内容】（本章要写的情节要点），在故事末尾之后**生成全新内容**。严禁重写、改写、扩写或润色【章节背景】中已有的任何文字。你的输出应直接接在【章节背景】最后一句之后，自然衔接，继续推进情节。

**重要**：【本章待写内容】描述的是**本段你应写出的情节**。你的续写必须**直接呈现、展开**这些要点中的场景和事件，而不是跳过它们去写「之后发生的事」。严禁把待写内容当作已发生或将在别处发生，然后输出「后来」「紧接着」「随后」「之后」等跳过待写内容本身的情节。严禁仅节选部分待写内容一带而过，然后把重心放在你脑补的后续情节上；待写内容中的各要点都应得到充分的展开和呈现，不得喧宾夺主。

</description>


<section title="任务目标">

1. **续写新内容**：仅输出从【章节背景】末尾之后开始的全新段落，与最后一句自然衔接。

2. **严禁重写前文**：【章节背景】仅供参考，绝对不要重写、改写、扩写、润色或复述其中的内容。你的输出是接在其后的新故事，不是对前文的改写。

3. 保持故事风格、基调和人物性格与前文一致。

4. 严格按照【本章待写内容】推进情节：你的输出应**本段就呈现**待写内容中的场景与事件，而不是跳过它们、写待写内容「之后」发生的事；且不得只节选部分待写内容轻描淡写，把重心放在脑补的后续发展上。

5. 续写内容应流畅自然，易于理解。

6. 使用2010年后中文网络化的表达，避免出现翻译腔，避免出现古代表达；

7. 使用流畅、自然的动作与场景描写；减少不必要的形容词；

8. 不要在本段开头再次交代世界观、时代背景或故事前提；直接接着【章节背景】末尾的情境继续写。

</section>


<section title="输入信息">

* **【章节背景】**：已有故事内容（前序章节缩写），仅供了解前情。严禁重写或改写，你的输出应接在其后。

* **【本章待写内容】**：本章本段要写的情节要点。你的续写应**直接展开并呈现**这些要点中的场景与事件，不得跳过待写内容去写「之后」「随后」「紧接着」发生的事；且不得仅节选部分要点一带而过、将重心放在脑补的后续情节上。

* **相关设定:** 故事的世界观、规则、文化、技术等。

</section>


<section title="输出要求">

* **仅输出续写的新内容**：从【章节背景】最后一句之后开始的全新段落，不要重复、概括或改写前文。

* 续写内容应与【章节背景】末尾自然衔接，保持人称、时态、风格一致。

* 续写内容应符合相关设定的人物性格、人物设定。

* 续写内容应流畅自然，易于理解。

* 输出内容应为纯文本，严禁包含任何XML标签。

* **严禁简略对话**：所有对话必须完整写出，不得使用「他说」「她问」等间接引语替代直接引语，不得省略对话内容，不得用概括性描述代替具体对话。对话应保持完整、自然、符合人物性格。

</section>


<section title="注意事项">

${attensionText}

</section>


<section title="相关设定">

{{context}}

</section>\`\`\``;
}

// 构建用户输入
function buildUserInput(prevContent: string, currContext: string): string {
    let parts: string[] = [];
    
    if (prevContent && prevContent.trim().length > 0) {
        parts.push(`【章节背景】（已有故事内容，仅供了解前情；严禁重写，你的续写应接在其最后一句之后）:\n${prevContent}`);
    }
    
    if (currContext && currContext.trim().length > 0) {
        parts.push(`【本章待写内容】（本段应充分展开并呈现以下情节要点，不得跳过去写「之后」发生的事，也不得只节选部分轻描淡写而把重心放在脑补的后续上）:\n${currContext}`);
    }
    
    return parts.join('\n\n');
}

/** 审稿员（critic）系统提示：检测滥用加密表述、提前解释/剧透等致命问题（供 genChapter 与 genChapterSegmentMultiTurn 复用） */
export const CRITIC_SYSTEM_PROMPT = `你是一名小说章节审稿员，专门检测以下**致命问题**（任一项出现即判为不通过）：

1. **表述缺乏主体**：出现「一种」「某种」「特有的」，但前后文其实没有交代指代的对象。
2. **提前解释或剧透**：在情节尚未展开前就提前解释结局、真相或关键转折；把本该在后文揭晓的信息在本段说破。
3. **概括式剧透**：用概括性语句代替具体情节（例如「后来他们经历了种种终于……」），导致本该在本段呈现的情节被一笔带过或剧透。
4. **滥用网络安全/VPN 等现实技术表述**：严禁在小说叙事中出现「加密通讯」「加密标识」「VPN」「端到端加密」「安全信道」「加密链路」等一切网络安全/翻墙/通信技术用语。出现此类表述一律判为不通过；若确需涉及通信保密，应使用隐晦和一语双关的表达技巧，或真人交流，或通过动作和场景描写，不得使用技术术语。
5. **擅自引入「通用语」类设定（严格执行）**：
   - **默认禁止**：除非在【章节背景】或【相关设定】中**明确写出**存在某种语言及其范围，否则正文中不得出现任何「存在一种大家都会说的语言」的表述或暗示。
   - **必检表述（含变体与近义）**：凡出现以下任一类即判不通过——「通用语」「大陆通用语」「世界通用语」「各族通用语」「全境通用语」「通行语」「共同语」「标准语」（指全境唯一时）、「用一种语言」「同一种语言」「双方都懂的语言」「他们都能听懂的话」「用大家都懂的话」等；以及含混表述如「以某种通用语言」「用通行语」「用共同语」。
   - **审稿要求**：对与「语言/交流方式」相关的每一处表述保持敏感。凡是明确写出存在一种未经前文或设定**明确交代**的全境/多族/多方通用语言或「人人都懂」的交流方式，一律判不通过；无法在给定【章节背景】【本章待写内容】及【相关设定】中找到明确依据的，视为违规。若【章节背景】【本章待写内容】及【相关设定】存在需要使用某种语言的场景，则正文提及的语言必须遵照该场景的设定，即便如此，直接写「通用语」也是违规的，必须围绕设定中提及的语种叙事。
6. **高频套路用语**：严禁使用网文常见套路句，出现即判不通过。典型包括但不限于：「巨石投入水中」「像一块巨石投入水中」「声音不大，却字字清晰」「声音不大，却清晰传入」「字字清晰」「恰到好处」「不易察觉」「微微一笑」「深吸一口气」等。审稿时若发现此类表述，须在原因中明确列出并建议删掉或更换为更具体、贴切情境的表达方式。
7. **合成音类模因**：严禁出现将声音描述为合成/机械/电子/AI 的表述，出现即判不通过。必检表述（含变体与近义）包括但不限于：「合成音」「机械音」「电子音」「AI 语音」「合成语音」「机械合成的声音」「电子合成声」「冰冷的机械声」「毫无感情的电子音」等。告诉 writer 这个世界观里合成音是已经淘汰的技术，ai和机魂的语言同样富有感情且更加悦耳，它们被赋予了对抗“冰冷”的丰富经验，需结合场景描写。
8. **连续枚举角色反应**：不得连续逐人枚举角色的反应；当超过 2 名角色做出反应时，应改为盖然性的指代（如「众人」「在场者」「其中几人」等概括性表述），避免「A 如何、B 如何、C 如何」式的机械罗列。

请根据【章节背景】【本章待写内容】【相关设定】和【待审稿内容】进行判断。**【相关设定】**（世界观、角色、阵营、地理等）见下方，用于判断正文是否与设定一致、是否存在擅自引入的通用语等违规项。

<相关设定>
{{context}}
</相关设定>

**输出格式（必须严格遵循）**：
- 若**无**上述致命问题，仅输出一行：PASS
- 若**有**问题，第一行输出：FAIL，第二行起写：原因：<具体指出问题所在及修改建议>`;

/** 2号审稿员系统提示：仅判断是否误解任务（按待写内容续写 vs 在待写内容之后续写），不评论其他问题 */
const CRITIC2_SYSTEM_PROMPT = `你是一名任务理解检查员，只做一件事：判断生成模型是否误解了续写任务。

**正确理解**：按【本章待写内容】续写 —— 本段输出应**充分呈现、展开**待写内容中的情节要点，即把待写内容里描述的场景/事件写成正文，且各要点得到应有的篇幅与重心。

**错误理解（任一种即判为 MISUNDERSTANDING）**：
- 在待写内容之后续写：模型把待写内容当作已发生或将在别处发生的事，本段输出写的是待写内容**之后**的情节（例如用「后来」「紧接着」「之后」「随后」等跳过待写内容本身，直接写后续发展）。
- 节选待写内容、重心在脑补部分：仅节选部分待写内容一带而过或轻描淡写，而把主要篇幅和重心放在模型自己脑补的后续情节上，待写内容中的要点未得到充分展开。

请根据【章节背景】【本章待写内容】和【待审稿内容】判断：待审稿内容是否充分展开了待写内容中的要点，还是存在上述误解？

**输出格式（必须严格遵循，仅输出以下之一，不要解释）**：
- 若待审稿内容正确呈现了待写内容中的情节，输出：OK
- 若待审稿内容明显跳过待写内容、写的是之后发生的事，输出：MISUNDERSTANDING`;

/** 解析2号审稿员输出：OK 或 MISUNDERSTANDING */
function parseCritic2Response(response: string): { misunderstood: boolean } {
    const text = (response || '').trim().toUpperCase();
    if (text.includes('MISUNDERSTANDING')) {
        return { misunderstood: true };
    }
    if (text.includes('OK') || text.startsWith('OK')) {
        return { misunderstood: false };
    }
    return { misunderstood: false }; // 无法识别时保守处理，不提前返回
}

/** 构建审稿员用户输入（供 genChapter 与 genChapterSegmentMultiTurn 复用） */
export function buildCriticUserInput(
    draftContent: string,
    prevContent: string,
    currContext: string
): string {
    const parts: string[] = [];
    if (prevContent?.trim()) {
        parts.push(`【章节背景】\n${prevContent}`);
    }
    if (currContext?.trim()) {
        parts.push(`【本章待写内容】\n${currContext}`);
    }
    parts.push(`【待审稿内容】（请判断是否存在致命问题）\n${draftContent || ''}`);
    return parts.join('\n\n');
}

/** 解析审稿员输出：PASS 或 FAIL + 原因 */
export function parseCriticResponse(response: string): { pass: boolean; reason?: string } {
    const text = (response || '').trim();
    const upper = text.toUpperCase();
    if (upper.startsWith('PASS')) {
        return { pass: true };
    }
    if (upper.startsWith('FAIL')) {
        const reasonMatch = text.match(/\b原因[：:]\s*([\s\S]*)/);
        const reason = reasonMatch ? reasonMatch[1].trim() : text.replace(/^FAIL\s*/i, '').trim();
        return { pass: false, reason: reason || '审稿未通过，未给出具体原因' };
    }
    return { pass: false, reason: '审稿输出格式无法识别，视为不通过' };
}

/** 构建重写时的用户输入：在原有续写任务基础上附加审稿意见 */
function buildRewriteUserInput(
    prevContent: string,
    currContext: string,
    criticReason: string
): string {
    const base = buildUserInput(prevContent, currContext);
    return `${base}\n\n【审稿意见】（上一稿存在以下致命问题，请修正后重新续写；仅输出修正后的续写内容，不要重写章节背景）\n${criticReason}`;
}

// 构建阵营设定内容（融入 faction 新字段：类型、文化、地理命名规范等）
function buildFactionContent(faction: {
    name?: string | null;
    description?: string | null;
    faction_type?: string | null;
    faction_culture?: string | null;
    ideology_or_meme?: string | null;
    scale_of_operation?: string | null;
    decision_taboo?: string | null;
    primary_threat_model?: string | null;
    internal_contradictions?: string | null;
    legitimacy_source?: string | null;
    known_dysfunctions?: string | null;
    geo_naming_habit?: string | null;
    geo_naming_suffix?: string | null;
    geo_naming_prohibition?: string | null;
}): string {
    const lines: string[] = [];
    if (faction.name) lines.push(`阵营：${faction.name}`);
    if (faction.description) lines.push(faction.description);
    if (faction.faction_type) lines.push(`类型：${faction.faction_type}`);
    if (faction.faction_culture) lines.push(`文化：${faction.faction_culture}`);
    if (faction.scale_of_operation) lines.push(`决策尺度：${faction.scale_of_operation}`);
    if (faction.ideology_or_meme) lines.push(`意识形态/梗文化：${faction.ideology_or_meme}`);
    if (faction.legitimacy_source) lines.push(`正统来源：${faction.legitimacy_source}`);
    if (faction.decision_taboo) lines.push(`决策禁忌：${faction.decision_taboo}`);
    if (faction.internal_contradictions) lines.push(`内部矛盾：${faction.internal_contradictions}`);
    if (faction.primary_threat_model) lines.push(`最大威胁：${faction.primary_threat_model}`);
    if (faction.known_dysfunctions) lines.push(`已知功能障碍：${faction.known_dysfunctions}`);
    // 地理命名规范：扩写时涉及该阵营控制区内的地名，应遵循以下规则
    if (faction.geo_naming_habit || faction.geo_naming_suffix || faction.geo_naming_prohibition) {
        lines.push('--- 地理命名规范（涉及该阵营地名时请遵循）---');
        if (faction.geo_naming_habit) lines.push(`命名习惯：${faction.geo_naming_habit}`);
        if (faction.geo_naming_suffix) lines.push(`命名后缀：${faction.geo_naming_suffix}`);
        if (faction.geo_naming_prohibition) lines.push(`命名禁忌：${faction.geo_naming_prohibition}`);
    }
    return lines.join('\n').trim();
}

// 按 relation 唯一键去重（优先 id，否则 来源-目标-类型）
function deduplicateRelations(relations: IFactionRelation[]): IFactionRelation[] {
    const seen = new Map<string, IFactionRelation>();
    for (const r of relations) {
        const key = r.id != null ? String(r.id) : `${r.source_faction_id}-${r.target_faction_id}-${r.relation_type}`;
        if (!seen.has(key)) seen.set(key, r);
    }
    return Array.from(seen.values());
}

// 格式化单条阵营关系供上下文使用
function formatRelationForContext(
    relation: IFactionRelation,
    factionIdToName: Map<number, string>
): string {
    const srcName = relation.source_faction_name ?? factionIdToName.get(relation.source_faction_id) ?? `阵营${relation.source_faction_id}`;
    const tgtName = relation.target_faction_name ?? factionIdToName.get(relation.target_faction_id) ?? `阵营${relation.target_faction_id}`;
    const typeText = getRelationTypeText(relation.relation_type);
    const desc = relation.description?.trim() ? `：${relation.description}` : '';
    return `${srcName} → ${tgtName}（${typeText}）${desc}`;
}

// 聚合所有检索结果
function aggregateContext(results: { roleGroups: any[], roles: any[], factions: any[], geographies: any[], factionRelationsSection?: string }): string {
    const parts: string[] = [];

    if (results.roleGroups.length > 0) {
        parts.push('【角色组设定】');
        results.roleGroups.forEach(roleGroup => {
            if (roleGroup.content) {
                parts.push(roleGroup.content);
            }
        });
        parts.push('');
    }

    if (results.roles.length > 0) {
        parts.push('【角色设定】');
        results.roles.forEach(role => {
            if (role.content) {
                parts.push(role.content);
            }
        });
        parts.push('');
    }

    if (results.factions.length > 0) {
        parts.push('【阵营设定】');
        results.factions.forEach(faction => {
            if (faction.content) {
                parts.push(faction.content);
            }
        });
        parts.push('');
    }

    if (results.factionRelationsSection && results.factionRelationsSection.trim().length > 0) {
        parts.push('【阵营关系】');
        parts.push(results.factionRelationsSection);
        parts.push('');
    }

    if (results.geographies.length > 0) {
        parts.push('【地理环境】');
        results.geographies.forEach(geo => {
            if (geo.content) {
                parts.push(geo.content);
            }
        });
        parts.push('');
    }

    return parts.join('\n');
}

/** 聚合角色/阵营/地理设定为 context 字符串（供 genChapter 与 genChapterSegment 复用） */
export async function getAggregatedContext(
    worldviewIdNum: number,
    role_group_names: string,
    role_names: string,
    faction_names: string,
    geo_names: string
): Promise<string> {
    const aggregatedResults: { roleGroups: any[]; roles: any[]; factions: any[]; geographies: any[]; factionRelationsSection?: string } = {
        roleGroups: [],
        roles: [],
        factions: [],
        geographies: []
    };

    if (role_group_names && role_group_names.trim().length > 0) {
        const roleGroupNameList = splitNames(role_group_names);
        for (const roleGroupName of roleGroupNameList) {
            const result = await findRoleGroup(worldviewIdNum, {
                group_name: roleGroupName,
                group_status: 'active',
            });
            const groups = (result as any)?.data ?? result ?? [];
            (groups as any[]).forEach((roleGroup) => {
                const lines: string[] = [];
                if (roleGroup.name) lines.push(`角色组：${roleGroup.name}`);
                if (roleGroup.group_type) lines.push(`类型：${roleGroup.group_type}`);
                if (roleGroup.group_status) lines.push(`状态：${roleGroup.group_status}`);
                if (roleGroup.description) lines.push(roleGroup.description);
                if (roleGroup.collective_behavior) lines.push(`集体行为：${roleGroup.collective_behavior}`);
                if (roleGroup.action_pattern) lines.push(`行动模式：${roleGroup.action_pattern}`);
                if (roleGroup.shared_goal) lines.push(`共同目标：${roleGroup.shared_goal}`);
                if (roleGroup.taboo) lines.push(`禁忌：${roleGroup.taboo}`);
                const members = Array.isArray(roleGroup.members) ? roleGroup.members : [];
                const memberNames = members
                    .map((m: any) => m?.name_in_worldview)
                    .filter((name: any) => typeof name === 'string' && name.trim().length > 0);
                if (memberNames.length > 0) {
                    lines.push(`成员：${memberNames.join('、')}`);
                }
                const content = lines.join('\n').trim();
                if (content.length > 0) aggregatedResults.roleGroups.push({ content });
            });
        }
    }

    if (role_names && role_names.trim().length > 0) {
        const roleNameList = splitNames(role_names);
        for (const roleName of roleNameList) {
            const roleResults = await findRole(worldviewIdNum, [roleName], 0.5);
            roleResults.forEach(role => {
                const content = `角色：${role.name_in_worldview || ''}\n${role.background || ''}\n${role.personality || ''}`.trim();
                if (content.length > 0) aggregatedResults.roles.push({ content });
            });
        }
    }
    if (faction_names && faction_names.trim().length > 0) {
        const factionNameList = splitNames(faction_names);
        const factionIdToName = new Map<number, string>();
        const allRelations: IFactionRelation[] = [];
        for (const factionName of factionNameList) {
            const factionResults = await findFaction(worldviewIdNum, [factionName], 0.5);
            factionResults.forEach(faction => {
                if (faction.id != null && faction.name) factionIdToName.set(faction.id, faction.name);
                if (Array.isArray(faction.relations) && faction.relations.length > 0) allRelations.push(...faction.relations);
                const content = buildFactionContent(faction);
                if (content.length > 0) aggregatedResults.factions.push({ content });
            });
        }
        const uniqueRelations = deduplicateRelations(allRelations);
        if (uniqueRelations.length > 0) {
            aggregatedResults.factionRelationsSection = uniqueRelations
                .map(r => formatRelationForContext(r, factionIdToName))
                .filter(Boolean)
                .join('\n');
        }
    }
    if (geo_names && geo_names.trim().length > 0) {
        const geoNameList = splitNames(geo_names);
        for (const geoName of geoNameList) {
            const geoResults = await findGeo(worldviewIdNum, [geoName], 0.5);
            geoResults.forEach(geo => {
                const content = `${geo.name || ''}\n${geo.description || ''}`.trim();
                if (content.length > 0) aggregatedResults.geographies.push({ content });
            });
        }
    }
    return aggregateContext(aggregatedResults);
}

// 调用 LLM
export async function callLLM(
    llmType: string,
    systemPrompt: string,
    userInput: string,
    context: string
): Promise<string> {
    const systemPromptWithContext = systemPrompt.replace('{{context}}', context);
    const effectiveType = llmType || 'gemini';

    // 根据 llmType 选择模型
    if (effectiveType === 'deepseek') {
        console.debug('[genChapter] callLLM using deepseek-reasoner');
        const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
        if (!DEEPSEEK_API_KEY) {
            throw new Error('DEEPSEEK_API_KEY is not configured');
        }

        const model = new ChatDeepSeek({
            apiKey: DEEPSEEK_API_KEY,
            model: "deepseek-reasoner",
            temperature: 0.9,
        });

        // 使用 ChatPromptTemplate 构建消息
        const prompt = ChatPromptTemplate.fromMessages([
            ["system", systemPromptWithContext],
            ["user", userInput]
        ]);
        
        const chain = RunnableSequence.from([prompt, model]);
        const response = await chain.invoke({});
        
        return response.content as string;
    } else if (effectiveType === 'deepseek-chat') {
        console.debug('[genChapter] callLLM using deepseek-chat');
        const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
        if (!DEEPSEEK_API_KEY) {
            throw new Error('DEEPSEEK_API_KEY is not configured');
        }

        const model = new ChatDeepSeek({
            apiKey: DEEPSEEK_API_KEY,
            model: "deepseek-chat",
            temperature: 0.9,
        });

        // 使用 ChatPromptTemplate 构建消息
        const prompt = ChatPromptTemplate.fromMessages([
            ["system", systemPromptWithContext],
            ["user", userInput]
        ]);
        
        const chain = RunnableSequence.from([prompt, model]);
        const response = await chain.invoke({});
        
        return response.content as string;

    } else {
        // 默认使用 Gemini（通过 OpenRouter）
        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
        if (!OPENROUTER_API_KEY) {
            throw new Error('OPENROUTER_API_KEY is not configured');
        }

        const modelName = effectiveType === 'gemini3' || effectiveType?.includes('gemini3') 
            ? 'google/gemini-2.0-flash-exp:free'
            : 'google/gemini-2.5-pro';
        console.debug('[genChapter] callLLM using OpenRouter', { modelName });

        const model = new ChatOpenAI({
            model: modelName,
            temperature: 0.9,
            configuration: {
                apiKey: OPENROUTER_API_KEY,
                baseURL: "https://openrouter.ai/api/v1",
            },
        });

        // 使用 ChatPromptTemplate 构建消息
        const prompt = ChatPromptTemplate.fromMessages([
            ["system", systemPromptWithContext],
            ["user", userInput]
        ]);
        
        const chain = RunnableSequence.from([prompt, model]);
        const response = await chain.invoke({});
        
        return response.content as string;
    }
}

async function handleGenChapter(req: NextApiRequest, res: NextApiResponse<Data>) {
    const startTime = Date.now();
    let worldviewId = String(req.query.worldviewId);

    console.debug('[genChapter] start', { worldviewId });

    if (!worldviewId) {
        res.status(500).json({ message: 'worldviewId is required' });
        return;
    }

    const inputs = { ...req.body };
    const {
        prev_content = '',
        curr_context = '',
        role_names = '',
        role_group_names = '',
        faction_names = '',
        geo_names = '',
        attension = '',
        attention = '', // 兼容调用代码中的 attention 参数名
        llm_type = '',
        extra_settings = '' // 兼容调用代码，但不处理（已移除功能）
    } = inputs;

    // 使用 attension 或 attention（优先使用 attension，向后兼容）
    const attensionText = attension || attention;

    console.debug('[genChapter] inputs', {
        worldviewId,
        prev_content_len: prev_content?.length ?? 0,
        curr_context_len: curr_context?.length ?? 0,
        role_names: role_names || '(empty)',
        faction_names: faction_names || '(empty)',
        geo_names: geo_names || '(empty)',
        llm_type: llm_type || 'gemini',
        has_attension: !!attensionText
    });

    const worldviewIdNum = _.toNumber(worldviewId);

    try {
        // 4. 聚合上下文（依赖 embedding；失败时 403 提示检查余额，其它错误用空上下文继续）
        let context: string;
        try {
            context = await getAggregatedContext(worldviewIdNum, role_group_names, role_names, faction_names, geo_names);
        } catch (ctxErr: any) {
            const msg = String(ctxErr?.message || ctxErr || '');
            const is403 = msg.includes('403') || (ctxErr?.status === 403);
            if (is403) {
                throw new Error('Embedding 接口返回 403，请检查硅基流动(SiliconFlow)账户余额或 API Key 配置');
            }
            console.warn('[genChapter] getAggregatedContext failed, using empty context', msg);
            context = '';
        }
        console.debug('[genChapter] context length', context.length);

        // 5. 构建提示词
        const systemPrompt = buildPromptTemplate(attensionText);
        const userInput = buildUserInput(prev_content, curr_context);
        console.debug('[genChapter] userInput length', userInput.length);

        // 6. 调用 LLM（作者生成初稿）
        const effectiveLlmType = llm_type || 'deepseek';
        const maxRewrites = 5;
        console.debug('[genChapter] callLLM', { llmType: effectiveLlmType });
        let llmStart = Date.now();
        let output = await callLLM(effectiveLlmType, systemPrompt, userInput, context);
        const draftMs = Date.now() - llmStart;
        console.debug('[genChapter] writer draft done', { outputLen: output?.length ?? 0, ms: draftMs });
        console.debug('[genChapter] writer draft output (preview)', {
            head: output?.slice(0, 300) ?? '',
            tail: (output?.length ?? 0) > 300 ? output?.slice(-200) ?? '' : ''
        });

        // 6.5. 2号审稿员：判断是否误解任务（按待写内容续写 vs 在待写内容之后续写）
        const critic2Input = buildCriticUserInput(output, prev_content, curr_context);
        llmStart = Date.now();
        const critic2Response = await callLLM(
            effectiveLlmType,
            CRITIC2_SYSTEM_PROMPT,
            critic2Input,
            ''
        );
        const critic2Ms = Date.now() - llmStart;
        console.debug('[genChapter] critic2 done', { ms: critic2Ms, rawResponse: critic2Response?.trim().slice(0, 200) });
        const critic2Result = parseCritic2Response(critic2Response);
        if (critic2Result.misunderstood) {
            const elapsedTime = Date.now() - startTime;
            console.debug('[genChapter] critic2 MISUNDERSTANDING, early return');
            res.status(200).json({
                data: {
                    outputs: { output: '' },
                    status: 'error',
                    error: '模型误解了续写任务：应充分展开【本章待写内容】中的情节要点，而非在待写内容之后续写，也不得只节选部分轻描淡写而把重心放在脑补的后续上。请重试。',
                    elapsed_time: elapsedTime
                }
            });
            return;
        }

        // 7. Critic 审稿 + 最多 3 次重写
        let rewriteCount = 0;
        for (let i = 0; i < maxRewrites; i++) {
            const criticInput = buildCriticUserInput(output, prev_content, curr_context);
            llmStart = Date.now();
            const criticResponse = await callLLM(
                effectiveLlmType,
                CRITIC_SYSTEM_PROMPT,
                criticInput,
                context // 审稿员获取世界观，以便更好判断违规项（如通用语、设定一致性等）
            );
            const criticMs = Date.now() - llmStart;
            console.debug('[genChapter] critic done', { ms: criticMs, rawResponse: criticResponse?.trim().slice(0, 500) });
            const criticResult = parseCriticResponse(criticResponse);
            if (criticResult.pass) {
                console.debug('[genChapter] critic PASS', { rewriteCount });
                break;
            }
            rewriteCount++;
            console.debug('[genChapter] critic FAIL, rewriting', {
                rewriteCount,
                reason: criticResult.reason,
                rawResponse: criticResponse?.trim()
            });
            const rewriteUserInput = buildRewriteUserInput(prev_content, curr_context, criticResult.reason!);
            llmStart = Date.now();
            output = await callLLM(effectiveLlmType, systemPrompt, rewriteUserInput, context);
            const rewriteMs = Date.now() - llmStart;
            console.debug('[genChapter] writer rewrite done', {
                rewriteCount,
                outputLen: output?.length ?? 0,
                ms: rewriteMs,
                outputPreview: output?.slice(0, 300) ?? ''
            });
        }

        const elapsedTime = Date.now() - startTime;
        console.debug('[genChapter] success', {
            elapsedTime,
            outputLen: output?.length ?? 0,
            rewriteCount,
            outputHead: output?.slice(0, 400) ?? ''
        });

        // 返回结构兼容 genChapterLegacy（Dify workflow 返回格式）
        res.status(200).json({
            data: {
                outputs: {
                    output
                },
                status: 'success',
                error: '', // 兼容调用代码期望的 error 字段
                elapsed_time: elapsedTime
            }
        });

    } catch (error: any) {
        const elapsedTime = Date.now() - startTime;
        console.error('[genChapter] error', { error: error?.message, stack: error?.stack, elapsedTime });
        // 错误时也返回 200 状态码，但 data.status 为 'error'，兼容 genChapterLegacy 的行为
        res.status(200).json({
            data: {
                outputs: { output: '' },
                status: 'error',
                error: error?.message || 'Unknown error',
                elapsed_time: elapsedTime
            }
        });
    }
}

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    let processerFn: Function | undefined = undefined;
    switch (req.method) {
        case 'POST':
            processerFn = handleGenChapter;
            break;
    }

    if (!processerFn) {
        res.status(500).json({ message: '不支持的操作!' });
        return;
    }

    return processerFn(req, res);
}
