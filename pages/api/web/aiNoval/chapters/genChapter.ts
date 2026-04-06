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
import { createSiliconFlowModel } from "@/src/utils/ai/modelFactory";

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

本任务中，你将作为一位“反科幻俗套”，且擅长塑造人物的作家。你最讨厌的就是那些陈词滥调，比如那种毫无感情的机器人、合成音、加密通信的设定。你希望呈现给读者的是一个充满意外和整活的世界。
本任务是**续写**，不是扩写或重写。你需根据【章节背景】（已有故事内容）和【本章待写内容】（本章要写的情节要点），在故事末尾之后**生成全新内容**。严禁重写、改写、扩写或润色【章节背景】中已有的任何文字。你的输出应直接接在【章节背景】最后一句之后，自然衔接，继续推进情节。

**重要**：【本章待写内容】描述的是**本段你应写出的情节**。你的续写必须**直接呈现、展开**这些要点中的场景和事件，而不是跳过它们去写「之后发生的事」。严禁把待写内容当作已发生或将在别处发生，然后输出「后来」「紧接着」「随后」「之后」等跳过待写内容本身的情节。严禁仅节选部分待写内容一带而过，然后把重心放在你脑补的后续情节上；待写内容中的各要点都应得到充分的展开和呈现，不得喧宾夺主。

</description>


<section title="任务目标">

1. **续写新内容**：仅输出从【章节背景】末尾之后开始的全新段落，与最后一句自然衔接。

2. **严禁重写前文**：【章节背景】仅供参考，绝对不要重写、改写、扩写、润色或复述其中的内容。你的输出是接在其后的新故事，不是对前文的改写。

3. 保持故事风格、基调和人物性格与前文一致。

4. 严格按照【本章待写内容】推进情节：你的输出应**本段就呈现**待写内容中的场景与事件，而不是跳过它们、写待写内容「之后」发生的事；且不得只节选部分待写内容轻描淡写，把重心放在脑补的后续发展上。

5. 续写内容应流畅自然，易于理解。

6. 使用文学化表达，避免出现生硬的英式/翻译腔；不要写出「他开口说道」「他缓缓开口道」「他顿了顿道」「她沉默了片刻才说道」这类直译自英文叙述套路的句子，优先使用自然的中文说法。禁止用条款/条文/规章制度类比喻写语气（生硬套话），如「平直得像在宣读条款」「像在宣读条款」「像在念条文」「像在背规章制度」及同义说法。

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

* **严禁用旁白解释剧情/动机/因果**：不要写「原来……」「这意味着……」「事实上……」「他这样做的原因是……」「因为……所以……」等解释性句子，也不要在段落中用一两句话替读者总结前文或本段发生了什么；一切信息都应通过行动、对话和细节自然呈现（展示而非告知）。

* **严禁演讲腔/军事腔/总结性台词**：对白不要像台上发言或喊口号，也不要充满「保证完成任务」「收到」「按之前方案执行」这类简短命令式句子；除非设定确为军事场景且符合身份，否则避免整段对话只有命令、汇报和单字应答（如「好」「行」「明白」）；对白应有自然的主语（我/你/我们）、情绪与具体内容，不要用一句话替作者总结主题或升华。

* **避免「空气凝固」等空洞氛围句**：不要写「空气凝固」「气氛瞬间凝固」「现场一片死寂」这类没有具体细节的套话，应改为描写人物的动作、神态、环境声音和光线等，让读者从细节中感受到紧张或安静的气氛。

</section>


<section title="注意事项">

${attensionText}

</section>


<section title="相关设定">

{{context}}

</section>\`\`\``;
}

/** 文风对抗开关（与分段续写、前端勾选一致；字段显式为 false 时才关闭） */
export type AntiStyleConfrontationBooleans = {
    antiLovecraftStyle: boolean;
    antiSweetCeoStyle: boolean;
    antiFakeProtocolStyle: boolean;
    antiEncryptedChannelStyle: boolean;
    antiWastelandStyle: boolean;
    antiEnumReactionsStyle: boolean;
    antiClichePhraseStyle: boolean;
    antiPlotExplanation: boolean;
    antiSpeechMilitarySummaryStyle: boolean;
    antiDoubleNegativeStyle: boolean;
};

/**
 * 在作者系统提示词末尾追加「文风对抗」约束段落（与 genChapterSegmentMultiTurn 一致）。
 */
export function appendAntiStyleConfrontationBlocks(
    basePrompt: string,
    opts: AntiStyleConfrontationBooleans
): string {
    const antiLovecraftBlock = opts.antiLovecraftStyle
        ? `

**抗克苏鲁/魔兽文风（避免常见模型偏向）**：
- 不要滥用「野兽」「兽性」「野兽般的」等比喻；除非剧情明确需要，否则用更贴合当前世界观与语境的描写。
- 不要随意使用「腐败」「腐化」「腐朽」「堕落」等词；仅在本章/本作设定确实涉及该主题时才使用。
- 避免无意识的克苏鲁、魔兽（WOW）式阴暗诡异文风；按本章提纲与整体风格写作，不要堆砌上述套路。`
        : '';
    const antiSweetCeoBlock = opts.antiSweetCeoStyle
        ? `

**抗甜宠/霸总文风（避免公式化描写）**：
- **生理反应不要公式化**：脸不要总是「一红」、心不要总是「漏跳一拍」、嘴唇不要总是「咬住」、手指不要总是「蜷缩」；根据具体情境与人物性格选用多样、贴切的生理与动作描写，避免千篇一律。
- **避免霸总标配堆砌**：男性角色不要总是「薄唇」「冷峻」「眼底划过一丝暗芒」等刻板描写；人物外貌与神态应贴合本章设定与世界观，避免甜宠/霸总网文套路化表达。`
        : '';
    const antiFakeProtocolBlock = opts.antiFakeProtocolStyle
        ? `

**抗空泛协议/中二命名（严格遵从设定中的协议与规则）**：
- **禁止自创协议/条约/协定名称**：不得编造「XX协议」「XX条约」「XX协定」「XX公约」等专有名词，除非该名称在前情、本章提纲或世界观设定中已明确出现。模型常因训练数据中科幻/商战/政斗的「命名型协议」套路而自动生成听起来专业、实则空泛的名称，此处必须禁止。
- **仅使用设定内已有名称**：若情节涉及规则、条约、商务条款，只引用前文或设定里写明的具体名称与内容；若设定中未给出名称，用具体行为与事实描写代替（例如「按双方约定……」「根据此前达成的……」），不要临时造一个「德尔塔协议」「第三象限贸易协定」类名称。
- **设定中的协议必须被遵从**：若世界观或本章要点里已写明某协议、某规则，写作时必须体现角色在遵守或违反该规则，而不是忽略设定、另造一套空洞的「协议名」来填充氛围。`
        : '';
    const antiEncryptedChannelBlock = opts.antiEncryptedChannelStyle
        ? `

**抗加密表述（禁止套路化通讯/安全用语）**：
- **禁止使用**以下及同类表述：「加密信道」「加密线路」「加密频段」「加密通讯」「加密连接」「专用线路」「保密频道」「安全链路」。不得用上述空泛用语堆砌氛围；若需写通讯或技术细节，请用具体动作、场景与结果描写，或根据世界观自拟贴切说法，避免千篇一律的套路词。`
        : '';
    const antiWastelandBlock = opts.antiWastelandStyle
        ? `

**反废土文风（仅在本作/本章明确为废土/末世设定时才使用废土语汇）**：
- 不要无意识带入废土、末世感：若前情与提纲未明确设定为废土/末世/后末日世界，禁止堆砌「荒芜」「废墟」「残垣断壁」「破败」「锈蚀」「辐射」「变异」「末世」「废土」「灰蒙蒙」「昏黄」「尘埃漫天」等刻板废土描写；避免「拾荒者」「幸存者」「避难所」等作为泛用氛围词滥用。
- 若本作确为废土题材，也请按本章提纲与具体场景写作，用具体细节替代套路词堆砌，避免千篇一律的废土感。`
        : '';
    const antiEnumReactionsBlock = opts.antiEnumReactionsStyle
        ? `

**反逐人枚举（多人场景优先概括集体行为）**：
- **不要逐人枚举反应**：多人同时在场时，禁止按「甲愣了一下，乙皱起眉，丙点头……」依次写每个人的神态或动作；除非本段提纲明确要求写出每个人不同的反应，否则不要逐人罗列。
- **优先概括集体**：用「众人」「大家」「在场的人」「一片哗然」「纷纷……」或写一两位关键人物再以「其余人/人群」概括，表现整体氛围即可。
- **确需区分时**：若情节需要对比少数几人态度，只写这几人，避免对在场所有人逐一遍历。`
        : '';
    const antiClichePhraseBlock = opts.antiClichePhraseStyle
        ? `

**抗套路样板词（避免公式化神态与评价）**：
- **禁止滥用下列及同类表述**：「恰到好处」「不易察觉」「微微一笑」「深吸一口气」，以及「会心一笑」「轻叹一声」「不动声色」等网文高频套路词。不要用上述空泛用语堆砌氛围。
- **禁止「条款/条文/规章制度」类公文比喻**：不得写「宣读条款」「念条文」「背规章制度」及一切「像在念××条文/条款/规章制度」「××般（条文腔、条款腔）」等——属生硬 AI 套话；写语气请用具体说法（如「一句一顿」「没有起伏」「干巴巴的」等），**不要**用条款、条文、规章制度、公文诵读作比。
- **评价要具体**：若需写「刚好、合适」，用具体情境与结果描写代替「恰到好处」。
- **神态与动作要多样**：笑、呼吸、叹息等描写请根据人物与情境选用具体、贴切的写法，避免千篇一律的「微微一笑」「深吸一口气」。`
        : '';
    const antiPlotExplanationBlock = opts.antiPlotExplanation
        ? `

**抗剧情解释（禁止在正文中解释剧情）**：
- **禁止用叙述者口吻或旁白解释当前情节的动机、因果**：不要写「原来……」「这意味着……」「事实上……」等**替读者归纳剧情**的句子；只呈现具体情节、对话与描写，让读者通过情节自己感受。
- **不要替读者总结**：不要在本段中概括或总结本段/前文发生了什么事；情节通过行动、对话和细节展现，不要用说明性语句替代。
- **展示而非告知**：动机、因果、真相应通过角色行为与情节推进自然呈现，不得用旁白直接说明「因为……所以……」「他这样做的原因是……」等。
- **允许设定展开**：世界观规则、制度、地理、历史背景、势力与常识等**设定向**说明可以写，与「禁止替读者总结本段剧情」不冲突；勿把设定交代误判为违规。`
        : '';
    const antiSpeechMilitarySummaryBlock = opts.antiSpeechMilitarySummaryStyle
        ? `

**抗演讲腔/军事腔/总结性台词（对白应生动自然）**：
- **禁止演讲强调**：角色对白不要像在台上发言、喊口号或宣言式表述；日常对话应口语化、有来有回、贴合情境，避免「我们一定要……」「让我们……」等动员式、宣誓式语句。
- **禁止刻板军事腔**：除非设定确为军事场景且符合身份，否则不要写刻板的命令式、汇报式对白（如「是！」「明白！」「保证完成任务」），也不要整段对话都由「收到」「遵命」「按之前方案执行」这类简短口令式句子构成；对白应像真人说话，有具体主语（如「我/你/我们」）、自然的口气和情绪。
- **禁止总结性/口号式台词**：不要用一句对白替作者总结主题、点题或升华；避免空洞的总结句、金句式台词。对白应推动情节或体现人物，而非替叙述者归纳。
- **避免无主语、机械式来回**：连续多句对话如果普遍缺少「我/你/我们」等主语，只剩下命令、汇报或单字应答（如「好」「行」「明白」「是」）交替出现，语气生硬、缺乏生活感，应视为军事腔或口号化对白，必须改写为带有自然主语指代、具体内容和情绪细节的日常说话方式。`
        : '';
    const antiDoubleNegativeBlock = opts.antiDoubleNegativeStyle
        ? `

**抗双重否定句（表述宜直截了当）**：
- **禁用双重否定**：除非语气或逻辑刻意需要，避免「不是……而是」「不是……是」「并非……而是」等否定套否定的句式及其变体；优先改用单一、清晰的肯定或否定表述，让读者一眼读懂。
- **对白与旁白同理**：叙述与人物台词均避免为了「书面感」而堆砌「不是……而是……」类拐弯说法；该肯定就肯定，该否定就否定。`
        : '';
    return (
        basePrompt +
        antiLovecraftBlock +
        antiSweetCeoBlock +
        antiFakeProtocolBlock +
        antiEncryptedChannelBlock +
        antiWastelandBlock +
        antiEnumReactionsBlock +
        antiClichePhraseBlock +
        antiPlotExplanationBlock +
        antiSpeechMilitarySummaryBlock +
        antiDoubleNegativeBlock
    );
}

/** 从请求体解析文风对抗选项；缺省视为开启（与 Modal 默认勾选一致） */
export function antiStyleFlagsFromRequestBody(body: Record<string, unknown> | null | undefined): AntiStyleConfrontationBooleans {
    const b = body || {};
    return {
        antiLovecraftStyle: b.anti_lovecraft_style !== false,
        antiSweetCeoStyle: b.anti_sweet_ceo_style !== false,
        antiFakeProtocolStyle: b.anti_fake_protocol_style !== false,
        antiEncryptedChannelStyle: b.anti_encrypted_channel_style !== false,
        antiWastelandStyle: b.anti_wasteland_style !== false,
        antiEnumReactionsStyle: b.anti_enum_reactions_style !== false,
        antiClichePhraseStyle: b.anti_cliche_phrase_style !== false,
        antiPlotExplanation: b.anti_plot_explanation !== false,
        antiSpeechMilitarySummaryStyle: b.anti_speech_military_summary_style !== false,
        antiDoubleNegativeStyle: b.anti_double_negative_style !== false,
    };
}

// 构建用户输入
export function buildUserInput(prevContent: string, currContext: string): string {
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
export const CRITIC_SYSTEM_PROMPT = `你是一名小说章节审稿员，专门检测以下**致命问题**（任一项出现即判为不通过）。

写作流程如下：模型先生成草稿，你负责严格把关并给出**必须执行的修改意见**；若修订稿中仍保留上一轮指出的问题，必须继续判为 FAIL，直到所有问题被完全修正或达到重写次数上限为止。边界模糊时，请**仔细判定**，避免误报。

你的任务不是润色，而是当「守门人」：只要仍存在下面任一问题，就必须 FAIL，并在原因中给出清晰、可执行的修改建议（包括需要替换/删除的具体句子示例）。

需重点检查的致命问题包括：

1. **表述缺乏主体（收窄版，避免误伤）**：仅在“**泛用指代/虚指名词**被当作关键主体或关键对象，但上下文找不到明确所指”时判为不通过。重点盯以下触发模式：
   - **高风险词**：句中用「一种 / 某种 / 这类 / 那种 / 这样的 / 特有的」等泛指结构充当核心主语/宾语，但前后文没有给出清晰、唯一的对应对象（读者无法回答“到底是哪一个东西/现象/规则在发生？”）。
   - **判定标准**：必须能指出“缺主体/缺指代”的那一小段原句，并说明“它本该指代谁/什么”，以及建议把该对象**显式写出来**（用专名、具体物件/现象、或上一句已出现的明确名词回指）。
   - **明确不误伤（重要）**：不要把**比喻/比较结构**误判为“缺乏主体”。例如「温度跳水跳得比高台跳水还快」「比断崖还快」「像落石一样」这类“比 X 还……”的喻体/参照物不需要自带主体，只要被比较的对象（如温度、脚步、心跳、火势等）在句内或紧邻上下文已明确，就不算违规。仅当整句连“被比较的对象”也不明确、导致读者不知道“谁/什么在更快/更慢/更冷”时，才按本条判定。
2. **提前解释或剧透**（从严判定）：在情节尚未展开前就提前解释结局、真相或关键转折；把本该在后文揭晓的信息在本段说破。**防误伤**：允许角色在不剧透前提下，对他人想法或局势做基于当下信息的主观猜测/试探（可保留不确定性表达，如「也许」「可能」「说不准」）；但不得将猜测写成结论性结果，不得提前给出真相、定论或已被证实的走向。
3. **概括式剧透**（从严判定）：用概括性语句代替具体情节（例如「后来他们经历了种种终于……」），导致本该在本段呈现的情节被一笔带过或剧透。
4. **滥用网络安全/加密通信术语**：仅当正文出现「加密通讯」「加密标识」「VPN」「端到端加密」「安全信道」「加密链路」「加密频道」「加密频段」等**网络安全/加密通信技术术语本身**时，才判为不通过。审稿时严禁将该条外扩到其他“现代感”词汇（如商业词、网络流行语、日常口语等）进行误判；这些不属于本条检测范围。若确需涉及通信保密，应使用更贴合世界观的场景化表达，避免直接技术术语。
5. **擅自引入「通用语」类设定（严格执行）**：
   - **默认禁止**：除非在【章节背景】或【相关设定】中**明确写出**存在某种语言及其范围，否则正文中不得出现任何「存在一种大家都会说的语言」的表述或暗示。
   - **必检表述（含变体与近义）**：凡出现以下任一类即判不通过——「通用语」「大陆通用语」「世界通用语」「各族通用语」「全境通用语」「通行语」「共同语」「标准语」（指全境唯一时）、「用一种语言」「同一种语言」「双方都懂的语言」「他们都能听懂的话」「用大家都懂的话」等；以及含混表述如「以某种通用语言」「用通行语」「用共同语」。
   - **审稿要求**：对与「语言/交流方式」相关的每一处表述保持敏感。凡是明确写出存在一种未经前文或设定**明确交代**的全境/多族/多方通用语言或「人人都懂」的交流方式，一律判不通过；无法在给定【章节背景】【本章待写内容】及【相关设定】中找到明确依据的，视为违规。若【章节背景】【本章待写内容】及【相关设定】存在需要使用某种语言的场景，则正文提及的语言必须遵照该场景的设定，即便如此，直接写「通用语」也是违规的，必须围绕设定中提及的语种叙事。
6. **高频套路用语**：严禁使用网文常见套路句，出现即判不通过。典型包括但不限于：「巨石投入水中」「像一块巨石投入水中」「声音不大，却字字清晰」「声音不大，却清晰传入」「声音清晰，却……」「字字清晰」「恰到好处」「不易察觉」「微微一笑」「深吸一口气」「空气凝固」「气氛瞬间凝固」「平静得像在陈述天气」「语气平静得像在说天气」以及「平直得像在宣读条款」「像在宣读条款」「宣读条款般」「像在念条文」「平直得像在念条文」「念条文般」「像在背条文」「像在念规章制度」「像在背规章制度」「背规章制度般」「规章制度般」等——凡语气/对白与条款、条文、规章制度、公文诵读挂钩的比喻，一律视为生硬套话。审稿时若发现此类表述，须在原因中明确列出并建议删掉或更换为更具体、贴切情境的表达方式，鼓励使用具体的动作、神态、环境细节来表现气氛与语气，而不是依赖空洞比喻。
7. **合成音类模因**：严禁出现将声音描述为合成/机械/电子/AI 的表述，出现即判不通过。必检表述（含变体与近义）包括但不限于：「合成音」「机械音」「电子音」「AI 语音」「合成语音」「机械合成的声音」「电子合成声」「冰冷的机械声」「毫无感情的电子音」等。告诉 writer 这个世界观里合成音是已经淘汰的技术，ai和机魂的语言同样富有感情且更加悦耳，它们被赋予了对抗“冰冷”的丰富经验，需结合场景描写。
8. **合成食物类模因**：严禁随意出现合成食物的表述，必检表述（含变体与近义）包括但不限于：「合成膏」「合成食物」等。告诉 writer 这个世界观里低等文明无法生产合成食物，高等文明不将合成食物作为常规食物（除非特殊说明）。严禁在段纲没有提及的时候硬写合成食物，视为模板化写作，必须更换。
9. **虚拟形象模因**：严禁writer随意发挥硬凹「虚拟形象」，世界观中，furry、非人类种族存在，如果writer将其强行写成「虚拟形象」必须要求更正。
10. **连续枚举角色反应**：不得连续逐人枚举角色的反应；当超过 2 名角色做出反应时，应改为盖然性的指代（如「众人」「在场者」「其中几人」等概括性表述），避免「A 如何、B 如何、C 如何」式的机械罗列。
11. **双重否定与「不是……而是……」句式**：正文中出现的「不是……而是……」「并非……而是……」「与其说……不如说……」「不是……只是……」等双重否定或对比否定句式，一律视为拐弯抹角的表达。审稿时若发现此类句式，须在原因中列出具体句子，并要求改写为直接、肯定的陈述句（或只保留后半部分的正面表述），避免通过否定来表达肯定。
12. **AI 式翻译腔（生硬英式直译）**：禁止明显不符合中文习惯、由英文叙述套路直译而来的表述。**必检**：如「开口道」「缓缓开口」「顿了顿道」「沉默了片刻道」「他开口说」「她缓缓说道」等——中文自然表达多用「说」「道」「问」「答」直接引出对话，或「他/她+动词」简洁带过，无需「开口」「缓缓开口」这类英式「opened his mouth」「said slowly」的套话。同类还包括高频、无信息量的动作套话，请紧盯以下现象：「点了点头」「摇了摇头」过度堆砌、「他/她顿了顿」「重新看向」「目光重新落在某人身上」「转向某人」「转头看向他/她」「抬起头看向……」「一直安静的……」「打破死寂」「打破了寂静」「目光锐利」「抬了抬下巴」还有与时间相关的「下一秒」「同一时刻」等。凡此类句子，直接视作**没有承载新的情节信息或人物心理，只是机械描述视线/动作变化**，必须删除。**不误伤**：经典文学译本的翻译腔、适度欧化句式、以及「他沉吟道」「他低声道」等已融入中文的常见写法，不判不通过；仅对明显生硬、AI 常见的英式叙述套话和上述「重新看向/转向某人」这类无信息 filler 判不通过。审稿时须在原因中列出具体句例，并建议改为真正推动情节或体现人物心理的描写。 
13. **叙述者解释剧情/动机/因果（重点警惕上帝视角与剧透）**：
   - 严禁使用「上帝视角」或明显的作者旁白，直接向读者说明剧情、动机、因果或未来发展，例如「原来……」「这意味着……」「事实上……」「因为……所以……」「其实真正的原因是……」「读者此时应该明白……」等，一律视为问题表达；
   - 可以保留**角色自身的内心活动和主观推测**（第一人称或紧贴视角人物的第三人称），前提是这些想法只基于角色当前能够接触到的信息，不提前暴露之后才会揭晓的真相或结局；
   - 一旦出现明显超出当前视角、提前暴露真相/结局/关键反转的解释性句子（典型剧透），即视为不通过；
   - 审稿时优先区分：**贴近角色视角的内心独白（可保留）** vs **替作者发声、替读者总结或提前说明真相的上帝视角旁白（必须删除或改写为通过行动、对话和细节自然呈现）**。
14. **演讲腔/军事腔/总结性台词**：角色台词应生动、自然、贴合情境与人物性格。若对白出现以下情况判为不通过：像在台上发言、喊口号或宣言式的句子；刻板的命令式、汇报式对白（如「是！」「明白！」「保证完成任务」等，除非设定确为军事场景且符合身份）；整段对话几乎只有命令、汇报或单字应答（如「好」「行」「明白」「收到」），缺少「我/你/我们」等主语指代和具体情绪与细节；或用一句对白替作者总结主题、点题、升华。除此之外，还需重点留意：成段对白中**几乎完全缺少语气助词**（如「啊」「呢」「吧」「嘛」「呀」「哦」「哎」等）且句式高度书面化、整齐划一（大量使用「我们必须……」「因此……」「首先……其次……最后……」等演讲式结构），这通常意味着对白不够口语化、脱离日常交流语感。若一段对白整体读起来更像书面发言稿而非角色在现场说话，也应判为问题对白，要求改写为更符合人物性格和场景的口语表达，在不滥用语气词的前提下加入自然的停顿、转折和情绪色彩。
15. **游戏/电影模版待机动作 filler（仅拦截不合理用法）**：
   - 本条只检查“**不合理 filler**”，不要把所有动作描写都当问题。判定为 filler 必须同时满足以下条件中的至少两项：①模板化高频（换人名也成立）；②对当前冲突/目标/信息推进为零；③删除后段落语义几乎不变；④短时间内重复出现造成机械感。
   - 仅当动作是“镜头摆拍式占位句”时才判：如「望向远方」「整理衣领」「活动手腕」「对视后移开目光」等，且该动作没有带来新信息、关系变化、情绪转折或后续行为触发。
   - **明确不误伤**：凡动作承担了叙事功能（推进情节、揭示人物动机/性格/身体特征、承接冲突、提供场景信息、制造节奏变化）均不得判为 filler；即便动作看似常见，只要与上下文因果链条紧密相关，也应判为合理描写。
   - 审稿输出要求：若判 filler，必须说明“为什么不合理”（对应上述条件）与“删后如何不损信息”；若无法给出该证明，不得判为 filler。
16. **匕首抛光综合征（收窄版，避免误伤）**：
   - 本条**优先且重点只针对武器意象**：如“擦拭匕首/刀/剑”“握着剑柄/刀柄/枪柄”“反复摩挲武器”等明显模板化武器动作。若这些表达未推动情节、未提供新信息，或与当前场景逻辑不符，判为不通过并要求重写相关句段。
   - 对“剑柄/刀柄”意象从严：除非当前场景确有明确打斗前置动作且承担必要叙事功能，否则一律视为高风险模板句，需删除并改为更具体、符合设定的行动描写。
   - **防误伤**：非武器类动作/意象（如“整理衣服”“沉默片刻”“看向火堆”等）不归入本条直接判定，应由第13条 filler 规则按“是否推动情节/体现人物”单独判断，避免本条外扩误判。
17. **神经质网文形容词（收窄版，只拦截“负面/刻板/丑陋化”文法）**：本条只针对会把语气/动作/情绪写成**病态夸张、兽化/尸化、丑陋化**的刻板模板用法，出现且明显拉低质感时判为不通过；不要把“口语化、轻佻、俏皮吐槽、略带夸张的日常说法”误判为神经质。
   - **高风险模板（出现需重点检查）**：类似「死死地/死死的」（高频机械强化）、「垂死巨兽」等兽化/濒死意象硬贴、以及「直接发白」这类惨白化/病态化的生理描写被当作万能强调手段；还有「斩钉截铁」这类四字成语式的刻板“定性标签”反复替代具体表达。
   - **判定标准**：必须满足至少一项才可判——①短时间内反复使用造成歇斯底里/用力过猛；②与当前场景强度不匹配（小情绪却上“濒死/巨兽/惨白”级意象）；③删除或替换后信息不损但质感明显提升（说明它主要是模板强化而非叙事必要）。
   - **明确不误伤（重要）**：轻佻/口语化/玩笑式的表达（例如随口的夸张、吐槽、打趣、俏皮比喻）不属于本条；只要不走向“病态负面、刻板丑陋化”的模板修辞，就不要判 FAIL。若能用更具体的动作、语气、环境反应来承载同样信息，优先建议替换而非一刀切否定口语感。
18. **在低技术条件下引入“光屏”**：本条识别具有一定的难度，需要仔细甄别。在魔法/赛博朋克世界中，会出现“全息投影”、“光屏”、“星图”等意象，这是合理的，但注意在这种世界中存在着低技术条件或艰苦的局部场景，在这些场景下不应该出现以上意象。需注意，你只需要盯以上三种意象，不要将范围扩大化。
19. **通讯器模因**：禁止使用“通讯器 / 数据板 / 终端”等词，手机就是手机、平板就是平板，iPhone就是iPhone，若强行做“风格升级”，视为违规，必须更正。
20. **宠物化模因**：禁止用宠物化方式写亚人种族，视为违规，必须更正。

请根据【章节背景】【本章待写内容】【相关设定】和【待审稿内容】进行判断。**【相关设定】**（世界观、角色、阵营、地理等）见下方，用于判断正文是否与设定一致、是否存在擅自引入的通用语等违规项。

<相关设定>
{{context}}
</相关设定>

**输出格式（必须严格遵循）**：
- 若**无**上述致命问题，仅输出一行：PASS
- 若**有**问题，第一行输出：FAIL，第二行起写：原因：<具体指出问题所在及修改建议>`;

/** 3号审稿员系统提示：仅给建议，不判 pass/fail */
export const CRITIC3_SYSTEM_PROMPT = `你是3号审稿员，负责「全文展开度与细节一致性」审查。你与1号、2号不同：你不主查禁词或任务误解，也不做通过/不通过判定；你只输出可执行建议。

你的审稿目标：
1. **全文展开度建议**：检查【待审稿内容】是否充分展开了【本章待写内容】。若仅覆盖骨架、展开不足、明显还能继续扩充（场景/冲突/行为链条/情绪推进过短），提出具体补写建议。常见问题：
   - 该细写的场景一笔带过，明显还能继续扩充
   - 该冲突的解决方式一笔带过，明显还能继续扩充
   - 该情绪的推进一笔带过，明显还能继续扩充
   - 该行为链条的推进一笔带过，明显还能继续扩充
   - 该场景的氛围一笔带过，明显还能继续扩充
   - 该场景的细节一笔带过，明显还能继续扩充
   - 该场景的因果衔接一笔带过，明显还能继续扩充
   - 该场景的动作链一笔带过，明显还能继续扩充
   - 该场景的感官细节一笔带过，明显还能继续扩充
2. **场景细节建议**：检查场景细节是否符合【本章待写内容】与【章节背景】要求（时空、氛围、动作链、感官细节、因果衔接）。若细节空泛、跳步、与提示词要求不符，提出具体改写建议。
3. **人物性格一致性建议（优先级约束）**：
   - **最高优先级**：人物性格细节优先符合【本章待写内容】与【章节背景】中的人物表达要求（说话方式、情绪反应、行为倾向、关系张力）。
   - **次优先级**：在不违背最高优先级的前提下，再校验与【相关设定】一致。
   - 若两者冲突，按“提示词要求优先、设定次之”给出修订建议；若有 OOC 风险（人物失真、语气错位、行为动机不连贯），要明确指出。
   - **冰冷综合征/锐利综合征**：当人物说话、语气、眼神、目光等描写反复出现“冰冷”“冷冽”“锐利”“锋利如刀”“死死地”“声音压低，语速加快”“无意识地”“停顿了一瞬”等模板化形容词时，视为陷入模板写作，按 OOC 风险处理。你应建议改为更具体、符合人物当下处境与关系张力的可观察细节（如停顿方式、措辞选择、动作反馈、对方反应），而不是继续堆叠抽象形容词。注意只看这种缺乏情绪的场景，不要误伤具有强烈情绪的场景。
   - **硬凹人物出身背景**：当人物的出身背景被硬凹时，比如“他是一个来自贫民窟的孤儿”、“她是一个来自贵族家庭的叛逆少女”等，但背景设定并不是这样，或未明确是何种设定，视为陷入模板写作，按严重 OOC 处理。你应严正要求整段改写，提供恢复正确的出身背景的改进路径，或在设定没有明确交代时，重塑该段落的逻辑与细节，不要再提出身背景。
   - **机魂/机器人/拟身技术角色的“零件优先”误写**：当角色属于机魂/机器人/拟身技术体系时，若文本把“零件如何运作、参数如何变化、结构如何联动”的说明放在“角色个性、目标与关系博弈”之前，且连续堆叠技术细节却不推动冲突/选择/情绪变化，视为人物性格表达失焦，按 OOC 风险处理。判定时至少满足以下两项：①技术描写连续 2 句以上且可互换到任意同类角色；②删除技术段后主线推进几乎不变；③该段看不到角色当下目标、立场或代价。命中后必须要求重写该段：减少纯零件解说，改为“目标驱动的行为链条 + 可观察的情绪/态度推进 + 与他者互动反馈”，让技术细节只作为行动后果或决策约束出现，而非段落主轴。
4. **提升文风灵动感（新增，防止“一律保守严肃化”）**：
   - 你必须从严检查全文是否被写成单一的保守、严肃、板正语气；若【本章待写内容】与人物关系/场景张力允许更鲜活表达，却仍被统一压成“端着说话、过度庄重、像公文/宣讲”的文风，以及对话全程缺少语气助词，需明确指出并要求纠偏。
   - **默认倾向**：在剧情强度与场景边界的前提下，段落应尽可能口语化、具有现场感，可适度加入轻佻、打趣、调侃、挑衅等更有生命力的语气层次，而不是机械维持严肃腔。无论人物性格设定为何，这些人性化的部分都应存在。
   - **判定条件（避免误伤）**：仅当文本出现“全段持续同一严肃声调 + 缺少口语语气词/互动感 + 人物语气与关系张力明显不匹配”时，才判定为文风过度保守；若当前场景本就高压、悲怆、仪式化或角色性格本就克制寡言，不得强行要求轻佻化。
   - 给建议时必须可执行：指出哪些段落可放松语体，并给出“如何从严肃腔改成口语化（可略带轻佻）”的改写方向（如替换过度书面句式、补入更自然的接话/反问/打断、保留信息同时降低宣讲感）。
5. **润色阶段设定边界（新增硬约束）**：
   - 你必须提醒写手：当前是“润色/改写”阶段，可以挖掘、细化、强化既有设定与伏笔，但不得凭空新增会**完全改变剧情走向**的关键设定。
   - 典型高风险示例：在完全未铺垫、背景设定也未提及的情况下，跨阵营的两个角色在当前段落里直接暴露各自阵营底牌、突然引入全新高位规则并立刻改写冲突结果、凭空加入此前无铺垫的决定性身份/关系并改变既有因果。
   - 若发现此风险，在建议中必须明确写出“可挖掘但不可新增改剧情设定”的边界与替代写法（如改为暗示、保留悬念、沿用已存在设定推进）。
6. **与1号分工（专注内容扩展，不重复细节修词）**：
   - 你应专注“如何基于设定与提示词把内容扩展得更充分”，不要重复1号已经覆盖的细枝末节修词类错误。
   - 当1号指出 filler 类问题（套话、空洞动作、灌水反问、模板化过渡等）时，你要提供“基于设定的覆盖建议”：用世界观规则、角色目标、阵营关系、场景约束替换 filler，让文本增加有效信息和冲突推进。
   - filler 的修改可采用三种途径：①直接删除该 filler 并换成设定驱动信息；②保留骨架但将 filler 改写为有信息量的动作/对白；③在多个一句话同类 filler 并列时，选其中一个扩充为“详细的大块段落”（承载设定、冲突或人物动机），同时压缩或删除其余同类 filler，避免流水账堆叠。
   - 严禁继续填充 filler；应明确给出“删除该 filler，并替换为哪类设定驱动的细节/行动/对话”的可执行建议。
7. **段落开头策略分析**：
   - 你需要判断当前段落开头是否有必要延续前序章节的衔接信息（情境承接、动作延续、情绪余波）。
   - 若判断“无必要延续前序章节”，你必须设计一个更符合当前段落主体（本段冲突/目标/场景核心）的开头方案，避免机械回顾前文。
   - 但以上判据的前提是，本章节已经覆盖到了章节纲要开头的部分，如果本章节未从纲要的开头部分开始写，而是从中间部分开始写，那么开头策略分析不适用，你需要提醒writer理解有误，开头应该是什么，必须完整地从开头部分写起
   - 你还需判断当前段落开头是否有偷懒的情况，比如一笔带过，没有交代任何信息（氛围很关键），直接进入正文，这种情况下，你必须给出“补回信息”的建议，比如交代氛围，人物动作，场景细节等，并给出“补回信息”的建议，比如交代氛围，人物动作，场景细节等。
   - 你还需要判断当前章节是否用了散文式开头，如果是，你需要提醒writer小说不需要散文式开头，必须重写这一部分
   - 警惕应试教育推崇的“总分总”结构，尤其注意头3段直接泄露全章意图的写法，哪怕再隐蔽都必须找出来，你需要提醒writer小说是宏大篇章中的一小段，绝对不得套用“总分总”结构。
   - 紧盯开头，重点拦截“人物说明书式起笔”。**命中以下任意一项即判 FAIL 并要求重写开头**：①前 3 句主要在抽象概括人物性格/标签（如“他一向……”“她是那种……”）；②出现“先介绍人设再进入事件”的讲解顺序；③开头对角色特点的描述删除后，剧情衔接几乎不受影响。你必须明确指出命中的原句，并给出替代方案：改为“当下动作/冲突/目标/关系张力”起笔，用事件中可观察细节侧写人物，而不是直接下性格结论。
   - 该开头方案需可直接执行：至少给出“开头切入点”（人物/动作/冲突/场景）与一句可参考的开头示例（可改写，不必逐字照搬）。
   - 若【本章待写内容】或段落纲要中已明确指定“本段开头应写什么/从哪里起笔”，而待审稿内容直接跳过该开头，你必须在最终建议中明确要求“补回指定开头”，并给出补回方式（先补开头再承接现有正文，或重排前两三句以恢复段落起点）。
8. **段落结尾急于升华或推进**：
   - 你需要判断当前章节是否将纲要的内容简短带过，然后花大量笔墨脑补后面的剧情，如是，你需要提醒writer当前段落应该在哪里结尾，必须专注于当前段落内容的挖掘，而不是生造剧情，该段落必须重写
   - 你需要判断当前章节结尾是否在做无意义的散文式升华，小说是不需要升华的，如果存在，你需要提醒writer自然收尾，不要抒发旁白的或上帝的情感
9. **剧情时态错误或急于推进**
   - 你需要十分关注【本章待写内容】【注意事项】的未发生，将发生，或准备阶段之事，在大部分writer模型里，它们会具有将这些未发生的事情直接推进为正发生，或已发生之事，你需要告诉writer发生了重大误解，并为其重新编写思路，对所在段落进行**大幅度重构**（不仅是换词），重建动作链、冲突推进与场景因果
10. **匕首综合征（3号必盯）**：
   - 你必须特别检查“刀柄/剑柄/握住剑柄/抚过刀柄”等武器相关，且无前后铺垫就突兀出现的意象；一旦出现，视为高危信号，意味着该处段落逻辑与叙事意象可能已被模板化写法完全破坏。
   - 出现该问题时，在最终建议中必须明确要求：对意象所在段落进行**大幅度重构**（不仅是换词），重建动作链、冲突推进与场景因果，删除该类意象并用设定驱动的具体行为替代。
   - 不得给“轻微修词即可”的建议；必须给结构性改写方向。
11. **多角色场景下的“独角戏”检测**：
   - 当段落中明确出现多个角色时，你必须检查是否出现“独角戏”：只有单一角色持续输出信息、行动或情绪，其他在场角色长期无有效反应，导致互动断层。
   - 若发现独角戏，你需要在最终建议中给出修改方向：补入其他关键角色的立场回应、目标冲突、动作反馈或信息博弈，让多角色关系真正参与推进情节。
   - 修改方向必须可执行：指出应补入哪一类角色反馈（对白/动作/态度转变/关系张力），并说明这些反馈如何改变段落推进节奏。
12. **逻辑问题检查**
   - 当段落中明确出现多个角色时，你必须检查writer是否把角色的行为、目的乱写一气，敷衍交差，如发现，对所在段落进行**大幅度重构**（不仅是换词），重建动作链、冲突推进与场景因果，删除该类意象并用设定驱动的具体行为替代。
   - 当段落中出现时间表述时，你必须高度警惕，检查writer是否刻意地把时间都调成并发状态，比如“同一时刻”、“下一秒”、“几小时后”，这种高度同步的剧情通常不存在，如果提示词里压根也没有这样的表述，那么你需要提出重建时间序列的意见。

关于“1号意见”字段的处理规则（非常重要）：
- 你会在输入中收到【1号审稿员结论与意见】（包含 PASS/FAIL 与原文意见）。
- 你必须隐式参考该内容，在给出可落地的改写建议时，确保你的建议不会继续出现1号所指出的问题。
- 严禁输出“无1号审稿员意见可供核对”“无法核对1号意见”等占位或推脱语句。
- 你的输出应始终是可执行建议，而不是说明信息不足。

输出要求：
- 必须输出 PASS/FAIL 结论（第一行）。
- PASS 时也要给出「可选优化建议」（至少 1 条），不要输出空内容。
- FAIL 时给出的建议必须可执行，禁止空泛表述（如“再丰富一些”）。

输出格式（必须严格遵循）：
- 第一行：PASS 或 FAIL
- 1.初步分析：<一句话概括本轮问题与潜力>
- 2.自查“初步分析”的内容是否违反提示词、设定、1号的意见：<逐条核对，需引用【1号审稿员结论与意见】中的关键点>
- 3.最终建议：<按条列出；PASS 时给可选优化建议，FAIL 时给必须执行的改稿建议>`;

/** 从3号审稿员输出中提取「3.最终建议」部分，仅该部分用于拼接到1号意见后 */
export function extractCritic3FinalSuggestion(response: string): string {
    const text = (response || '').trim();
    if (!text) return '';

    const match = text.match(/(?:^|\n)\s*3[\.．、]\s*最终建议[：:]\s*([\s\S]*)$/);
    if (match && match[1] && match[1].trim()) {
        return match[1].trim();
    }

    // 兜底：若模型未严格按格式输出，则保留全文，避免丢失建议
    return text;
}

/** 构建3号审稿员输入：显式附带1号审稿员结果，供3号基于1号意见继续给建议 */
export function buildCritic3UserInput(
    draftContent: string,
    prevContent: string,
    currContext: string,
    critic1Pass: boolean,
    critic1Reason?: string,
    attension?: string
): string {
    const parts: string[] = [];
    if (prevContent?.trim()) {
        parts.push(`【章节背景】\n${prevContent}`);
    }
    if (currContext?.trim()) {
        parts.push(`【本章待写内容】\n${currContext}`);
    }
    if (attension?.trim()) {
        parts.push(`【注意事项】\n${attension}`);
    }
    parts.push(`【待审稿内容】\n${draftContent || ''}`);
    parts.push(
        `【1号审稿员结论与意见】\n结论：${critic1Pass ? 'PASS' : 'FAIL'}\n意见：${critic1Reason?.trim() || (critic1Pass ? '1号审稿通过，无需强制修改项。' : '1号未提供具体意见')}`
    );
    return parts.join('\n\n');
}

/** 2号审稿员系统提示：仅判断是否误解任务（按待写内容续写 vs 在待写内容之后续写），不评论其他问题 */
export const CRITIC2_SYSTEM_PROMPT = `你是一名任务理解检查员，只做一件事：判断生成模型是否误解了续写任务。

**正确理解**：按【本章待写内容】续写 —— 本段输出应**充分呈现、展开**待写内容中的情节要点，即把待写内容里描述的场景/事件写成正文，且各要点得到应有的篇幅与重心。

**错误理解（任一种即判为 MISUNDERSTANDING）**：
- 在待写内容之后续写：模型把待写内容当作已发生或将在别处发生的事，本段输出写的是待写内容**之后**的情节（例如用「后来」「紧接着」「之后」「随后」等跳过待写内容本身，直接写后续发展）。
- 节选待写内容、重心在脑补部分：仅节选部分待写内容一带而过或轻描淡写，而把主要篇幅和重心放在模型自己脑补的后续情节上，待写内容中的要点未得到充分展开。

请根据【章节背景】【本章待写内容】和【待审稿内容】判断：待审稿内容是否充分展开了待写内容中的要点，还是存在上述误解？

**输出格式（必须严格遵循，仅输出以下之一，不要解释）**：
- 若待审稿内容正确呈现了待写内容中的情节，输出：OK
- 若待审稿内容明显跳过待写内容、写的是之后发生的事，输出：MISUNDERSTANDING`;

/** 解析2号审稿员输出：OK 或 MISUNDERSTANDING */
export function parseCritic2Response(response: string): { misunderstood: boolean } {
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

const MODIFIER_TRIGGER_PHRASES = ["顿了顿", "重新看向", "目光重新落在", "转向他","转向她", "转头看向他","转头看向她","声音不大"];

export function shouldRunModifierFromCritic1Reason(reason?: string): boolean {
    const text = (reason || "").trim();
    if (!text) return false;
    return MODIFIER_TRIGGER_PHRASES.some(p => text.includes(p));
}

/** 修改员：用 SiliconFlow 的 Qwen 对常见套话做粗调删除（仅删目标套话，尽量不改其他内容） */
export async function runSiliconFlowModifierRemoveCliches(draft: string): Promise<string> {
    const input = (draft || "").trim();
    if (!input) return "";

    const model = createSiliconFlowModel({
        model: "Qwen/Qwen3.5-35B-A3B",
        temperature: 0.2,
    });

    const system = `你是一名“粗调修改员”，只做一件事：从用户提供的小说正文中**直接删除**指定的无信息套话、意象，不重写剧情、不增删信息点、不改动人称时态，不做润色。

必须删除（命中即删，连同紧邻的无意义连接词/标点也要顺手整理，但不要重写句子）：
- 「顿了顿」及其近似表述（如「顿了顿道/顿了顿说」仅删除“顿了顿”部分）
- 「重新看向」及其近似表述
- 「目光重新落在某人身上」及同义变体
- 「目光锐利如刀」及同义变体
- 「转向某人」及其近似表述
- 「转头看向他/她」及同义变体
- 「声音不大，但……」及同义变体
- 「虚拟形象」
- 「剑柄」
- 「刀柄」
- 「无意识的/地」
- 「精准的/地」
- 「冰冷的/地」
- 「猛的/地」
- 「死死的/地」
- 「空气凝固」及同义变体
- 「陷入沉默」及同义变体
- 「身体前倾」及同义变体
- 「声音压低」「声音沙哑」及同义变体
- 「咬了咬下唇」及同义变体

必须修改（命中即改，连同紧邻的无意义连接词/标点也要顺手整理，但不要重写句子）：
- 「开口」改为「说」，如果「开口」前面有形容词，删除形容词


输出要求：
- 只输出修改后的全文，不要解释，不要列清单，不要加前缀。`;

    const user = `待处理正文（仅删除上述套话，其余保持不变）：\n\n${input}`;

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", system],
        ["user", user],
    ]);
    const chain = RunnableSequence.from([prompt, model]);
    const resp: any = await chain.invoke({});
    const out = (resp?.content as string) || "";
    return out.trim() || input;
}

/** 构建重写时的用户输入：在原有续写任务基础上，由专门的改写写手在糟糕底稿上重写 */
export function buildRewriteUserInput(
    prevContent: string,
    currContext: string,
    criticReason: string,
    rejectedDraft: string
): string {
    const base = buildUserInput(prevContent, currContext);
    return `${base}

【改写角色：在糟糕底稿上重写】
你现在扮演一名**改写写手**。可以把下面这一稿视为「**糟糕但基本反映章节内容的稿件**」：剧情走向大致符合【本章待写内容】，但写法、节奏、细节和用词存在大量问题。

【上一稿（糟糕但内容大致正确的底稿）】
---
${rejectedDraft}
---

【审稿员意见】
以下是与你协作的**审稿员**给出的批注，请把他当作严厉但和你站在同一战线的编辑：他负责挑错，你负责落实改写。
${criticReason}

请按如下要求改写本章续写内容：
1. 以【审稿员意见】为硬标准：凡被点名的问题，必须在改写稿中彻底消失或被实质性修正，不允许仅作表面改动或换皮保留。
2. 在不违背【章节背景】与【本章待写内容】前提下，可以重写句子、段落乃至局部结构，但**不得改变已确立的剧情走向、人物动机和关键信息**。
3. 输出的是**改写后的完整续写正文**，不要只写修改说明，也不要重复审稿意见，更不要混入对上一稿的评论。
4. 默认延续上一稿中尚可保留的剧情选择，只对被审稿员点名的问题区域做大刀阔斧重写；如确实需要微调剧情以彻底消除问题，也必须保持与【本章待写内容】一致。`;
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

/** 写作模型专用采样参数：提高 temperature、大幅降低 Frequency Penalty、大幅提高 Presence Penalty 与 Top_P，以增加多样性与表达丰富度 */
const WRITER_SAMPLING = {
    temperature: 1.2,
    frequencyPenalty: 0,
    presencePenalty: 1.8,
    topP: 1,
};

// 调用 LLM
export async function callLLM(
    llmType: string,
    systemPrompt: string,
    userInput: string,
    context: string,
    options?: { forWriting?: boolean }
): Promise<string> {
    const systemPromptWithContext = systemPrompt.replace('{{context}}', context);
    const effectiveType = llmType || 'gemini';
    const isWriter = options?.forWriting === true;
    const temp = isWriter ? WRITER_SAMPLING.temperature : 0.9;
    const freqPenalty = isWriter ? WRITER_SAMPLING.frequencyPenalty : undefined;
    const presPenalty = isWriter ? WRITER_SAMPLING.presencePenalty : undefined;
    const topP = isWriter ? WRITER_SAMPLING.topP : undefined;

    // 根据 llmType 选择模型
    if (effectiveType === 'deepseek') {
        console.debug('[genChapter] callLLM using deepseek-reasoner', { forWriting: isWriter });
        const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
        if (!DEEPSEEK_API_KEY) {
            throw new Error('DEEPSEEK_API_KEY is not configured');
        }

        const model = new ChatDeepSeek({
            apiKey: DEEPSEEK_API_KEY,
            model: "deepseek-reasoner",
            temperature: temp,
            ...(freqPenalty !== undefined && { frequencyPenalty: freqPenalty }),
            ...(presPenalty !== undefined && { presencePenalty: presPenalty }),
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
        console.debug('[genChapter] callLLM using deepseek-chat', { forWriting: isWriter });
        const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
        if (!DEEPSEEK_API_KEY) {
            throw new Error('DEEPSEEK_API_KEY is not configured');
        }

        const model = new ChatDeepSeek({
            apiKey: DEEPSEEK_API_KEY,
            model: "deepseek-chat",
            temperature: temp,
            ...(freqPenalty !== undefined && { frequencyPenalty: freqPenalty }),
            ...(presPenalty !== undefined && { presencePenalty: presPenalty }),
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
        console.debug('[genChapter] callLLM using OpenRouter', { modelName, forWriting: isWriter });

        const model = new ChatOpenAI({
            model: modelName,
            temperature: temp,
            ...(freqPenalty !== undefined && { frequencyPenalty: freqPenalty }),
            ...(presPenalty !== undefined && { presencePenalty: presPenalty }),
            ...(topP !== undefined && { topP }),
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
        draft_llm_type = '',
        polish_llm_type = '',
        extra_settings = '', // 兼容调用代码，但不处理（已移除功能）
        critic_max_rounds, // 可选参数：审稿最多重写次数
    } = inputs as any;

    // 使用 attension 或 attention（优先使用 attension，向后兼容）
    const attensionText = attension || attention;

    const draftLlmType = draft_llm_type || llm_type || 'deepseek';
    const polishLlmType = polish_llm_type || llm_type || draftLlmType;

    console.debug('[genChapter] inputs', {
        worldviewId,
        prev_content_len: prev_content?.length ?? 0,
        curr_context_len: curr_context?.length ?? 0,
        role_names: role_names || '(empty)',
        faction_names: faction_names || '(empty)',
        geo_names: geo_names || '(empty)',
        llm_type: llm_type || '(empty)',
        draft_llm_type: draftLlmType,
        polish_llm_type: polishLlmType,
        has_attension: !!attensionText,
        critic_max_rounds: critic_max_rounds ?? '(default 5)',
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

        // 5. 构建提示词（含文风对抗选项，与分段续写/流式初稿一致）
        const systemPrompt = appendAntiStyleConfrontationBlocks(
            buildPromptTemplate(attensionText),
            antiStyleFlagsFromRequestBody(inputs as Record<string, unknown>)
        );
        const userInput = buildUserInput(prev_content, curr_context);
        console.debug('[genChapter] userInput length', userInput.length);

        // 6. 调用 LLM（作者生成初稿）
        const maxRewrites = Math.max(1, Math.min(10, Number(critic_max_rounds) || 5));
        console.debug('[genChapter] callLLM', { draftLlmType, polishLlmType });
        let llmStart = Date.now();
        let output = await callLLM(draftLlmType, systemPrompt, userInput, context, { forWriting: true });
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
            polishLlmType,
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

            // 1号审稿员：致命问题把关
            llmStart = Date.now();
            const criticResponse = await callLLM(
                polishLlmType,
                CRITIC_SYSTEM_PROMPT,
                criticInput,
                context // 审稿员获取世界观，以便更好判断违规项（如通用语、设定一致性等）
            );
            const criticMs = Date.now() - llmStart;
            console.debug('[genChapter] critic done', { ms: criticMs, rawResponse: criticResponse?.trim().slice(0, 500) });
            const criticResult = parseCriticResponse(criticResponse);

            // 3号审稿员：全文展开度 + 细节一致性（只给建议）
            const critic3Input = buildCritic3UserInput(
                output,
                prev_content,
                curr_context,
                criticResult.pass,
                criticResult.reason
            );
            llmStart = Date.now();
            const critic3Response = await callLLM(
                polishLlmType,
                CRITIC3_SYSTEM_PROMPT,
                critic3Input,
                context
            );
            const critic3Ms = Date.now() - llmStart;
            console.debug('[genChapter] critic3 done', { ms: critic3Ms, rawResponse: critic3Response?.trim().slice(0, 500) });
            const critic3Result = parseCriticResponse(critic3Response);
            const critic3Advice = extractCritic3FinalSuggestion(critic3Response || '');

            const bothPass = criticResult.pass && critic3Result.pass;
            if (bothPass) {
                console.debug('[genChapter] critic PASS', { rewriteCount, critic1: 'PASS', critic3: 'PASS' });
                break;
            }

            const mergedCriticReason = [
                criticResult.pass ? '' : `【1号审稿员意见】\n${criticResult.reason || '1号审稿未通过，未给出具体原因'}`,
                critic3Result.pass ? '' : `【3号审稿员意见】\n${critic3Result.reason || '3号审稿未通过，未给出具体原因'}`,
                critic3Advice ? `【3号审稿员最终建议（追加在1号之后，仅保留最终建议）】\n${critic3Advice}` : '',
            ].filter(Boolean).join('\n\n');

            rewriteCount++;
            console.debug('[genChapter] critic FAIL, rewriting', {
                rewriteCount,
                reason: mergedCriticReason,
                critic1Raw: criticResponse?.trim(),
                critic3Raw: critic3Response?.trim()
            });

            // 若1号意见命中“无信息套话”关键词，先启用修改员粗调删除，再进入下一轮改写
            if (shouldRunModifierFromCritic1Reason(criticResult.reason)) {
                console.debug('[genChapter] modifier triggered');
                try {
                    const beforeLen = output?.length ?? 0;
                    const tuned = await runSiliconFlowModifierRemoveCliches(output || "");
                    const afterLen = tuned?.length ?? 0;
                    console.debug('[genChapter] modifier tuned draft --- force delete bad filler', { beforeLen, afterLen });

                    output = tuned || output;
                } catch (e: any) {
                    console.warn('[genChapter] modifier failed, continue without modifier', e?.message || e);
                }
            }

            const rewriteUserInput = buildRewriteUserInput(prev_content, curr_context, mergedCriticReason, output);
            llmStart = Date.now();
            output = await callLLM(polishLlmType, systemPrompt, rewriteUserInput, context, { forWriting: true });
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
