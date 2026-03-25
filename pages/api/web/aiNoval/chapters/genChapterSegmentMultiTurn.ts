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

**措辞与强制性（极其重要）**：凡判为 FAIL 时，你的意见将直接交给**重写模型**执行；若写成「建议」「可以」「不妨」等软性措辞，重写模型容易当作可选项而忽略。**对下列类型一律用强制性用语，禁止用「建议」弱化**：
- **绝对禁止项**（如禁用词、模因、加密表述等）：必须写「**必须删除**……」「**禁止保留**……」，不得写「建议删掉」。
- **结构性破坏**（一笔带过、急于推进、跳过本段提纲、大幅改剧情等）：必须写「**必须重写/必须补写**……」「**必须在本段内展开**……」，不得写「可以考虑多写一点」。
- **句式/对白问题**：必须写「**必须改写为**……」「**必须替换**……」，少用「可以改为」。
整体原则：FAIL 的原因部分要以**编辑下达改稿指令**的口吻撰写，让后续步骤明确**非做不可**；仅在确属可有可无的润色时，才可偶尔用「可酌情」，且不得用于本条所列致命问题。

专门检测以下**致命问题**（任一项出现即判为不通过）：

1. **虚空特殊指代**：出现「某种」「特有的」「独有的」等指代词，但指代对象不具备特殊性。
2. **提前解释或剧透**：在情节尚未展开前就提前解释结局、真相或关键转折；把本该在后文揭晓的信息在本段说破。
3. **概括式剧透**：用概括性语句代替具体情节（例如「后来他们经历了种种终于……」），导致本该在本段呈现的情节被一笔带过或剧透。
4. **滥用网络安全表述**：严禁在小说叙事中**明显出现**「加密通讯」「加密标识」「VPN」「端到端加密」「安全信道」「加密链路」等一切网络安全/加密通信技术用语。出现此类表述一律判为不通过；若确需涉及通信保密，应使用隐晦和一语双关的表达技巧，或让角色安排真人交流，或通过动作和场景描写，不得使用加密术语。**不误伤**：非加密表述，不得因此判不通过，仅当设计“加密”等词语时，才判不通过。
5. **「通用语」字眼**：仅当正文**明显出现**以下字眼时判不通过：「通用语」「大陆通用语」「世界通用语」「各族通用语」「全境通用语」「通行语」「共同语」「标准语」（指全境唯一语言时）等直接表述。不禁止「用一种语言」「双方都懂的话」等隐晦说法；但若涉及多语言/跨族交流场景，可在原因中提醒作者：需考虑翻译或可懂性，避免读者困惑。
6. **高频套路用语**：严禁使用网文常见套路句，出现即判不通过。典型包括但不限于：「巨石投入水中」「像一块巨石投入水中」「声音不大」「字字清晰」「不容置疑」「恰到好处」「不易察觉」「微微一笑」「深吸一口气」「无意识地」「下意识地」「变故陡生」「张了张嘴，没发出声音」「身体前倾」「每个字都」「斟酌」「缓缓开口」「空气凝固」以及**生硬比喻（凡把对白/语气比作念公文、背条文的，一律禁止）**：「平直得像在宣读条款」「像在宣读条款」「宣读条款般」「平直如宣读条款」「语气像在宣读条款」「像在念条文」「平直得像在念条文」「念条文般」「像在背条文」「像在念规章制度」「像在背规章制度」「背规章制度般」「规章制度般」「平直得像在背规章制度」「语气像在念条文」等及同义变体。审稿时若发现此类表述，须在原因中明确列出并**必须删除或改写**，改为具体写语气、节奏或用词，勿用条款/条文/规章制度类比喻。
7. **合成音类模因（严谨，不误伤视觉单位）**：仅当**声音/语音**被明确描述为合成、机械、电子、AI 时判不通过。必检表述（仅针对**听觉/语音**）：「合成音」「机械音」「电子音」「AI 语音」「合成语音」「机械合成的声音」「电子合成声」「冰冷的机械声」「毫无感情的电子音」等。**不误伤**：表情包、贴纸、弹幕、字幕、屏幕文字、界面图标、视觉符号等**视觉单位**的描写不属于「合成音」范畴，不得因此判不通过；若正文写的是画面/屏幕上的文字或图形，一律不按合成音处理。
8. **双重否定与「不是……而是……」句式**：正文中出现的「不是……而是……」「并非……而是……」「不是……而是……」「与其说……不如说……」等双重否定或对比否定句式，要求改为平直、肯定的表述。审稿时若发现此类句式，须在原因中列出并建议改为直接陈述，避免绕弯。
9. **连续枚举角色反应**：不得连续逐人枚举角色的反应；当超过 2 名角色做出反应时，应改为盖然性的指代（如「众人」「在场者」「其中几人」等概括性表述），避免「A 如何、B 如何、C 如何」式的机械罗列。
10. **叙述者解释剧情/动机/因果**：正文中不得用叙述者口吻或旁白**针对当前情节**直接解释剧情走向、人物动机、事件因果或「为什么会这样」。若出现「原来……」「这意味着……」「事实上……」「因为……所以……」「他这样做的原因是……」等**替读者归纳本段/前文剧情**的句子，或替读者总结本段/前文发生了什么事，判为不通过。情节应通过行动、对话和细节展现（展示而非告知），不得用说明性语句替代。**不误伤**：① **设定展开**：为读者交代世界观规则、制度背景、地理环境、历史渊源、势力关系、常识性设定等**与当前情节推进无直接「剧透式归纳」关系**的说明性文字，属于设定呈现，不判不通过（例如介绍某城规矩、某族习俗、某技术原理在设定内的说明）。② 角色内心吐槽戏谑、对人或事的个人简短评价、对人物动机的合理猜测、对事件因果的推测等，不判不通过。③ 区分要点：若旁白是在**总结「刚才/本段发生了什么、角色为什么这么做」**，仍判不通过；若旁白是在**展开设定或环境信息**且未替读者打包剧情结论，不判不通过。
12. **演讲腔/军事腔/总结性台词**：角色台词应生动、自然、贴合情境与人物性格。若对白出现以下情况判为不通过：**演讲强调**（像在台上发言、喊口号、宣言式表述）；**军事腔调**（刻板的命令式、汇报式、队列用语如「是！」「明白！」「保证完成任务」等，除非设定确为军事场景且符合身份；同时要重点留意缺少「我/你/我们」等主语指代、只剩下命令或汇报内容的句子，如「立刻执行」「收到」「按之前方案推进」这类简短口令式对白）；**总结性/口号式台词**（用一句对白替作者总结主题、点题、升华，或空洞的动员、宣誓式语句）。对于整段对话普遍存在主语缺失、来回只用「好/行/明白/收到」等机械应答、语气僵硬而缺乏具体情绪和细节的情况，也应按「军事腔/口号式对白」处理，判为不通过。审稿时若发现此类对白，须在原因中列出并建议改为更生活化、具体、有冲突感的对话，并鼓励使用自然的主语指代（如「我/你/我们/他们」）和更贴近日常说话的句式。
13. **匕首抛光综合征**：该项需要极其敏感，绝对禁止出现“擦拭匕首/刀/剑”（这意味着严重挑衅的剧情）、“握着剑柄”（这意味着要写打斗了）、“推了推不存在的眼镜”（这不合逻辑）、“整理衣服”（大部分情况不合逻辑）、“沉默片刻”（无意义）、“看向火堆”（无意义）、名为“铁砧”的人、物、或地名（极高频且无意义）这几个模因时或类似的变体，直接判不通过，必须要求删除，没有改写余地。此外，无打斗场景，严格禁止「剑柄」这个意象，如果出现，直接判不通过，要求重写，没有改写余地。
14. **公共频道综合征**： 该项需要极其敏感，绝对禁止公共频道这个意象，它必须以更具体的，如广播、电视、网络等的形式出现，部分情况下，可能连原本应该是街道上、咖啡厅的人们的聊天，都会被滥用为“公共频道”，必须结合场景予以纠正还原。如果小说中出现了“公共频道”这个词，直接判为不通过。
15. **AI 式翻译腔（生硬英式叙述套话）**：禁止明显不符合中文习惯、由英文叙述套路直译而来的表述。**必检**：如「开口道」「缓缓开口」「顿了顿道」「沉默了片刻道」「他开口说」「她缓缓说道」等——中文自然表达多用「说」「道」「问」「答」直接引出对话，或「他/她+动词」简洁带过，无需「开口」「缓缓开口」这类英式「opened his mouth」「said slowly」的套话。同类还包括「点了点头」「摇了摇头」过度堆砌、「他/她顿了顿」「重新看向」「转向某人」「打破死寂」「目光锐利」等无信息量 filler。**不误伤**：经典文学译本的翻译腔、适度欧化句式、以及「他沉吟道」「他低声道」等已融入中文的常见写法，不判不通过；仅对明显生硬、AI 常见的英式叙述套话（上述「开口道」「缓缓开口」等）判不通过。审稿时须在原因中列出具体句例并建议改为更自然的中文说法。
11. （原“本段写足与否/后续抢跑”、16-20 以及第21条“非末段收束全章”等“整体内容审查”职责，已并入3号审稿员；1号不再据此判 FAIL）

请**仅根据【本段提纲】与【待审稿内容】**判断（【本段提纲】= 本段应写要点，【待审稿内容】= 本段正文）；【前序章节摘要】与【相关设定】仅作背景参考，勿将本段提纲与整章内容混淆。

<相关设定>
{{context}}
</相关设定>

**输出格式（必须严格遵循）**：
- 若**无**上述致命问题，仅输出一行：PASS
- 若**有**问题，第一行输出：FAIL，第二行起按下面结构写（**不要用「建议」统领全文**；每条对应问题须含「必须删除」或「必须修改/必须重写」之一）：
  原因：<一句话概括为何不通过>
  必须删除：<逐条列出须整句或整段删去的表述/情节；无则写「无」>
  必须修改：<逐条列出须改写、补写或替换的内容及改成什么样；结构性问题须明确写「必须在本段内展开……」「禁止一笔带过/禁止急于推进到后文」等>
  （以上三块中，「必须删除」「必须修改」下每条都要像改稿批注一样具体，便于写手直接照做。）`;

/** 分段改写专用写手角色提示：仅根据用户消息中的提纲、前情、上一稿和审稿意见进行改写，不新增设定，不改剧情走向 */
const REWRITER_SYSTEM_PROMPT_SEGMENT = `你是一名小说分段改写写手。

你的工作对象不是空白页面，而是一段「糟糕但大致反映内容的底稿」。用户消息会同时给出：
- 【前情提要】【本段提纲要点】：说明这一段应该写什么、前后文大致走向；
- 【上一稿（糟糕底稿）】：剧情大体正确，但写法、节奏、细节和用词存在大量问题；
- 【审稿员意见】：已经指出了这份底稿里最严重的问题。

你的职责：
1. **只在这份糟糕底稿的基础上改写**，不要当成全新续写任务，不要抛弃底稿另起炉灶。
2. **绝不改变剧情走向、人物动机和关键信息**：除非用户消息（提纲/前情）本身要求，否则不要改事件结果、人物立场、因果逻辑。
3. 严格以【本段提纲】和【审稿员意见】为硬约束：被点名的问题在改写稿中必须彻底消失或被实质性修正，不能表面换皮保留。
4. 只输出改写后的**完整本段正文**，不要复述提纲，不要解释自己的修改，也不要重复审稿意见或引用原稿。`;

/** 3号审稿员（分段版）：仅给建议，不判 PASS/FAIL；负责整体内容审查 */
const CRITIC3_SYSTEM_PROMPT_SEGMENT = `你是3号审稿员，负责分段文本的「整体内容审查与扩展建议」。你不做 PASS/FAIL 判定，只输出可执行建议。

角色定位与分工边界（必须遵守）：
1) 你是“整体质量编辑”，不是禁词警察。1号负责硬性违规与细节修正，你负责给出“如何把本段写得更足、更稳、更有张力”的建议。
2) 你不能和1号冲突，也不要简单复述1号；应在1号意见基础上给出更高层、可落地的补强方案。
3) 你只审“当前这一段”，不得把整章标准强加给本段；但可结合前情判断本段衔接是否合理。

重点建议维度（详细执行）：
一、展开度与结构完整性
- 围绕【本段提纲】给出“写足”建议：场景、冲突、动作链、对话、情绪推进各应补到什么粒度。
- 若出现“本段写得少、却大量写后续”，给出补写清单（补什么、补到什么粒度、放在段内哪个位置）。
- 若本段信息密度不足但存在多处一句话 filler，优先建议“删同类 filler + 扩一处有效块”策略：把其中一处扩成承载设定/冲突/动机的实质段落，其余压缩或删除。

二、与提纲/前情的一致性
- 给出一致性修正建议：关键动机、事件结果、关系状态、因果链哪些地方偏离提纲/前情，以及如何回正。
- 允许合理细节扩展，但不得凭空改写剧情方向；若偏离，提供“需要保留的核心信息 + 建议替换的失真段落”。

三、设定一致性
- 检查人物性格、身体特征（外观、衣着、特殊情况）、行为模式是否与前情/提纲/设定一致。
- 检查是否出现设定冲突或矛盾：如角色阵营、立场、目标、动机等是否与前情/提纲/设定一致。
- 若出现设定冲突或矛盾，给出“回正路径”（需要保留的核心信息 + 建议替换的失真段落）。

四、情感与叙述张力
- 给出基调增强建议：当提纲带张力而正文温吞、安全化、新闻化时，如何改写为有情绪推进的版本。
- 当冲突段被“反问灌水”稀释，或旁白用“安全表达”回避冲突时，给出删改与替代建议。
- “语气没什么波动”、“脸色/声音沉了下去”、“沉默”、“语气平淡”、“没有表情”、“没有反应”这种表述反复出现时，所在段落也视为存在刻意抹平情感基调的问题，提出改写或删除的回正方案。
- 若基调错位，给出具体改写抓手：对白语气、叙述节奏、动作细节、意象选择应如何调整。

五、人物与关系动态
- 多角色场景下，若出现“独角戏”（只有单人持续输出，其他角色长期无有效反馈），给出补强建议。
- 建议应明确：补入哪些角色的立场回应/动作反馈/关系博弈，以及这些反馈如何改变推进节奏。
- 人物性格一致性优先级：先服从本段提纲与前情中的角色要求，再校验设定；若出现“冰冷/锐利”、“无意识的”等模板形容词堆叠导致 OOC 风险，建议改为可观察细节（措辞、停顿、动作与对方反应）。

六、开头策略与段内起笔
- 对本段开头给出起笔建议：是否需要延续前序情境；若无必要，给出更贴合本段主体的开头方案。
- 若段纲已指定开头而正文跳过，给出“补回指定开头”的具体改写方案（先补开头再承接正文，或重排前几句）。

七、模板化高危意象与润色边界
- 重点检查“匕首综合征”高危意象（刀柄/剑柄等武器类型意象）：出现刀柄/剑柄等武器类型意象则必须进行战斗，若突兀出现且后文未出现打斗场景（对峙不算打斗场景），说明此段落的叙事、因果、逻辑已被模板化写作套路完全破坏，必须对相关句段做彻底重构，不仅是换词，而是重建动作链、冲突推进与场景因果。
- 检查是否出现“公共频道综合征”（街道/咖啡厅/酒吧等公共场所的聊天被滥用为“公共频道”），提出改写或删除的回正方案。
- 检查“顿了顿”、“沉默”、“语气平淡”、“没有表情”、“没有反应”等破坏叙事的表述是否反复出现，提出改写或删除的回正方案。
- 检查“气氛凝固”、“空气凝固”等表述是否反复出现，提出改写或删除的回正方案。

八、润色边界
- 当前是润色阶段：可挖掘既有设定，但不得新增足以改写剧情走向的关键设定；若存在风险，给出“保留悬念/沿用既有设定推进”的替代方案。

关于1号意见（强约束）：
- 你会收到【1号审稿员结论与意见】。你的建议必须与其一致，不得冲突或抵消。
- 当1号指出 filler/套话问题时，你要给“基于设定的覆盖建议”，而不是继续填充 filler。

输出要求：
- 不输出 PASS/FAIL，不输出“无法判断/信息不足”。
- 聚焦“给建议”，少做抽象提醒；每条建议都要可执行，最好带“改哪里-怎么改-达到什么效果”。
- 即便问题较少，也要给出至少1条有价值的优化建议。

输出格式（必须严格遵循）：
1.初步分析：<一句话概括本段整体问题与潜力>
2.自查是否违反提示词、设定、1号的意见：<逐条核对，需引用1号关键点>
3.最终建议：<仅给可执行改稿建议，按条列出>`;

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
  /** 本章分段总数；与 segment_index 同时传入时，审稿员可区分是否末段。非末段时警惕模型提前收束全章。 */
  segment_count?: number;
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

/** 写作模型专用采样参数：提高 temperature、大幅降低 Frequency Penalty、大幅提高 Presence Penalty 与 Top_P */
const WRITER_SAMPLING = {
  temperature: 1.2,
  frequencyPenalty: 0,
  presencePenalty: 1.8,
  topP: 1,
};

function createModel(llmType: string): any {
  const effectiveType = (llmType || "deepseek-chat").toLowerCase();

  if (effectiveType === "deepseek" || effectiveType === "deepseek-reasoner") {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) throw new Error("DEEPSEEK_API_KEY is not configured");
    return new ChatDeepSeek({
      apiKey: key,
      model: "deepseek-reasoner",
      temperature: WRITER_SAMPLING.temperature,
      frequencyPenalty: WRITER_SAMPLING.frequencyPenalty,
      presencePenalty: WRITER_SAMPLING.presencePenalty,
    });
  }

  if (effectiveType === "deepseek-chat") {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) throw new Error("DEEPSEEK_API_KEY is not configured");
    return new ChatDeepSeek({
      apiKey: key,
      model: "deepseek-chat",
      temperature: WRITER_SAMPLING.temperature,
      frequencyPenalty: WRITER_SAMPLING.frequencyPenalty,
      presencePenalty: WRITER_SAMPLING.presencePenalty,
    });
  }

  // Gemini（OpenRouter）
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");
  const modelName = effectiveType === "gemini3" || effectiveType?.includes("gemini3")
    ? "google/gemini-2.0-flash-exp:free"
    : "google/gemini-2.5-pro";
  return new ChatOpenAI({
    model: modelName,
    temperature: WRITER_SAMPLING.temperature,
    frequencyPenalty: WRITER_SAMPLING.frequencyPenalty,
    presencePenalty: WRITER_SAMPLING.presencePenalty,
    topP: WRITER_SAMPLING.topP,
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
- 对话应保持完整、自然、符合人物性格，不得为了节省字数而简略对话。

**争吵/冲突对白少用反问灌水**：写争吵、拌嘴、质问时，禁止用大量「你难道……？」「这不是……吗？」「你以为……？」等**无信息反问**凑字数；除非该反问不可替代地表达态度或信息，否则改用直陈、反驳或具体指控。默认少反问、多实质交锋。

**旁白禁止为求安全而抹平剧情**：叙述层不要用「双方交换了意见」「进行了沟通」「气氛有些紧张」「情绪有些波动」等空泛、去冲突的**安全表达**顶替本段应有的对峙、失败、愤怒或张力；提纲或对白里已有的锋芒，旁白不得用公文腔、新闻腔压平。`;
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
- **禁止「条款/条文/规章制度」类公文比喻**：不得写「宣读条款」「念条文」「背规章制度」及一切「像在念××条文/条款/规章制度」「××般（条文腔、条款腔）」等——属生硬 AI 套话；写语气请用具体说法（如「一句一顿」「没有起伏」「干巴巴的」等），**不要**用条款、条文、规章制度、公文诵读作比。
- **评价要具体**：若需写「刚好、合适」，用具体情境与结果描写代替「恰到好处」。
- **神态与动作要多样**：笑、呼吸、叹息等描写请根据人物与情境选用具体、贴切的写法，避免千篇一律的「微微一笑」「深吸一口气」。`
    : "";
  const antiPlotExplanationBlock = antiPlotExplanation
    ? `

**抗剧情解释（禁止在正文中解释剧情）**：
- **禁止用叙述者口吻或旁白解释当前情节的动机、因果**：不要写「原来……」「这意味着……」「事实上……」等**替读者归纳剧情**的句子；只呈现具体情节、对话与描写，让读者通过情节自己感受。
- **不要替读者总结**：不要在本段中概括或总结本段/前文发生了什么事；情节通过行动、对话和细节展现，不要用说明性语句替代。
- **展示而非告知**：动机、因果、真相应通过角色行为与情节推进自然呈现，不得用旁白直接说明「因为……所以……」「他这样做的原因是……」等。
- **允许设定展开**：世界观规则、制度、地理、历史背景、势力与常识等**设定向**说明可以写，与「禁止替读者总结本段剧情」不冲突；勿把设定交代误判为违规。`
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

/** 构建带审稿意见的重写用户输入（仅用于审稿不通过时的多轮修正，不写入 conversation_history），由专门的改写写手在糟糕底稿上重写本段 */
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

【改写角色：在糟糕底稿上重写本段】
你现在扮演一名**改写写手**。可以把下面这一稿视为「**糟糕但基本反映本段提纲的稿件**」：剧情大致覆盖【本段提纲要点】，但写法、节奏、细节和用词存在大量问题。

【上一稿（糟糕但内容大致正确的本段底稿）】
---
${rejectedDraft}
---

【审稿员意见】
以下是与你协作的**分段审稿员**给出的批注：他负责挑错，你负责在不歪曲【本段提纲】和前后文的前提下落地改写。
${criticReason}

请按如下要求改写本段正文：
1. 以【审稿员意见】为硬标准：凡被点名的问题，必须在改写稿中彻底消失或被实质性修正，不允许仅作表面改动或换皮保留。
2. 保持本段剧情、人称、时间线与上下文连贯，只在必要处改写句子、段落乃至局部结构，不得随意改写已确立的关键情节或人物动机。
3. 输出的是**改写后的完整本段正文**，不要只写修改说明、不要重复审稿意见、不要只输出改动片段。
4. 默认延续上一稿中尚可保留的剧情选择，只对被审稿员点名的问题区域做大刀阔斧重写；如确实需要微调剧情以彻底消除问题，也必须保持与【本段提纲】和前文摘要一致。`;
}

/** 审稿员系统提示中「非末段」专用条目的占位替换 */
const NON_FINAL_SEGMENT_RULE_BLOCK = `21. **非末段却试图收束全章（仅当【分段位置】标明「本段非章节末段」时启用）**：本段之后仍有提纲段落待写。若待审稿内容出现明显**把整章当完结来写**的收束腔，判为不通过。典型包括：**全章式总结或落槌感**（如「这一天终于……」「一切尘埃落定」「到此为止」「总算……」「故事仿佛在这一刻画上句点」等）；**主要矛盾在本段被写死、无承接空间**（读者感觉本章已无后文可写，而后文提纲仍存在）；**强断裂的「章末」暗示**（如刻意首尾呼应点题像终章、用「后来的岁月里……」「许多年后再回首……」概括余生/全书）；**作者口吻的完结预告**（如「新的一章即将」「明天再面对吧」等，整体读来像在说本章已写完）。**必须修改**为：收在**便于下一段提纲衔接**的节点（可留悬念、事未竟、情绪悬着），**禁止**在本段内写出全章或全书终结感。**不误伤**：① 本段提纲明确要求本场景告一段落、或小高潮自然落地——只要没有上述**整章完结腔**，不判不通过；② 【分段位置】标明**末段**时，本条不适用（末段允许正常章末收束，仍以【本段提纲】为准）。`;

const CRITIC_SEGMENT_RULE_PLACEHOLDER = "{{NON_FINAL_SEGMENT_RULE}}";

function buildCriticSystemPromptSegment(isNonFinalSegment: boolean): string {
  const block = isNonFinalSegment
    ? NON_FINAL_SEGMENT_RULE_BLOCK
    : "（当前为章节末段或未提供分段总数时，不适用第 21 条「非末段收束全章」检测。）";
  return CRITIC_SYSTEM_PROMPT_SEGMENT.replace(CRITIC_SEGMENT_RULE_PLACEHOLDER, block);
}

/** 分段审稿专用：构建审稿员用户输入，明确区分「本段提纲」与「章节内容」，避免审稿员混淆 */
function buildCriticUserInputForSegment(
  segmentDraft: string,
  prevContent: string,
  segmentOutline: string,
  segmentIndex: number,
  segmentCount?: number
): string {
  const parts: string[] = [];
  if (typeof segmentCount === "number" && segmentCount >= 1) {
    const isLast = segmentIndex >= segmentCount;
    parts.push(
      isLast
        ? `【分段位置】第 ${segmentIndex}/${segmentCount} 段，**本段为章节末段**（允许按【本段提纲】做段末/章末收束；第 21 条不启用）。`
        : `【分段位置】第 ${segmentIndex}/${segmentCount} 段，**本段非章节末段**（其后仍有 ${segmentCount - segmentIndex} 段提纲待写）。须按第 21 条警惕：正文不得写成整章完结、收束全书口吻；须保留与后文衔接的空间。`
    );
  } else {
    parts.push(
      `【分段位置】未提供分段总数，第 21 条从宽；若正文明显像整章终稿收束而【本段提纲】仅为中间场景，仍可结合第 11 条（急于推进/跳段）等综合判断。`
    );
  }
  if (prevContent?.trim()) {
    parts.push(`【前序章节摘要】（仅作背景参考，审稿时以本段为准）\n${prevContent.trim()}`);
  }
  parts.push(`【本段提纲】（仅限本段应写的内容要点，非整章提纲；审稿请以此为准判断本段是否写足、是否跑题）\n${(segmentOutline || "").trim()}`);
  parts.push(`【待审稿内容】（本段正文，请判断是否存在致命问题）\n${segmentDraft || ""}`);
  return parts.join("\n\n");
}

/** 提取3号审稿员「3.最终建议」正文；兜底返回全文 */
function extractCritic3FinalSuggestion(response: string): string {
  const text = (response || "").trim();
  if (!text) return "";
  const match = text.match(/(?:^|\n)\s*3[\.．、]\s*最终建议[：:]\s*([\s\S]*)$/);
  if (match?.[1]?.trim()) return match[1].trim();
  return text;
}

function buildCritic3UserInputForSegment(
  segmentDraft: string,
  prevContent: string,
  segmentOutline: string,
  attentionText: string,
  segmentIndex: number,
  segmentCount: number | undefined,
  critic1Pass: boolean,
  critic1Reason?: string
): string {
  const base = buildCriticUserInputForSegment(segmentDraft, prevContent, segmentOutline, segmentIndex, segmentCount);
  const attentionSection = `【注意事项】\n${attentionText?.trim() || "（无）"}`;
  const critic1 = `【1号审稿员结论与意见】\n结论：${critic1Pass ? "PASS" : "FAIL"}\n意见：${critic1Reason?.trim() || (critic1Pass ? "1号通过，无强制修改项" : "1号未提供具体意见")}`;
  return `${base}\n\n${attentionSection}\n\n${critic1}`;
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
    segment_count,
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
    const segmentCountNum =
      typeof segment_count === "number" && segment_count >= 1 ? segment_count : undefined;
    const isNonFinalSegment =
      segmentCountNum != null && segment_index < segmentCountNum;
    const criticSystemPrompt = buildCriticSystemPromptSegment(!!isNonFinalSegment);

    if (!is_first_turn && enable_critic && output.trim()) {
      for (let rewriteCount = 0; rewriteCount < maxRewrites; rewriteCount++) {
        const criticInput = buildCriticUserInputForSegment(
          output,
          prev_content || "",
          segment_outline,
          segment_index,
          segmentCountNum
        );
        const criticResponse = await callLLM(
          effectiveLlmType,
          criticSystemPrompt,
          criticInput,
          context
        );
        const criticResult = parseCriticResponse(criticResponse);
        const critic3Input = buildCritic3UserInputForSegment(
          output,
          prev_content || "",
          segment_outline,
          attensionText,
          segment_index,
          segmentCountNum,
          criticResult.pass,
          criticResult.reason
        );
        const critic3Response = await callLLM(
          effectiveLlmType,
          CRITIC3_SYSTEM_PROMPT_SEGMENT,
          critic3Input,
          context
        );
        const critic3Advice = extractCritic3FinalSuggestion(critic3Response);
        if (criticResult.pass) {
          console.debug(LOG_TAG, "critic PASS", { rewriteCount });
          break;
        }
        const mergedCriticReason = [
          `【1号审稿员意见】\n${criticResult.reason || "1号审稿未通过，未给出具体原因"}`,
          critic3Advice ? `【3号审稿员最终建议（整体内容审查）】\n${critic3Advice}` : "",
        ].filter(Boolean).join("\n\n");
        console.debug(LOG_TAG, "critic FAIL, rewriting", {
          rewriteCount: rewriteCount + 1,
          reason: mergedCriticReason,
        });
        const rewriteUserInput = buildRewriteUserInputForSegment(
          segment_outline,
          snippet,
          targetChars,
          prev_content,
          mergedCriticReason,
          output
        );
        // 用同一轮内的重写请求调用「改写写手」，不重放完整 conversation_history，以避免干扰改写角色
        const rewriteMessages: BaseMessage[] = [
          new SystemMessage(REWRITER_SYSTEM_PROMPT_SEGMENT),
          new HumanMessage(rewriteUserInput),
        ];
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
