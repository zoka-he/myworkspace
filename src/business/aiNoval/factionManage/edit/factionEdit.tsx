import { Modal, Form, Input, TreeSelect, Select, message, Space, Button, Divider, Flex } from 'antd';
import { IFactionDefData } from '@/src/types/IAiNoval';
import { useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { useWorldViewId, useFactionTree, useWorldViewList, useLoadFactionList } from '../FactionManageContext';
import apiCalls from '../apiCalls';
import { generateFactionEmbedText } from '@/src/api/aiNovel';
import { EditOutlined, ThunderboltOutlined } from '@ant-design/icons';

interface IFactionEditProps {
    // onCancel: () => void;
    // onOk: (values: IFactionDefData) => void;
    initialValues?: IFactionDefData;
}

export interface FactionEditRef {
    setFormValues: (values: IFactionDefData) => void;
    resetForm: () => void;
    showAndEdit: (values: IFactionDefData) => void;
}

/** 地理命名·文化标签（快速填充）：按风格分块 */
const NAMING_CULTURE_TAG_GROUPS: { label: string; tags: string[] }[] = [
    { label: '上古', tags: ['上古华夏', '先秦', '商周风', '古埃及', '古希腊', '古罗马', '美索不达米亚', '古印度'] },
    { label: '中古', tags: ['唐风', '宋风', '明风', '中世纪欧洲', '平安和风', '室町和风', '阿拉伯黄金时代', '拜占庭', '维京', '凯尔特'] },
    { label: '近世 / 地域', tags: ['华夏系', '日耳曼系', '和风', '中东阿拉伯', '印度系', '斯拉夫系'] },
    { label: '魔法', tags: ['西幻魔法', '东方仙术', '元素魔法', '符文魔法', '炼金术', '奥术', '德鲁伊', '精灵魔法', '龙与地下城风', '哈利波特风'] },
    { label: '幻想 / 蒸汽', tags: ['蒸汽朋克', '柴油朋克', '原子朋克', '废土', '仙侠', '克苏鲁'] },
    { label: '未来 / 科幻', tags: ['赛博朋克', '太空歌剧', '星际迷航风', '沙丘风', '星战风', '银翼杀手风', '攻壳风', '机甲风', '基地风', '星际牛仔风'] },
];

/** 命名规范生成·LLM 选项 */
const NAMING_LLM_OPTIONS = [
    { value: 'deepseek', label: 'DeepSeek' },
];

const SCALE_OF_OPERATION_OPTIONS = [
    { value: '地区级', label: '地区级' },
    { value: '大陆级', label: '大陆级' },
    { value: '行星级', label: '行星级' },
    { value: '多星级', label: '多星级' },
    { value: '文明级', label: '文明级' },
];

const FactionEdit = forwardRef<FactionEditRef, IFactionEditProps>(({
    // onCancel,
    // onOk,
    initialValues
}, ref) => {
    const [form] = Form.useForm();
    const [backupData, setBackupData] = useState<Partial<IFactionDefData>>({});
    const [visible, setVisible] = useState(false);
    const [embedLoading, setEmbedLoading] = useState(false);
    const [namingTagInput, setNamingTagInput] = useState('');
    const [personNamingTagInput, setPersonNamingTagInput] = useState('');
    const [namingGenLoading, setNamingGenLoading] = useState(false);
    const [personNamingGenLoading, setPersonNamingGenLoading] = useState(false);
    const [namingLlmProvider, setNamingLlmProvider] = useState<string>('deepseek');
    const [worldViewId] = useWorldViewId();
    const [factionTree] = useFactionTree();
    const [worldViewList] = useWorldViewList();
    const loadFactionList = useLoadFactionList();

    useImperativeHandle(ref, () => ({
        setFormValues: (values: IFactionDefData) => {
            // Backup the external data
            setBackupData(values);
            // Only set form values for fields that are in the form
            const formValues = {
                worldview_id: worldViewId,
                parent_id: values.parent_id,
                name: values.name,
                description: values.description,
                embed_document: values.embed_document,
                faction_type: values.faction_type,
                faction_culture: values.faction_culture,
                ideology_or_meme: values.ideology_or_meme,
                scale_of_operation: values.scale_of_operation,
                decision_taboo: values.decision_taboo,
                primary_threat_model: values.primary_threat_model,
                internal_contradictions: values.internal_contradictions,
                legitimacy_source: values.legitimacy_source,
                known_dysfunctions: values.known_dysfunctions,
                geo_naming_habit: values.geo_naming_habit,
                geo_naming_suffix: values.geo_naming_suffix,
                geo_naming_prohibition: values.geo_naming_prohibition,
                person_naming_habit: values.person_naming_habit,
                person_naming_suffix: values.person_naming_suffix,
                person_naming_prohibition: values.person_naming_prohibition,
            };
            form.setFieldsValue(formValues);
        },
        resetForm: () => {
            form.resetFields();
            setBackupData({});
        },
        showAndEdit: (values: IFactionDefData) => {
            setVisible(true);
            setBackupData(values);
            // Only set form values for fields that are in the form
            const formValues = {
                id: values.id,
                worldview_id: worldViewId,
                parent_id: values.parent_id,
                name: values.name,
                description: values.description,
                embed_document: values.embed_document,
                faction_type: values.faction_type,
                faction_culture: values.faction_culture,
                ideology_or_meme: values.ideology_or_meme,
                scale_of_operation: values.scale_of_operation,
                decision_taboo: values.decision_taboo,
                primary_threat_model: values.primary_threat_model,
                internal_contradictions: values.internal_contradictions,
                legitimacy_source: values.legitimacy_source,
                known_dysfunctions: values.known_dysfunctions,
                geo_naming_habit: values.geo_naming_habit,
                geo_naming_suffix: values.geo_naming_suffix,
                geo_naming_prohibition: values.geo_naming_prohibition,
                person_naming_habit: values.person_naming_habit,
                person_naming_suffix: values.person_naming_suffix,
                person_naming_prohibition: values.person_naming_prohibition,
            };
            form.setFieldsValue(formValues);
        }
    }));

    useEffect(() => {
        if (visible && initialValues) {
            setBackupData(initialValues);
            form.setFieldsValue({
                name: initialValues.name,
                description: initialValues.description,
                faction_type: initialValues.faction_type,
                faction_culture: initialValues.faction_culture,
                ideology_or_meme: initialValues.ideology_or_meme,
                scale_of_operation: initialValues.scale_of_operation,
                decision_taboo: initialValues.decision_taboo,
                primary_threat_model: initialValues.primary_threat_model,
                internal_contradictions: initialValues.internal_contradictions,
                legitimacy_source: initialValues.legitimacy_source,
                known_dysfunctions: initialValues.known_dysfunctions,
                geo_naming_habit: initialValues.geo_naming_habit,
                geo_naming_suffix: initialValues.geo_naming_suffix,
                geo_naming_prohibition: initialValues.geo_naming_prohibition,
                person_naming_habit: initialValues.person_naming_habit,
                person_naming_suffix: initialValues.person_naming_suffix,
                person_naming_prohibition: initialValues.person_naming_prohibition,
            });
        }
    }, [visible, initialValues, form]);

    // Clear form when modal is closed
    useEffect(() => {
        if (!visible) {
            form.resetFields();
            setBackupData({});
            setNamingTagInput('');
            setPersonNamingTagInput('');
        }
    }, [visible, form]);

    const handleCancel = () => {
        setVisible(false);
    };

    const handleNamingTagClick = (tag: string) => {
        setNamingTagInput(prev => (prev ? `${prev}、${tag}` : tag));
    };

    const handlePersonNamingTagClick = (tag: string) => {
        setPersonNamingTagInput(prev => (prev ? `${prev}、${tag}` : tag));
    };

    const handleGenerateNaming = async () => {
        const tags = namingTagInput?.trim();
        if (!tags) {
            message.warning('请先输入或选择文化标签');
            return;
        }

        setNamingGenLoading(true);
        try {
            const { name, faction_culture, description } = form.getFieldsValue(['name', 'faction_culture', 'description']);
            const res = await apiCalls.generateFactionGeoNamingRules({
                cultureTags: tags,
                factionName: name?.trim() || undefined,
                factionCulture: faction_culture?.trim() || undefined,
                description: description?.trim() || undefined,
            }) as { success?: boolean; data?: { geo_naming_habit: string; geo_naming_suffix: string; geo_naming_prohibition: string }; error?: string };

            if (res?.success && res.data) {
                form.setFieldsValue({
                    geo_naming_habit: res.data.geo_naming_habit,
                    geo_naming_suffix: res.data.geo_naming_suffix,
                    geo_naming_prohibition: res.data.geo_naming_prohibition,
                });
                message.success('命名规范已生成');
            } else {
                message.error(res?.error || '生成失败');
            }
        } catch (e: any) {
            console.error('生成命名规范失败：', e);
            message.error(e?.message || '生成失败，请稍后重试');
        } finally {
            setNamingGenLoading(false);
        }
    };

    const handleGeneratePersonNaming = async () => {
        const tags = personNamingTagInput?.trim();
        if (!tags) {
            message.warning('请先输入或选择文化标签');
            return;
        }
        setPersonNamingGenLoading(true);
        try {
            const { name, faction_culture, description } = form.getFieldsValue(['name', 'faction_culture', 'description']);
            const res = await apiCalls.generateFactionPersonNamingRules({
                cultureTags: tags,
                factionName: name?.trim() || undefined,
                factionCulture: faction_culture?.trim() || undefined,
                description: description?.trim() || undefined,
            }) as { success?: boolean; data?: { person_naming_habit: string; person_naming_suffix: string; person_naming_prohibition: string }; error?: string };
            if (res?.success && res.data) {
                form.setFieldsValue({
                    person_naming_habit: res.data.person_naming_habit,
                    person_naming_suffix: res.data.person_naming_suffix,
                    person_naming_prohibition: res.data.person_naming_prohibition,
                });
                message.success('人物命名规范已生成');
            } else {
                message.error(res?.error || '生成失败');
            }
        } catch (e: any) {
            console.error('生成人物命名规范失败：', e);
            message.error(e?.message || '生成失败，请稍后重试');
        } finally {
            setPersonNamingGenLoading(false);
        }
    };

    const handleGenerateEmbedDocument = async () => {
        try {
            const { description, parent_id } = form.getFieldsValue(['description', 'parent_id']);
            setEmbedLoading(true);
            const embedText = await generateFactionEmbedText({
                description: description || undefined,
                hasParent: !!parent_id,
            });
            form.setFieldsValue({ embed_document: embedText });
            message.success('嵌入文档生成成功');
        } catch (e: any) {
            console.error('生成嵌入文档失败：', e);
            message.error(e?.message || '生成嵌入文档失败');
        } finally {
            setEmbedLoading(false);
        }
    };

    const handlesubmit = async () => {
        try {
            const formValues = await form.validateFields();
            console.debug('formValues --> ', formValues);
            let values = {
                ...backupData,
                ...formValues
            } as IFactionDefData;

            if (values.id) {
                await apiCalls.updateFaction(values);
                message.success('阵营更新成功');
            } else {
                await apiCalls.addFaction(values);
                message.success('阵营创建成功');
            }

            setVisible(false);
            loadFactionList();
            
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    let isCreate = !backupData?.id;

    return (
        <Modal
            title={isCreate ? "新建阵营" : "编辑阵营"}
            open={visible}
            onOk={handlesubmit}
            onCancel={handleCancel}
            width={'60vw'}
        >
            <Form
                form={form}
                // layout="vertical"
                labelCol={{ span: 3 }}
                wrapperCol={{ span: 20 }}
                initialValues={initialValues}
            >

                <Form.Item
                    name="worldview_id"
                    label="世界观"
                    rules={[{ required: true, message: '请选择世界观' }]}
                >
                    <Select options={worldViewList.map(item => ({ label: item.title, value: item.id }))} />
                </Form.Item>

                <Form.Item
                    name="parent_id"
                    label="上级阵营"
                >
                    <TreeSelect
                        treeData={factionTree}
                        fieldNames={{ label: 'name', value: 'id' }}
                        placeholder="请选择上级阵营"
                        allowClear
                    />
                </Form.Item>

                <Form.Item
                    name="name"
                    label="阵营名称"
                    rules={[{ required: true, message: '请输入阵营名称' }]}
                >
                    <Input placeholder="请输入阵营名称" />
                </Form.Item>

                <Form.Item
                    name="description"
                    label="阵营描述"
                >
                    <Input.TextArea
                        autoSize={{ minRows: 6 }}
                        placeholder="请输入阵营描述"
                    />
                </Form.Item>

                <Form.Item name="faction_type" label="阵营类型">
                    <Input placeholder="阵营类型" />
                </Form.Item>

                <Form.Item name="faction_culture" label="阵营文化">
                    <Input.TextArea rows={2} placeholder="阵营文化" />
                </Form.Item>

                <Form.Item name="ideology_or_meme" label="意识形态/梗文化">
                    <Input.TextArea rows={2} placeholder="输出或用于整活的文化" />
                </Form.Item>

                <Form.Item name="scale_of_operation" label="决策尺度">
                    <Select options={SCALE_OF_OPERATION_OPTIONS} placeholder="地区级、大陆级、行星级、多星级、文明级" allowClear />
                </Form.Item>

                <Form.Item name="decision_taboo" label="决策禁忌">
                    <Input.TextArea rows={2} placeholder="阵营绝不会做的事情" />
                </Form.Item>

                <Form.Item name="primary_threat_model" label="最大威胁来源">
                    <Input placeholder="最大威胁来源" />
                </Form.Item>

                <Form.Item name="internal_contradictions" label="内部矛盾">
                    <Input.TextArea rows={2} placeholder="阵营内部允许被公开展示的矛盾" />
                </Form.Item>

                <Form.Item name="legitimacy_source" label="正统来源">
                    <Input placeholder="阵营正统来源" />
                </Form.Item>

                <Form.Item name="known_dysfunctions" label="已知功能障碍">
                    <Input.TextArea rows={2} placeholder="阵营创伤后遗症" />
                </Form.Item>

                <Divider orientation="left" plain>地理·命名规范</Divider>

                <Form.Item label="快速生成">
                    <div
                        style={{
                            padding: 16,
                            border: '1px dashed #d9d9d9',
                            borderRadius: 8,
                            background: '#fafafa',
                        }}
                    >
                        <Flex vertical gap={12}>
                            <Flex vertical gap={10}>
                                {NAMING_CULTURE_TAG_GROUPS.map(group => (
                                    <div key={group.label}>
                                        <span style={{ marginRight: 8, color: 'rgba(0,0,0,0.45)', fontSize: 12, fontWeight: 500 }}>
                                            {group.label}：
                                        </span>
                                        <Space size={[8, 8]} wrap style={{ marginTop: 4 }}>
                                            {group.tags.map(tag => (
                                                <Button key={tag} size="small" onClick={() => handleNamingTagClick(tag)}>
                                                    {tag}
                                                </Button>
                                            ))}
                                        </Space>
                                    </div>
                                ))}
                            </Flex>
                            <Space.Compact style={{ width: '100%', maxWidth: 560 }}>
                                <Input
                                    placeholder="输入或选择文化标签，用于生成命名规范"
                                    value={namingTagInput}
                                    onChange={e => setNamingTagInput(e.target.value)}
                                    allowClear
                                    style={{ flex: 1 }}
                                />
                                <Select
                                    value={namingLlmProvider}
                                    onChange={setNamingLlmProvider}
                                    options={NAMING_LLM_OPTIONS}
                                    style={{ width: 120 }}
                                />
                                <Button
                                    type="primary"
                                    icon={<ThunderboltOutlined />}
                                    loading={namingGenLoading}
                                    onClick={handleGenerateNaming}
                                >
                                    生成
                                </Button>
                            </Space.Compact>
                        </Flex>
                    </div>
                </Form.Item>

                <Form.Item name="geo_naming_habit" label="地理·命名习惯">
                    <Input.TextArea rows={2} placeholder="风格、偏好、通用要求（如：唐风、简短、OOC）" />
                </Form.Item>

                <Form.Item name="geo_naming_suffix" label="地理·命名后缀">
                    <Input.TextArea rows={2} placeholder="后缀及层级对应（如：道/州/郡/市/县）" />
                </Form.Item>

                <Form.Item name="geo_naming_prohibition" label="地理·命名禁忌">
                    <Input.TextArea rows={2} placeholder="严禁事项（如：禁界、禁京都、禁神话倾向）" />
                </Form.Item>

                <Divider orientation="left" plain>人物·命名规范</Divider>

                <Form.Item label="快速生成">
                    <div
                        style={{
                            padding: 16,
                            border: '1px dashed #d9d9d9',
                            borderRadius: 8,
                            background: '#fafafa',
                        }}
                    >
                        <Flex vertical gap={12}>
                            <Flex vertical gap={10}>
                                {NAMING_CULTURE_TAG_GROUPS.map(group => (
                                    <div key={group.label}>
                                        <span style={{ marginRight: 8, color: 'rgba(0,0,0,0.45)', fontSize: 12, fontWeight: 500 }}>
                                            {group.label}：
                                        </span>
                                        <Space size={[8, 8]} wrap style={{ marginTop: 4 }}>
                                            {group.tags.map(tag => (
                                                <Button key={tag} size="small" onClick={() => handlePersonNamingTagClick(tag)}>
                                                    {tag}
                                                </Button>
                                            ))}
                                        </Space>
                                    </div>
                                ))}
                            </Flex>
                            <Space.Compact style={{ width: '100%', maxWidth: 560 }}>
                                <Input
                                    placeholder="输入或选择文化标签，用于生成人物命名规范"
                                    value={personNamingTagInput}
                                    onChange={e => setPersonNamingTagInput(e.target.value)}
                                    allowClear
                                    style={{ flex: 1 }}
                                />
                                <Select
                                    value={namingLlmProvider}
                                    onChange={setNamingLlmProvider}
                                    options={NAMING_LLM_OPTIONS}
                                    style={{ width: 120 }}
                                />
                                <Button
                                    type="primary"
                                    icon={<ThunderboltOutlined />}
                                    loading={personNamingGenLoading}
                                    onClick={handleGeneratePersonNaming}
                                >
                                    生成
                                </Button>
                            </Space.Compact>
                        </Flex>
                    </div>
                </Form.Item>

                <Form.Item name="person_naming_habit" label="人物·命名习惯">
                    <Input.TextArea rows={2} placeholder="风格、偏好、通用要求（如：唐风姓+单字名、和风姓+名）" />
                </Form.Item>

                <Form.Item name="person_naming_suffix" label="人物·命名后缀">
                    <Input.TextArea rows={2} placeholder="尊称、辈分、职位后缀等（如：字/号、君/殿、阁下）" />
                </Form.Item>

                <Form.Item name="person_naming_prohibition" label="人物·命名禁忌">
                    <Input.TextArea rows={2} placeholder="严禁用于人名的字或风格（如：禁现代网红名、禁与历史名人重名）" />
                </Form.Item>

                <Form.Item label="嵌入文档">
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Button
                            icon={<EditOutlined />}
                            loading={embedLoading}
                            onClick={handleGenerateEmbedDocument}
                        >
                            生成嵌入文档
                        </Button>
                        <Form.Item name="embed_document" noStyle>
                            <Input.TextArea
                                rows={4}
                                placeholder="根据阵营描述生成或手动输入嵌入文档，用于向量检索"
                            />
                        </Form.Item>
                    </Space>
                </Form.Item>
            </Form>
        </Modal>
    );
});

FactionEdit.displayName = 'FactionEdit';

export default FactionEdit;
