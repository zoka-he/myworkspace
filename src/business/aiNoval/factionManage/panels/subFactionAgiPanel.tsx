import { useState, useEffect } from 'react';import { message } from '@/src/utils/antdAppMessage';

import { Button, Form, Input, InputNumber, Card, Typography, Divider, Spin, Space, Switch, Row, Col } from 'antd';
import { useCurrentFaction, useWorldViewId } from '../FactionManageContext';
import fetch from '@/src/fetch';
import { ApiResponse } from '@/src/types/ApiResponse';

const { TextArea } = Input;
const { Title, Paragraph } = Typography;

interface GenerateParams {
    upper_faction_name: string;
    relation_to_upper: string;
    orthodox: string;
    ptsd: string;
    survival_mechanism: string;
    daily_stabilizer: string;
    contradiction_shifter: string;
    count: number;
}

interface GenerateResult {
    text1?: string; // 约束层输出
    text2?: string; // 风格展开层输出
    text3?: string; // 命名与语言规则输出
    text4?: string; // 结构张力层输出
    text5?: string[]; // 生成的子阵营列表（数组）
}

interface SubFactionSeedsOutput {
    relation_to_upper: string;
    orthodox: string;
    ptsd: string;
    survival_mechanism: string;
    daily_stabilizer: string;
    contradiction_shifter: string;
}

// Mock 数据生成函数
function generateMockData(count: number = 1): GenerateResult {
    return {
        text1: `Allowed Assumptions:
- 该子阵营可以假设存在基础的行政管理体系
- 可以假设与上级阵营存在贸易往来
- 可以假设拥有一定的军事自卫能力

Forbidden Assumptions:
- 不得假设该子阵营拥有独立的外交权
- 不得假设该子阵营拥有超越上级阵营的科技水平
- 不得假设该子阵营可以完全脱离上级阵营独立存在

Common False Tropes（模型容易犯的错）:
- 避免将子阵营描述为"隐藏的强大势力"
- 避免过度强调"反叛"或"独立"倾向
- 避免假设子阵营拥有超自然力量或特殊能力`,

        text2: `美学偏好：
- 建筑风格偏向实用主义，多采用石质结构，装饰简洁但坚固
- 服饰以深色系为主，强调功能性而非华丽
- 艺术创作多反映历史事件和英雄传说

权力象征：
- 以印章和契约文书作为权威的象征
- 重视血统和传承，但更强调实际功绩
- 权力结构呈现层级分明的特点

秩序感来源：
- 来自对传统的尊重和对规则的严格遵守
- 通过明确的等级制度维持社会秩序
- 依赖集体记忆和历史教训来规范行为

对"他者""异端""失败"的态度：
- 对异端保持警惕但不过度排斥，更倾向于同化而非消灭
- 对失败者给予一定的宽容，认为失败是成长的必要过程
- 对他者采取实用主义态度，重视合作价值

最容易走向的极端状态：
- 过度保守，拒绝任何变革
- 形式主义，过度强调仪式和传统
- 等级固化，阻碍社会流动

不成立的刻板印象：
- 不是完全封闭的社会，实际上与外界有较多交流
- 不是纯粹的农业社会，也有一定的手工业和商业
- 不是缺乏创新，而是在传统框架内进行渐进式改进`,

        text3: `音系倾向：
- 偏好使用硬辅音（如 k, t, p）和短元音
- 词汇结构偏向单音节或双音节组合
- 重音通常落在第一个音节

常见词根来源：
- 宗教：圣、灵、祭、祷
- 官僚：令、册、印、职
- 军事：卫、戍、战、盾
- 自然：山、河、石、林

命名中隐含的价值取向：
- 强调稳定性和传承性
- 重视责任和义务
- 体现对传统的尊重

禁止使用的命名风格：
- 避免使用过于华丽或夸张的词汇
- 避免使用暗示"新"或"革命"的词汇
- 避免使用过于抽象或哲学化的概念
- 避免与上级阵营的命名风格过于相似或完全相反`,

        text4: `阵营正在同时追求、但无法同时满足的目标：
- 既希望保持传统和稳定，又需要在变化的世界中适应和发展
- 既希望维持与上级阵营的良好关系，又渴望获得更多的自主权
- 既希望保护自身文化特色，又需要与外界进行必要的交流

阵营最恐惧但无法回避的未来：
- 被上级阵营完全同化，失去自身特色
- 因过度保守而落后于时代，最终被淘汰
- 在外部压力下被迫做出违背传统的选择

若维持现状，最可能走向的极端行为：
- 逐渐封闭，拒绝一切外来影响
- 过度依赖上级阵营，失去自主性
- 内部矛盾激化，导致分裂

阵营对外叙事中刻意掩盖的真相：
- 实际上对上级阵营的某些政策存在不满，但不敢公开表达
- 内部存在改革派和保守派的激烈斗争
- 历史上曾有过试图独立的尝试，但最终失败`,

        text5: Array.from({ length: count }, (_, index) => {
            const names = [
                `石印领

词源拆解：
- "石"：象征坚固、稳定、传统
- "印"：代表权威、契约、秩序
- "领"：表示领土、管辖、责任

阵营潜在叙事用途：
- 可以作为保守势力的代表，在变革中起到平衡作用
- 适合作为中间调解者，在各方冲突中寻求妥协
- 可以作为传统价值观的守护者，在故事中承担传承文化的角色`,

                `卫戍邦

词源拆解：
- "卫"：表示守护、防御、责任
- "戍"：代表驻守、边界、忠诚
- "邦"：指代国家、联盟、共同体

阵营潜在叙事用途：
- 可以作为边境守护者的角色，在冲突中首当其冲
- 适合展现忠诚与自主之间的张力
- 可以作为军事与政治冲突的焦点`,

                `祭山盟

词源拆解：
- "祭"：象征宗教、传统、仪式
- "山"：代表稳定、高度、神圣
- "盟"：表示联盟、契约、承诺

阵营潜在叙事用途：
- 可以作为宗教与政治结合的典型
- 适合展现传统信仰在现代社会中的位置
- 可以作为精神力量的象征，在故事中提供道德指引`
            ];
            return names[index % names.length];
        })
    };
}

export default function SubFactionAgiPanel() {
    const [form] = Form.useForm<GenerateParams>();
    const [loading, setLoading] = useState(false);
    const [seedLoading, setSeedLoading] = useState(false);
    const [result, setResult] = useState<GenerateResult | null>(null);
    const [useMockData, setUseMockData] = useState(false);
    const currentFaction = useCurrentFaction();
    const [worldViewId] = useWorldViewId();

    // 当 currentFaction 发生变化时，自动填充上级名称
    useEffect(() => {
        if (currentFaction?.name) {
            form.setFieldValue('upper_faction_name', currentFaction.name);
        }
    }, [currentFaction?.id, currentFaction?.name, form]);

    // 如果当前有选中的阵营，手动填充上级名称（保留按钮功能）
    const handleFillCurrentFaction = () => {
        if (currentFaction?.name) {
            form.setFieldValue('upper_faction_name', currentFaction.name);
        } else {
            message.warning('请先选择一个阵营');
        }
    };

    // 根据上级名称自动生成种子字段（除上级阵营外的 6 项）
    const handleGenerateSeeds = async () => {
        const upper = form.getFieldValue('upper_faction_name')?.trim();
        if (!upper) {
            message.warning('请先填写上级名称');
            return;
        }
        const relationToUpper = form.getFieldValue('relation_to_upper')?.trim();
        setSeedLoading(true);
        try {
            const response = await fetch.post<ApiResponse<SubFactionSeedsOutput>>(
                '/api/web/aiNoval/llm/once/generateSubFactionSeeds',
                { upper_faction_name: upper, ...(relationToUpper ? { relation_to_upper: relationToUpper } : {}) }
            );
            const result = response as unknown as ApiResponse<SubFactionSeedsOutput>;
            if (result?.success && result.data) {
                form.setFieldsValue({
                    relation_to_upper: result.data.relation_to_upper,
                    orthodox: result.data.orthodox,
                    ptsd: result.data.ptsd,
                    survival_mechanism: result.data.survival_mechanism,
                    daily_stabilizer: result.data.daily_stabilizer,
                    contradiction_shifter: result.data.contradiction_shifter,
                });
                message.success('种子已生成');
            } else {
                throw new Error(result?.error || '生成失败');
            }
        } catch (err: any) {
            message.error(err?.message || '种子生成失败');
        } finally {
            setSeedLoading(false);
        }
    };

    const handleGenerate = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            setResult(null);

            // 如果使用 Mock 数据，模拟 API 调用延迟
            if (useMockData) {
                await new Promise(resolve => setTimeout(resolve, 1500)); // 模拟1.5秒延迟
                const mockResult = generateMockData(values.count || 1);
                setResult(mockResult);
                message.success('生成成功（Mock 数据）');
                setLoading(false);
                return;
            }

            // 实际 API 调用
            const response = await fetch.post<ApiResponse<GenerateResult>>(
                '/api/web/aiNoval/llm/once/difyGenSubFactions',
                {
                    worldview_id: worldViewId,
                    ...values,
                },
                {
                    timeout: 1000 * 60 * 10,
                }
            );

            const result = response as unknown as ApiResponse<GenerateResult>;

            if (result?.success && result.data) {
                setResult(result.data);
                message.success('生成成功');
            } else {
                throw new Error(result?.error || '生成失败');
            }
        } catch (error: any) {
            console.error('Generate sub factions error:', error);
            message.error(error?.message || '生成失败，请检查配置');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="f-fit-height" style={{ overflow: 'auto', padding: '16px' }}>
            <Card 
                size="small" 
                style={{ 
                    marginBottom: '24px', 
                    background: 'linear-gradient(135deg, #FFEAD5 0%, #FFF5EB 100%)',
                    border: '1px solid #FFD4A3'
                }}
            >
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>🤖</span>
                        <Paragraph 
                            style={{ 
                                margin: 0, 
                                fontSize: '14px',
                                color: '#8B4513',
                                fontWeight: 500
                            }}
                        >
                            根据上级阵营信息，生成子阵营的详细设定
                        </Paragraph>
                    </div>
                    <div style={{ 
                        padding: '8px 12px', 
                        background: 'rgba(255, 255, 255, 0.6)', 
                        borderRadius: '4px',
                        marginTop: '8px'
                    }}>
                        <Space direction="vertical" size="small">
                            <span style={{ fontSize: '12px', color: '#D2691E' }}>
                                💰 很贵，效果很好，一次5毛钱
                            </span>
                            <span>
                                注意，此功能还在完善中，需要连接dify，并且两侧主机是写死的，跨机使用会有问题
                            </span>
                        </Space>
                    </div>
                    <Paragraph 
                        type="secondary" 
                        style={{ 
                            margin: 0, 
                            fontSize: '12px',
                            color: '#8B6F47',
                            marginTop: '4px'
                        }}
                    >
                        生成过程包括约束层、风格展开层、命名规则层、结构张力层和最终生成层
                    </Paragraph>
                </Space>
            </Card>

            <Card 
                title={
                    <Space>
                        <span>生成参数</span>
                        <Switch
                            checkedChildren="Mock"
                            unCheckedChildren="真实"
                            checked={useMockData}
                            onChange={setUseMockData}
                            style={{ marginLeft: '16px' }}
                        />
                        <span style={{ fontSize: '12px', color: '#999' }}>
                            {useMockData ? '（使用示例数据）' : '（调用真实API）'}
                        </span>
                    </Space>
                }
                size="small" 
                style={{ marginBottom: '24px' }}
            >
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{
                        count: 1,
                    }}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="上级名称"
                                name="upper_faction_name"
                                rules={[{ required: true, message: '请输入上级阵营名称' }]}
                                extra="子阵营所属的上级阵营名称"
                            >
                                <Input
                                    placeholder="例如：帝国"
                                    suffix={
                                        <Space size="small">
                                            <Button
                                                type="link"
                                                size="small"
                                                onClick={handleFillCurrentFaction}
                                                disabled={!currentFaction}
                                            >
                                                使用当前阵营
                                            </Button>
                                            <Button
                                                type="link"
                                                size="small"
                                                loading={seedLoading}
                                                onClick={handleGenerateSeeds}
                                            >
                                                自动生成种子
                                            </Button>
                                        </Space>
                                    }
                                />
                            </Form.Item>

                            <Form.Item
                                label="生成数量"
                                name="count"
                                extra="要生成的子阵营数量，默认为1"
                            >
                                <InputNumber
                                    min={1}
                                    max={10}
                                    style={{ width: '100%' }}
                                    placeholder="1"
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="与上级关系"
                                name="relation_to_upper"
                                rules={[{ required: true, message: '请输入与上级的关系' }]}
                                extra="描述子阵营与上级阵营的关系，如：附属国、分裂势力、自治领等"
                            >
                                <TextArea
                                    rows={6}
                                    placeholder="例如：帝国的一个附属国，享有一定自治权但需向帝国进贡"
                                    maxLength={256}
                                    showCount
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="阵营正统"
                                name="orthodox"
                                rules={[{ required: true, message: '请输入阵营正统来源' }]}
                                extra="阵营合法性和正统性的来源"
                            >
                                <TextArea
                                    rows={4}
                                    placeholder="例如：继承自古代王朝的血脉，拥有正统的统治权"
                                    maxLength={256}
                                    showCount
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="阵营创伤"
                                name="ptsd"
                                rules={[{ required: true, message: '请输入阵营的历史创伤' }]}
                                extra="阵营历史上遭受的重大创伤或失败，影响其行为模式"
                            >
                                <TextArea
                                    rows={4}
                                    placeholder="例如：在百年前的大战中失去了大部分领土，至今仍对扩张保持谨慎"
                                    maxLength={256}
                                    showCount
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="存续机制"
                                name="survival_mechanism"
                                rules={[{ required: true, message: '请输入存续机制' }]}
                                extra="阵营得以延续的机制或条件"
                            >
                                <TextArea
                                    rows={4}
                                    placeholder="例如：依赖上级的军事保护与贸易准入，通过进贡换取自治"
                                    maxLength={256}
                                    showCount
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="日常稳态来源"
                                name="daily_stabilizer"
                                rules={[{ required: true, message: '请输入日常稳态来源' }]}
                                extra="维持日常秩序与稳定的来源"
                            >
                                <TextArea
                                    rows={4}
                                    placeholder="例如：地方长老议事、宗教仪式、定期集市与节日"
                                    maxLength={256}
                                    showCount
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="矛盾转移方式"
                                name="contradiction_shifter"
                                rules={[{ required: true, message: '请输入矛盾转移方式' }]}
                                extra="内部矛盾如何被转移或化解"
                            >
                                <TextArea
                                    rows={4}
                                    placeholder="例如：将不满导向外部敌人、通过竞技与仪式宣泄、等级制度将责任上推"
                                    maxLength={256}
                                    showCount
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            
                        </Col>
                    </Row>
                    <Form.Item>
                        <Space>
                            <Button
                                type="primary"
                                onClick={handleGenerate}
                                loading={loading}
                                disabled={!useMockData && !worldViewId}
                            >
                                开始生成
                            </Button>
                            <Button onClick={() => form.resetFields()}>
                                重置
                            </Button>
                            {useMockData && (
                                <Button
                                    onClick={() => {
                                        const values = form.getFieldsValue();
                                        const mockResult = generateMockData(values.count || 1);
                                        setResult(mockResult);
                                        message.info('已加载 Mock 数据');
                                    }}
                                >
                                    预览效果
                                </Button>
                            )}
                        </Space>
                    </Form.Item>
                </Form>
            </Card>

            {loading && (
                <Card size="small">
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Spin size="large" />
                        <div style={{ marginTop: '16px' }}>正在生成子阵营设定，请稍候...</div>
                    </div>
                </Card>
            )}

            {result && !loading && (
                <Card title="生成结果" size="small">
                    {result.text1 && (
                        <>
                            <Title level={5}>约束层输出</Title>
                            <Paragraph>
                                <pre style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: '12px', borderRadius: '4px' }}>
                                    {result.text1}
                                </pre>
                            </Paragraph>
                            <Divider />
                        </>
                    )}

                    {result.text2 && (
                        <>
                            <Title level={5}>风格展开层输出</Title>
                            <Paragraph>
                                <pre style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: '12px', borderRadius: '4px' }}>
                                    {result.text2}
                                </pre>
                            </Paragraph>
                            <Divider />
                        </>
                    )}

                    {result.text3 && (
                        <>
                            <Title level={5}>命名与语言规则输出</Title>
                            <Paragraph>
                                <pre style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: '12px', borderRadius: '4px' }}>
                                    {result.text3}
                                </pre>
                            </Paragraph>
                            <Divider />
                        </>
                    )}

                    {result.text4 && (
                        <>
                            <Title level={5}>结构张力层输出</Title>
                            <Paragraph>
                                <pre style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: '12px', borderRadius: '4px' }}>
                                    {result.text4}
                                </pre>
                            </Paragraph>
                            <Divider />
                        </>
                    )}

                    {result.text5 && Array.isArray(result.text5) && result.text5.length > 0 && (
                        <>
                            <Title level={5}>生成的子阵营列表</Title>
                            {result.text5.map((item, index) => (
                                <Card
                                    key={index}
                                    size="small"
                                    style={{ marginBottom: '12px' }}
                                    title={`子阵营 ${index + 1}`}
                                >
                                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                                        {item}
                                    </pre>
                                </Card>
                            ))}
                        </>
                    )}
                </Card>
            )}

            {!worldViewId && (
                <Card size="small">
                    <Paragraph type="warning">
                        请先选择世界观
                    </Paragraph>
                </Card>
            )}
        </div>
    );
}