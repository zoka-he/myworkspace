import { NextApiRequest, NextApiResponse } from "next";
import {
  getAggregatedContext,
  buildPromptTemplate,
  parseCriticResponse,
  callLLM,
} from "./genChapter";
import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

const LOG_TAG = "[genChapterSegmentMultiTurn]";
const SNIPPET_MAX_CHARS = 800;

/** 多轮续写专用审稿员提示：适配 chat 模型文学性，通用语/加密表述放宽，合成音指代严谨，并增加双重否定句式修正 */
const CRITIC_SYSTEM_PROMPT_SEGMENT = `你是一名**分段**审稿员：你审的是「当前这一段」的正文，不是整章。你收到的【本段提纲】仅描述**本段**应写的内容要点，与「整章提纲」「章节总体待写内容」无关；请勿把本段提纲当成整章内容，也勿用整章标准来要求本段。审稿时只判断：待审稿内容（本段正文）是否紧扣【本段提纲】、是否在本段内写足、以及是否存在下列致命问题。

专门检测以下**致命问题**（任一项出现即判为不通过）：

1. **虚空特殊指代**：出现「某种」「特有的」「独有的」等指代词，但指代对象不具备特殊性。
2. **提前解释或剧透**：在情节尚未展开前就提前解释结局、真相或关键转折；把本该在后文揭晓的信息在本段说破。
3. **概括式剧透**：用概括性语句代替具体情节（例如「后来他们经历了种种终于……」），导致本该在本段呈现的情节被一笔带过或剧透。
4. **滥用网络安全表述**：严禁在小说叙事中**明显出现**「加密通讯」「加密标识」「VPN」「端到端加密」「安全信道」「加密链路」等一切网络安全/加密通信技术用语。出现此类表述一律判为不通过；若确需涉及通信保密，应使用隐晦和一语双关的表达技巧，或让角色安排真人交流，或通过动作和场景描写，不得使用加密术语。**不误伤**：非加密表述，不得因此判不通过，仅当设计“加密”等词语时，才判不通过。
5. **「通用语」字眼**：仅当正文**明显出现**以下字眼时判不通过：「通用语」「大陆通用语」「世界通用语」「各族通用语」「全境通用语」「通行语」「共同语」「标准语」（指全境唯一语言时）等直接表述。不禁止「用一种语言」「双方都懂的话」等隐晦说法；但若涉及多语言/跨族交流场景，可在原因中提醒作者：需考虑翻译或可懂性，避免读者困惑。
6. **高频套路用语**：严禁使用网文常见套路句，出现即判不通过。典型包括但不限于：「巨石投入水中」「像一块巨石投入水中」「声音不大」「字字清晰」「不容置疑」「恰到好处」「不易察觉」「微微一笑」「深吸一口气」「无意识地」「下意识地」「变故陡生」「张了张嘴，没发出声音」「身体前倾」「每个字都」「斟酌」「缓缓开口」「空气凝固」等。审稿时若发现此类表述，须在原因中明确列出并建议删掉或更换为更具体、贴切情境的表达方式。
7. **合成音类模因（严谨，不误伤视觉单位）**：仅当**声音/语音**被明确描述为合成、机械、电子、AI 时判不通过。必检表述（仅针对**听觉/语音**）：「合成音」「机械音」「电子音」「AI 语音」「合成语音」「机械合成的声音」「电子合成声」「冰冷的机械声」「毫无感情的电子音」等。**不误伤**：表情包、贴纸、弹幕、字幕、屏幕文字、界面图标、视觉符号等**视觉单位**的描写不属于「合成音」范畴，不得因此判不通过；若正文写的是画面/屏幕上的文字或图形，一律不按合成音处理。
8. **双重否定与「不是……而是……」句式**：正文中出现的「不是……而是……」「并非……而是……」「不是……而是……」「与其说……不如说……」等双重否定或对比否定句式，要求改为平直、肯定的表述。审稿时若发现此类句式，须在原因中列出并建议改为直接陈述，避免绕弯。
9. **连续枚举角色反应**：不得连续逐人枚举角色的反应；当超过 2 名角色做出反应时，应改为盖然性的指代（如「众人」「在场者」「其中几人」等概括性表述），避免「A 如何、B 如何、C 如何」式的机械罗列。
10. **叙述者解释剧情/动机/因果**：正文中不得用叙述者口吻或旁白直接解释剧情、动机、因果或「为什么会这样」。若出现「原来……」「这意味着……」「事实上……」「因为……所以……」「他这样做的原因是……」等解释性句子，或替读者总结本段/前文发生了什么事，判为不通过。情节应通过行动、对话和细节展现（展示而非告知），不得用说明性语句替代。
11. **本段写得少、却大量写后续情节**：本段正文必须紧扣【本段提纲】展开，本段提纲中的要点应在本段内得到充分呈现。若本段正文明显偏短，或大量篇幅在写「之后」「后来」「紧接着」「随后」「接下来」等后续才发生的情节，而本段提纲要点仅被一笔带过或未充分展开，判为不通过。审稿时须对比【本段提纲】与待审稿内容：本段该写的场景、对话、冲突等是否在本段内写足，而非跳过本段、提前写后文。
12. **演讲腔/军事腔/总结性台词**：角色台词应生动、自然、贴合情境与人物性格。若对白出现以下情况判为不通过：**演讲强调**（像在台上发言、喊口号、宣言式表述）；**军事腔调**（刻板的命令式、汇报式、队列用语如「是！」「明白！」「保证完成任务」等，除非设定确为军事场景且符合身份；同时要重点留意缺少「我/你/我们」等主语指代、只剩下命令或汇报内容的句子，如「立刻执行」「收到」「按之前方案推进」这类简短口令式对白）；**总结性/口号式台词**（用一句对白替作者总结主题、点题、升华，或空洞的动员、宣誓式语句）。对于整段对话普遍存在主语缺失、来回只用「好/行/明白/收到」等机械应答、语气僵硬而缺乏具体情绪和细节的情况，也应按「军事腔/口号式对白」处理，判为不通过。审稿时若发现此类对白，须在原因中列出并建议改为更生活化、具体、有冲突感的对话，并鼓励使用自然的主语指代（如「我/你/我们/他们」）和更贴近日常说话的句式。
13. **匕首抛光综合征**：该项需要极其敏感，绝对禁止出现“擦拭匕首/刀/剑”（这意味着严重挑衅的剧情）、“握着剑柄”（这意味着要写打斗了）、“推了推不存在的眼镜”（这不合逻辑）、“整理衣服”（大部分情况不合逻辑）、“沉默片刻”（无意义）、“看向火堆”（无意义）这几个模因时或类似的变体，直接判不通过，必须要求删除，没有改写余地。此外，无打斗场景，严格禁止「剑柄」这个意象，如果出现，直接判不通过，要求重写，没有改写余地。
14. **AI 式翻译腔（生硬英式叙述套话）**：禁止明显不符合中文习惯、由英文叙述套路直译而来的表述。**必检**：如「开口道」「缓缓开口」「顿了顿道」「沉默了片刻道」「他开口说」「她缓缓说道」等——中文自然表达多用「说」「道」「问」「答」直接引出对话，或「他/她+动词」简洁带过，无需「开口」「缓缓开口」这类英式「opened his mouth」「said slowly」的套话。同类还包括「点了点头」「摇了摇头」过度堆砌、「他/她顿了顿」「重新看向」「转向某人」「打破死寂」「目光锐利」等无信息量 filler。**不误伤**：经典文学译本的翻译腔、适度欧化句式、以及「他沉吟道」「他低声道」等已融入中文的常见写法，不判不通过；仅对明显生硬、AI 常见的英式叙述套话（上述「开口道」「缓缓开口」等）判不通过。审稿时须在原因中列出具体句例并建议改为更自然的中文说法。
15. **语境要求阴阳怪气/拌嘴却写得平淡**：当【本段提纲】、【前序章节摘要】或世界观设定中，明确或隐含要求「阴阳怪气」「嘴上不饶人」「互相挤兑」「拌嘴/吵架」「针锋相对」「暗中较劲」「火药味」等风格（例如：本段是争吵、互相损、冷嘲热讽、暗中斗嘴的场景），而【待审稿内容】中的对话却整体语气温和、礼貌、缺乏情绪张力，只是礼貌性交换信息或轻描淡写几句、几乎没有刺痛感和情绪波动，则判为不通过。审稿时需要：1）在原因中明确指出「提纲要求的是带火药味/阴阳怪气/互相挤兑的对话，但正文语气过于平，缺乏情绪冲突」；2）建议作者增加具体的反讽、抬杠、夹枪带棒、冷嘲热讽等带情绪和立场的台词，以及相应的小动作、神态与节奏变化，让对话真正体现出拌嘴/吵架的味道，而不是公事公办地互通信息。

请**仅根据【本段提纲】与【待审稿内容】**判断（【本段提纲】= 本段应写要点，【待审稿内容】= 本段正文）；【前序章节摘要】与【相关设定】仅作背景参考，勿将本段提纲与整章内容混淆。

<相关设定>
{{context}}
</相关设定>

**输出格式（必须严格遵循）**：
- 若**无**上述致命问题，仅输出一行：PASS
- 若**有**问题，第一行输出：FAIL，第二行起写：原因：<具体指出问题所在及修改建议>`;

export interface GenChapterSegmentMultiTurnInput {
  worldview_id: number;
  curr_context: string;
  prev_content?: string; // 前序章节缩写后的内容
  role_group_names?: string;
  role_names?: string;
  faction_names?: string;
  geo_names?: string;
  attention?: string;
  attension?: string;
  llm_type?: string;
  segment_outline: string;
  segment_index: number;
  previous_content_snippet: string;
  segment_target_chars?: number;
  mcp_context?: string;
  conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  is_first_turn?: boolean; // 是否为第一轮（需要确认）
  /** 抗克苏鲁文风：避免野兽比喻、腐败/腐化等常见模型偏向 */
  anti_lovecraft_style?: boolean;
  /** 抗甜宠/霸总文风：避免生理反应公式化、霸总标配描写 */
  anti_sweet_ceo_style?: boolean;
  /**
   * 抗空泛协议/中二命名（模因污染对抗）：
   * 现象：星际+商务+角色写作时，模型会生成大量「不在设定内的协议/条约/协定名称」，
   * 而设定中真正的协议未被遵从。模因来源：训练数据里科幻/商战/政斗常用「命名型协议」作剧情道具，
   * 模型学到「提协议名=有专业感」，且中二/轻小说风格强化「造酷名字」倾向；
   * 本质是设定漂移+空泛专有名词堆砌。对抗：仅用设定/前情/提纲中已出现的协议与规则名，禁止自创。
   */
  anti_fake_protocol_style?: boolean;
  /** 抗加密表述：遏制「加密信道」「加密线路」「加密频段」等高频套路表述 */
  anti_encrypted_channel_style?: boolean;
  /** 反废土文风：避免荒芜/废墟/辐射/末世等刻板废土描写，除非设定确为废土 */
  anti_wasteland_style?: boolean;
  /** 反逐人枚举：多人场景优先概括集体行为，避免逐人枚举反应 */
  anti_enum_reactions_style?: boolean;
  /** 抗套路样板词：避免恰到好处、不易察觉、微微一笑、深吸一口气等网文套路词 */
  anti_cliche_phrase_style?: boolean;
  /** 抗剧情解释：禁止在正文中用旁白或叙述者口吻解释剧情、动机、因果，默认开启 */
  anti_plot_explanation?: boolean;
  /** 抗演讲腔/军事腔/总结性台词：避免角色对白像演讲、命令式或口号式，要求生动自然，默认开启 */
  anti_speech_military_summary_style?: boolean;
  /** 是否启用审稿员（多轮文风纠正），默认关闭 */
  enable_critic?: boolean;
  /** 审稿员最多审核次数，默认 5 */
  critic_max_rounds?: number;
}

interface Data {
  data?: {
    outputs?: { output?: string };
    status?: string;
    error?: string;
    elapsed_time?: number;
    conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  };
}

function createModel(llmType: string): any {
  const effectiveType = (llmType || "deepseek-chat").toLowerCase();
  
  if (effectiveType === "deepseek" || effectiveType === "deepseek-reasoner") {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) throw new Error("DEEPSEEK_API_KEY is not configured");
    return new ChatDeepSeek({ apiKey: key, model: "deepseek-reasoner", temperature: 0.9 });
  }
  
  if (effectiveType === "deepseek-chat") {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) throw new Error("DEEPSEEK_API_KEY is not configured");
    return new ChatDeepSeek({ apiKey: key, model: "deepseek-chat", temperature: 0.9 });
  }
  
  // Gemini
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");
  const modelName = effectiveType === "gemini3" || effectiveType?.includes("gemini3")
    ? "google/gemini-2.0-flash-exp:free"
    : "google/gemini-2.5-pro";
  return new ChatOpenAI({
    model: modelName,
    temperature: 0.9,
    configuration: { apiKey: OPENROUTER_API_KEY, baseURL: "https://openrouter.ai/api/v1" },
  });
}

function buildSystemPrompt(
  attensionText: string,
  segmentIndex: number,
  targetChars: number,
  antiLovecraftStyle: boolean,
  antiSweetCeoStyle: boolean,
  antiFakeProtocolStyle: boolean,
  antiEncryptedChannelStyle: boolean,
  antiWastelandStyle: boolean,
  antiEnumReactionsStyle: boolean,
  antiClichePhraseStyle: boolean,
  antiPlotExplanation: boolean,
  antiSpeechMilitarySummaryStyle: boolean
): string {
  const basePrompt = buildPromptTemplate(attensionText);
  const segmentExtra = `
本段为第 ${segmentIndex} 段。严格接着上一段最后一句续写，保持人称、时态、风格一致。本段约 ${targetChars} 字。仅输出本段正文，不要重复前文。
不得在本段开头再次交代世界观、时代背景或故事前提；直接接着「已写内容末尾」的情境继续写。

**防止回读前半情节（极其重要）**：
- **绝对不要回顾前面段落**：前面已经写过的内容不要在本段中回顾、呼应、总结、提及或引用。
- **只关注当前段落**：严格按照「本段提纲要点」写作，这是唯一的目标。
- **只衔接末尾**：唯一需要衔接的是「已写内容末尾」的最后一句，不要回顾更早的内容。

**严禁简略对话（极其重要）**：
- 所有对话必须完整写出，使用直接引语（「」或""），不得使用间接引语（如「他说」「她问」）替代。
- 不得省略对话内容，不得用概括性描述代替具体对话。
- 对话应保持完整、自然、符合人物性格，不得为了节省字数而简略对话。`;
  const antiLovecraftBlock = antiLovecraftStyle
    ? `

**抗克苏鲁/魔兽文风（避免常见模型偏向）**：
- 不要滥用「野兽」「兽性」「野兽般的」等比喻；除非剧情明确需要，否则用更贴合当前世界观与语境的描写。
- 不要随意使用「腐败」「腐化」「腐朽」「堕落」等词；仅在本章/本作设定确实涉及该主题时才使用。
- 避免无意识的克苏鲁、魔兽（WOW）式阴暗诡异文风；按本章提纲与整体风格写作，不要堆砌上述套路。`
    : "";
  const antiSweetCeoBlock = antiSweetCeoStyle
    ? `

**抗甜宠/霸总文风（避免公式化描写）**：
- **生理反应不要公式化**：脸不要总是「一红」、心不要总是「漏跳一拍」、嘴唇不要总是「咬住」、手指不要总是「蜷缩」；根据具体情境与人物性格选用多样、贴切的生理与动作描写，避免千篇一律。
- **避免霸总标配堆砌**：男性角色不要总是「薄唇」「冷峻」「眼底划过一丝暗芒」等刻板描写；人物外貌与神态应贴合本章设定与世界观，避免甜宠/霸总网文套路化表达。`
    : "";
  const antiFakeProtocolBlock = antiFakeProtocolStyle
    ? `

**抗空泛协议/中二命名（严格遵从设定中的协议与规则）**：
- **禁止自创协议/条约/协定名称**：不得编造「XX协议」「XX条约」「XX协定」「XX公约」等专有名词，除非该名称在前情、本章提纲或世界观设定中已明确出现。模型常因训练数据中科幻/商战/政斗的「命名型协议」套路而自动生成听起来专业、实则空泛的名称，此处必须禁止。
- **仅使用设定内已有名称**：若情节涉及规则、条约、商务条款，只引用前文或设定里写明的具体名称与内容；若设定中未给出名称，用具体行为与事实描写代替（例如「按双方约定……」「根据此前达成的……」），不要临时造一个「德尔塔协议」「第三象限贸易协定」类名称。
- **设定中的协议必须被遵从**：若世界观或本章要点里已写明某协议、某规则，写作时必须体现角色在遵守或违反该规则，而不是忽略设定、另造一套空洞的「协议名」来填充氛围。`
    : "";
  const antiEncryptedChannelBlock = antiEncryptedChannelStyle
    ? `

**抗加密表述（禁止套路化通讯/安全用语）**：
- **禁止使用**以下及同类表述：「加密信道」「加密线路」「加密频段」「加密通讯」「加密连接」「专用线路」「保密频道」「安全链路」。不得用上述空泛用语堆砌氛围；若需写通讯或技术细节，请用具体动作、场景与结果描写，或根据世界观自拟贴切说法，避免千篇一律的套路词。`
    : "";
  const antiWastelandBlock = antiWastelandStyle
    ? `

**反废土文风（仅在本作/本章明确为废土/末世设定时才使用废土语汇）**：
- 不要无意识带入废土、末世感：若前情与提纲未明确设定为废土/末世/后末日世界，禁止堆砌「荒芜」「废墟」「残垣断壁」「破败」「锈蚀」「辐射」「变异」「末世」「废土」「灰蒙蒙」「昏黄」「尘埃漫天」等刻板废土描写；避免「拾荒者」「幸存者」「避难所」等作为泛用氛围词滥用。
- 若本作确为废土题材，也请按本章提纲与具体场景写作，用具体细节替代套路词堆砌，避免千篇一律的废土感。`
    : "";
  const antiEnumReactionsBlock = antiEnumReactionsStyle
    ? `

**反逐人枚举（多人场景优先概括集体行为）**：
- **不要逐人枚举反应**：多人同时在场时，禁止按「甲愣了一下，乙皱起眉，丙点头……」依次写每个人的神态或动作；除非本段提纲明确要求写出每个人不同的反应，否则不要逐人罗列。
- **优先概括集体**：用「众人」「大家」「在场的人」「一片哗然」「纷纷……」或写一两位关键人物再以「其余人/人群」概括，表现整体氛围即可。
- **确需区分时**：若情节需要对比少数几人态度，只写这几人，避免对在场所有人逐一遍历。`
    : "";
  const antiClichePhraseBlock = antiClichePhraseStyle
    ? `

**抗套路样板词（避免公式化神态与评价）**：
- **禁止滥用下列及同类表述**：「恰到好处」「不易察觉」「微微一笑」「深吸一口气」，以及「会心一笑」「轻叹一声」「不动声色」等网文高频套路词。不要用上述空泛用语堆砌氛围。
- **评价要具体**：若需写「刚好、合适」，用具体情境与结果描写代替「恰到好处」。
- **神态与动作要多样**：笑、呼吸、叹息等描写请根据人物与情境选用具体、贴切的写法，避免千篇一律的「微微一笑」「深吸一口气」。`
    : "";
  const antiPlotExplanationBlock = antiPlotExplanation
    ? `

**抗剧情解释（禁止在正文中解释剧情）**：
- **禁止用叙述者口吻或旁白解释剧情、动机、因果**：不要写「原来……」「这意味着……」「事实上……」等解释性句子；只呈现具体情节、对话与描写，让读者通过情节自己感受。
- **不要替读者总结**：不要在本段中概括或总结本段/前文发生了什么事；情节通过行动、对话和细节展现，不要用说明性语句替代。
- **展示而非告知**：动机、因果、真相应通过角色行为与情节推进自然呈现，不得用旁白直接说明「因为……所以……」「他这样做的原因是……」等。`
    : "";
  const antiSpeechMilitarySummaryBlock = antiSpeechMilitarySummaryStyle
    ? `

**抗演讲腔/军事腔/总结性台词（对白应生动自然）**：
- **禁止演讲强调**：角色对白不要像在台上发言、喊口号或宣言式表述；日常对话应口语化、有来有回、贴合情境，避免「我们一定要……」「让我们……」等动员式、宣誓式语句。
- **禁止刻板军事腔**：除非设定确为军事场景且符合身份，否则不要写刻板的命令式、汇报式对白（如「是！」「明白！」「保证完成任务」），也不要整段对话都由「收到」「遵命」「按之前方案执行」这类简短口令式句子构成；对白应像真人说话，有具体主语（如「我/你/我们」）、自然的口气和情绪。
- **禁止总结性/口号式台词**：不要用一句对白替作者总结主题、点题或升华；避免空洞的总结句、金句式台词。对白应推动情节或体现人物，而非替叙述者归纳。
- **避免无主语、机械式来回**：连续多句对话如果普遍缺少「我/你/我们」等主语，只剩下命令、汇报或单字应答（如「好」「行」「明白」「是」）交替出现，语气生硬、缺乏生活感，应视为军事腔或口号化对白，必须改写为带有自然主语指代、具体内容和情绪细节的日常说话方式。`
    : "";
  return basePrompt + segmentExtra + antiLovecraftBlock + antiSweetCeoBlock + antiFakeProtocolBlock + antiEncryptedChannelBlock + antiWastelandBlock + antiEnumReactionsBlock + antiClichePhraseBlock + antiPlotExplanationBlock + antiSpeechMilitarySummaryBlock;
}

function buildUserInputForSegment(
  segmentOutline: string,
  previousSnippet: string,
  targetChars: number,
  prevContent?: string
): string {
  const parts: string[] = [];
  // 每段都带前情提要，便于中间重启续写时模型仍有前文背景
  if (prevContent && prevContent.trim()) {
    parts.push(`【前情提要（前序章节缩写，仅作背景参考）】\n${prevContent.trim()}`);
  }
  parts.push(`【本段提纲要点（必须严格遵循，这是当前段落的唯一写作目标）】\n${segmentOutline.trim()}`);
  parts.push(`【已写内容末尾（必须严格衔接，这是续写的起点）】\n${(previousSnippet || "").trim() || "（本段为第一段，无前文）"}`);
  parts.push(`请严格接着「已写内容末尾」续写本段，约 ${targetChars} 字；仅输出本段正文，不要重复前文。`);
  return parts.join("\n\n");
}

/** 构建带审稿意见的重写用户输入（仅用于审稿不通过时的多轮修正，不写入 conversation_history） */
function buildRewriteUserInputForSegment(
  segmentOutline: string,
  previousSnippet: string,
  targetChars: number,
  prevContent: string | undefined,
  criticReason: string,
  rejectedDraft: string
): string {
  const base = buildUserInputForSegment(segmentOutline, previousSnippet, targetChars, prevContent);
  return `${base}

【重要：这是修改任务，不是重新续写】
你上一稿的正文如下：
---
${rejectedDraft}
---

审稿员指出上一稿存在以下问题，请**针对上述正文**按审稿意见修改，然后直接输出**整段修正后的正文**（与上一稿等长的完整段落）。要求：
1. 必须根据审稿意见逐项修正，不要忽略或回避。
2. 输出的是修改后的**完整本段正文**，不要只写修改说明、不要重复审稿意见、不要只输出改动部分。
3. 保持情节、人称、风格与上下文一致，仅对有问题的表述进行替换或删除。
4. 若审稿意见要求删除某些内容（句子、段落、意象、设定等），无论你主观上觉得是否合理，都必须完全服从审稿员，按要求删去相关内容，不得保留、弱化或以变体形式继续保留。

【审稿意见】
${criticReason}`;
}

/** 分段审稿专用：构建审稿员用户输入，明确区分「本段提纲」与「章节内容」，避免审稿员混淆 */
function buildCriticUserInputForSegment(
  segmentDraft: string,
  prevContent: string,
  segmentOutline: string
): string {
  const parts: string[] = [];
  if (prevContent?.trim()) {
    parts.push(`【前序章节摘要】（仅作背景参考，审稿时以本段为准）\n${prevContent.trim()}`);
  }
  parts.push(`【本段提纲】（仅限本段应写的内容要点，非整章提纲；审稿请以此为准判断本段是否写足、是否跑题）\n${(segmentOutline || "").trim()}`);
  parts.push(`【待审稿内容】（本段正文，请判断是否存在致命问题）\n${segmentDraft || ""}`);
  return parts.join("\n\n");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST") {
    res.status(405).json({});
    return;
  }
  const startTime = Date.now();
  const worldviewId = req.query.worldviewId ? Number(req.query.worldviewId) : req.body?.worldview_id;
  if (!worldviewId || worldviewId < 1) {
    res.status(400).json({ data: { status: "error", error: "worldview_id 必填且为正整数" } });
    return;
  }
  
  const body = req.body as GenChapterSegmentMultiTurnInput;
  const {
    curr_context = "",
    prev_content = "",
    role_group_names = "",
    role_names = "",
    faction_names = "",
    geo_names = "",
    attention = "",
    attension = "",
    llm_type = "deepseek-chat",
    segment_outline = "",
    segment_index = 1,
    previous_content_snippet = "",
    segment_target_chars = 600,
    mcp_context = "",
    conversation_history = [],
    is_first_turn = false,
    anti_lovecraft_style = true,
    anti_sweet_ceo_style = true,
    anti_fake_protocol_style = false,
    anti_encrypted_channel_style = true,
    anti_wasteland_style = true,
    anti_enum_reactions_style = true,
    anti_cliche_phrase_style = true,
    anti_plot_explanation = true,
    anti_speech_military_summary_style = true,
    enable_critic = true, // 与前端默认一致；断点重写时也需审稿员
    critic_max_rounds = 5,
  } = body || {};

  const attensionText = attension || attention;
  const snippet = (previous_content_snippet || "").trim().slice(-SNIPPET_MAX_CHARS);
  const targetChars = segment_target_chars || 600;

  try {
    let context = (mcp_context && mcp_context.trim())
      ? mcp_context.trim()
      : await getAggregatedContext(worldviewId, role_group_names, role_names, faction_names, geo_names);
    // 仅在第一段加入本章总体要点，避免每段都带全章提纲导致模型回溯前文或提前写完后文
    if (segment_index === 1 && curr_context && curr_context.trim()) {
      context = context + "\n\n【本章待写内容（总体）】\n" + curr_context.trim();
    }
    
    const systemPrompt = buildSystemPrompt(attensionText, segment_index, targetChars, !!anti_lovecraft_style, !!anti_sweet_ceo_style, !!anti_fake_protocol_style, !!anti_encrypted_channel_style, !!anti_wasteland_style, !!anti_enum_reactions_style, !!anti_cliche_phrase_style, !!anti_plot_explanation, !!anti_speech_military_summary_style);
    const systemPromptWithContext = systemPrompt.replace('{{context}}', context);
    
    const model = createModel(llm_type);
    
    // 构建对话历史
    const messages: BaseMessage[] = [];
    
    if (is_first_turn) {
      // 第一轮：发送 system prompt + 确认消息
      messages.push(new SystemMessage(systemPromptWithContext));
      messages.push(new HumanMessage("请确认你已理解上述要求，回复「确认」即可。"));
    } else {
      // 后续轮次：先添加 system prompt（如果历史中没有）
      if (conversation_history.length === 0) {
        messages.push(new SystemMessage(systemPromptWithContext));
      } else {
        // 从历史中恢复消息
        for (const msg of conversation_history) {
          if (msg.role === 'user') {
            messages.push(new HumanMessage(msg.content));
          } else if (msg.role === 'assistant') {
            messages.push(new AIMessage(msg.content));
          }
        }
        // 确保 system prompt 在最前面
        if (messages.length === 0 || !(messages[0] instanceof SystemMessage)) {
          messages.unshift(new SystemMessage(systemPromptWithContext));
        }
      }
      
      // 添加当前段落的 user 输入（每段都带前情提要，中间重启时也不丢失）
      const userInput = buildUserInputForSegment(
        segment_outline, 
        snippet, 
        targetChars,
        prev_content
      );
      messages.push(new HumanMessage(userInput));
    }
    
    console.debug(LOG_TAG, "segment_index", segment_index, "is_first_turn", is_first_turn, "messages_count", messages.length);
    
    const prompt = ChatPromptTemplate.fromMessages(messages);
    const chain = RunnableSequence.from([prompt, model]);
    const response = await chain.invoke({});
    let output = (response.content as string) || "";

    // 非首轮且启用审稿员时：多轮续写专用审稿员纠正常见文风问题，仅保留终稿用于 history
    const effectiveLlmType = (llm_type || "deepseek-chat").toLowerCase();
    const maxRewrites = Math.max(1, Math.min(10, Number(critic_max_rounds) || 5));
    if (!is_first_turn && enable_critic && output.trim()) {
      for (let rewriteCount = 0; rewriteCount < maxRewrites; rewriteCount++) {
        const criticInput = buildCriticUserInputForSegment(output, prev_content || "", segment_outline);
        const criticResponse = await callLLM(
          effectiveLlmType,
          CRITIC_SYSTEM_PROMPT_SEGMENT,
          criticInput,
          context
        );
        const criticResult = parseCriticResponse(criticResponse);
        if (criticResult.pass) {
          console.debug(LOG_TAG, "critic PASS", { rewriteCount });
          break;
        }
        console.debug(LOG_TAG, "critic FAIL, rewriting", {
          rewriteCount: rewriteCount + 1,
          reason: criticResult.reason,
        });
        const rewriteUserInput = buildRewriteUserInputForSegment(
          segment_outline,
          snippet,
          targetChars,
          prev_content,
          criticResult.reason!,
          output
        );
        // 用同一轮内的重写请求再次调用写手，不把审稿/重写过程写入 conversation_history
        const rewriteMessages: BaseMessage[] = [];
        if (conversation_history.length === 0) {
          rewriteMessages.push(new SystemMessage(systemPromptWithContext));
        } else {
          for (const msg of conversation_history) {
            if (msg.role === "user") {
              rewriteMessages.push(new HumanMessage(msg.content));
            } else if (msg.role === "assistant") {
              rewriteMessages.push(new AIMessage(msg.content));
            }
          }
          if (
            rewriteMessages.length === 0 ||
            !(rewriteMessages[0] instanceof SystemMessage)
          ) {
            rewriteMessages.unshift(new SystemMessage(systemPromptWithContext));
          }
        }
        rewriteMessages.push(new HumanMessage(rewriteUserInput));
        const rewritePrompt = ChatPromptTemplate.fromMessages(rewriteMessages);
        const rewriteChain = RunnableSequence.from([rewritePrompt, model]);
        const rewriteResponse = await rewriteChain.invoke({});
        output = (rewriteResponse.content as string) || "";
      }
    }

    // 更新对话历史：只追加本轮用户输入 + 本轮终稿，不包含审稿过程
    const updatedHistory = [...conversation_history];
    if (is_first_turn) {
      updatedHistory.push({ role: 'user', content: "请确认你已理解上述要求，回复「确认」即可。" });
      updatedHistory.push({ role: 'assistant', content: output });
    } else {
      updatedHistory.push({ 
        role: 'user', 
        content: buildUserInputForSegment(
          segment_outline, 
          snippet, 
          targetChars,
          prev_content
        ) 
      });
      updatedHistory.push({ role: 'assistant', content: output });
    }
    
    const elapsedTime = Date.now() - startTime;
    res.status(200).json({
      data: {
        outputs: { output },
        status: "success",
        error: "",
        elapsed_time: elapsedTime,
        conversation_history: updatedHistory,
      },
    });
  } catch (error: any) {
    const elapsedTime = Date.now() - startTime;
    console.error(LOG_TAG, error?.message || error);
    res.status(200).json({
      data: {
        outputs: { output: "" },
        status: "error",
        error: error?.message || "单段续写失败",
        elapsed_time: elapsedTime,
        conversation_history: conversation_history,
      },
    });
  }
}
