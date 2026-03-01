import { NextRequest, NextResponse } from 'next/server';
import { ChatDeepSeek } from '@langchain/deepseek';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

const model = new ChatDeepSeek({
  apiKey: DEEPSEEK_API_KEY,
  model: 'deepseek-chat',
  temperature: 0.3,
});

const embedPrompt = PromptTemplate.fromTemplate(`
你是一个小说世界构建助手。请根据以下族群/种族设定信息，生成一段用于向量嵌入的标签原文。

【约束】
1. 不要包含具体族群名称、人名、地名
2. 保留关键细节：外形、寿命、特质、弱点、命名习惯、习俗等
3. 使用通用描述，如「该种族」「某族群」
4. 若有上级族群（亚种），描述层级与差异即可，不写具体名称

【输出】
- 简洁自然，适合向量检索，200–300 字
- 保留原文中的数字与特征描述

族群设定：
- 描述：{description}
- 外形：{appearance}
- 寿命：{lifespan}
- 特质：{traits}
- 弱点：{weaknesses}
- 命名习惯：{naming_habit}
- 习俗：{customs}
- 上级关系：{parentInfo}

请生成嵌入标签原文：
`);

const generateChain = RunnableSequence.from([embedPrompt, model]);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = {
  description?: string;
  appearance?: string;
  lifespan?: string;
  traits?: string;
  weaknesses?: string;
  naming_habit?: string;
  customs?: string;
  hasParent?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body;
    const parentInfo = body.hasParent ? '有上级族群（亚种）' : '无上级族群';
    const response = await generateChain.invoke({
      description: body.description?.trim() || '无',
      appearance: body.appearance?.trim() || '无',
      lifespan: body.lifespan?.trim() || '无',
      traits: body.traits?.trim() || '无',
      weaknesses: body.weaknesses?.trim() || '无',
      naming_habit: body.naming_habit?.trim() || '无',
      customs: body.customs?.trim() || '无',
      parentInfo,
    });
    const embedText = (response.content as string) || '';
    return NextResponse.json({ success: true, data: { embedText } });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '生成失败';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
