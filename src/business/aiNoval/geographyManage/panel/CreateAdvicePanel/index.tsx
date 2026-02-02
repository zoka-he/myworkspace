import { useState, useMemo } from "react";
import { 
    Alert, 
    Button, 
    Card, 
    Collapse, 
    Divider, 
    Form, 
    Input, 
    List, 
    Modal, 
    Space, 
    Tag, 
    Tooltip, 
    TreeSelect, 
    Typography, 
    message 
} from "antd";
import { 
    BulbOutlined, 
    CheckOutlined, 
    CloseOutlined, 
    ReloadOutlined, 
    RocketOutlined, 
    ThunderboltOutlined 
} from "@ant-design/icons";
import { useSimpleWorldviewContext } from "../../../common/SimpleWorldviewProvider";
import { useGeoData } from "../../GeoDataProvider";
import { useSimpleFactionContext } from "../../../common/SimpleFactionProvider";
import type { IGeoTreeItem } from "../../geoTree";
import type { IGeoUnionData, IFactionDefData } from "@/src/types/IAiNoval";
import apiCalls from "../../apiCalls";
import type { ApiResponse } from "@/src/types/ApiResponse";

const { TextArea } = Input;
const { Text } = Typography;

// 解析 TreeSelect treeCheckable 的 value（可能为 number[]、string[] 或 { value, label }[]）
function parseRelatedFactionIds(raw: unknown): number[] {
    const ids: number[] = [];
    if (!Array.isArray(raw)) return ids;
    raw.forEach((item: unknown) => {
        const id = typeof item === 'object' && item !== null && 'value' in item
            ? (item as { value: unknown }).value
            : item;
        const num = typeof id === 'number' ? id : Number(id);
        if (!Number.isNaN(num)) ids.push(num);
    });
    return ids;
}

// 地理树转为 TreeSelect 数据
function geoTreeToTreeSelect(nodes: IGeoTreeItem<IGeoUnionData>[] | null | undefined): { title: string; value: string; key: string; children?: any[] }[] {
    if (!nodes?.length) return [];
    return nodes.map(node => ({
        title: (node.data as IGeoUnionData)?.name || node.title || '-',
        value: (node.data as IGeoUnionData)?.code || node.key || '',
        key: (node.data as IGeoUnionData)?.code || node.key || '',
        children: node.children?.length ? geoTreeToTreeSelect(node.children as IGeoTreeItem<IGeoUnionData>[]) : undefined,
    }));
}

// 生成建议项
interface IAdviceItem {
    id: string;
    name: string;
    description?: string;
    status: 'pending' | 'accepted' | 'rejected';
}

// 落选项
interface IRejectedItem {
    id: string;
    name: string;
    reason: string;
}

export default function CreateAdvicePanel() {
    const { state: worldviewState } = useSimpleWorldviewContext();
    const worldViewId = worldviewState?.worldviewId;
    const { state: geoDataState } = useGeoData();
    const { state: factionState } = useSimpleFactionContext();

    // 基础参数表单
    const [baseForm] = Form.useForm();

    // 命名约束表单
    const [constraintForm] = Form.useForm();

    // 状态
    const [contextLoading, setContextLoading] = useState(false);
    const [constraintLoading, setConstraintLoading] = useState(false);
    const [generateLoading, setGenerateLoading] = useState(false);

    // 地理树、阵营树（多选 TreeSelect 用）
    const geoTreeSelectData = useMemo(
        () => geoTreeToTreeSelect(geoDataState.geoTree),
        [geoDataState.geoTree]
    );

    // 监听相关阵营变化，用于「从相关阵营生成」按钮的 disabled 状态
    const relatedFactionIdsValue = Form.useWatch('relatedFactionIds', baseForm);
    const hasRelatedFactions = parseRelatedFactionIds(relatedFactionIdsValue).length > 0;
    const [adviceList, setAdviceList] = useState<IAdviceItem[]>([]);
    const [rejectedList, setRejectedList] = useState<IRejectedItem[]>([]);

    // 落选弹窗
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [rejectingItem, setRejectingItem] = useState<IAdviceItem | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    // 从相关阵营生成命名权来源（程序化）
    function handleGenerateNamingSource() {
        const relatedFactionIds = parseRelatedFactionIds(baseForm.getFieldValue('relatedFactionIds'));
        if (!relatedFactionIds.length) {
            message.warning('请先选择相关阵营');
            return;
        }
        const names = relatedFactionIds
            .map(id => factionState.factionList.find((f: IFactionDefData) => f.id === id || f.id === Number(id))?.name)
            .filter(Boolean)
            .join('、');
        baseForm.setFieldValue('namingSource', names);
        message.success('已从相关阵营生成');
    }

    // LLM1：生成情境与基础参数（区域特征、命名背景）
    async function handleGenerateContext() {
        if (!worldViewId) {
            message.warning('请先选择世界观');
            return;
        }

        const locationType = baseForm.getFieldValue('locationType');
        if (!locationType?.trim()) {
            message.warning('请先填写地点类型');
            return;
        }

        const parentGeoCode = baseForm.getFieldValue('parentGeoCode') as string | undefined;
        const adjacentGeoCodes = baseForm.getFieldValue('adjacentGeoCodes') as string[] | undefined;
        const relatedFactionIds = parseRelatedFactionIds(baseForm.getFieldValue('relatedFactionIds'));

        const parentGeo = parentGeoCode
            ? geoDataState.geoData.find(g => g.code === parentGeoCode)
            : null;
        const adjacentGeos = (adjacentGeoCodes || [])
            .map(code => geoDataState.geoData.find((g: IGeoUnionData) => g.code === code))
            .filter((g): g is IGeoUnionData => !!g)
            .map(g => ({ name: g.name || '-', description: g.description || undefined }));
        const relatedFactions = relatedFactionIds
            .map(id => factionState.factionList.find((f: IFactionDefData) => f.id === id || f.id === Number(id)))
            .filter((f): f is IFactionDefData => !!f)
            .map(f => ({
                name: f.name || '-',
                description: f.description ? String(f.description).slice(0, 500) : undefined,
            }));

        setContextLoading(true);
        try {
            const response = await apiCalls.generateGeoContext({
                locationType: locationType.trim(),
                parentGeo: parentGeo ? { name: parentGeo.name || '-', description: parentGeo.description || undefined } : null,
                adjacentGeos: adjacentGeos.length ? adjacentGeos : null,
                relatedFactions: relatedFactions.length ? relatedFactions : null,
            });
            const result = response as unknown as ApiResponse<{ regionFeature: string; namingBackground: string }>;

            if (result?.success && result.data) {
                baseForm.setFieldsValue({
                    regionFeature: result.data.regionFeature,
                    namingBackground: result.data.namingBackground,
                });
                message.success('情境与基础参数已生成');
            } else {
                message.error(result?.error || '生成失败');
            }
        } catch (error: any) {
            console.error('生成情境与基础参数失败:', error);
            message.error(error?.message || '生成失败，请稍后重试');
        } finally {
            setContextLoading(false);
        }
    }

    // LLM2：生成命名约束
    async function handleGenerateConstraint() {
        if (!worldViewId) {
            message.warning('请先选择世界观');
            return;
        }

        const { locationType, regionFeature, namingBackground, namingSource } = baseForm.getFieldsValue();
        if (!locationType?.trim()) {
            message.warning('请先填写地点类型');
            return;
        }
        if (!regionFeature?.trim()) {
            message.warning('请先填写区域特征');
            return;
        }
        if (!namingSource?.trim()) {
            message.warning('请先填写命名权来源');
            return;
        }

        const relatedFactionIds = parseRelatedFactionIds(baseForm.getFieldValue('relatedFactionIds'));
        const adjacentGeoCodes = baseForm.getFieldValue('adjacentGeoCodes') as string[] | undefined;

        const relatedFactions = relatedFactionIds
            .map(id => factionState.factionList.find((f: IFactionDefData) => f.id === id || f.id === Number(id)))
            .filter((f): f is IFactionDefData => !!f)
            .map(f => ({
                name: f.name || '-',
                geo_naming_habit: f.geo_naming_habit || undefined,
                geo_naming_suffix: f.geo_naming_suffix || undefined,
                geo_naming_prohibition: f.geo_naming_prohibition || undefined,
            }));

        const adjacentGeos = (adjacentGeoCodes || [])
            .map((code: string) => geoDataState.geoData.find((g: IGeoUnionData) => g.code === code))
            .filter((g): g is IGeoUnionData => !!g)
            .map(g => ({ name: g.name || '-' }));

        setConstraintLoading(true);
        try {
            const response = await apiCalls.generateNamingConstraint({
                locationType: locationType.trim(),
                regionFeature: regionFeature?.trim() || '',
                namingBackground: namingBackground?.trim() || '',
                namingSource: namingSource?.trim() || '',
                relatedFactions: relatedFactions.length ? relatedFactions : null,
                adjacentGeos: adjacentGeos.length ? adjacentGeos : null,
            });
            const result = response as unknown as ApiResponse<{
                namingHabit: string;
                specialRequirement: string;
                specialSuffix: string;
                prohibition: string;
            }>;

            if (result?.success && result.data) {
                constraintForm.setFieldsValue({
                    namingHabit: result.data.namingHabit,
                    specialRequirement: result.data.specialRequirement,
                    specialSuffix: result.data.specialSuffix,
                    prohibition: result.data.prohibition,
                });
                message.success('命名约束已生成');
            } else {
                message.error(result?.error || '生成失败');
            }
        } catch (error: any) {
            console.error('生成命名约束失败:', error);
            message.error(error?.message || '生成失败，请稍后重试');
        } finally {
            setConstraintLoading(false);
        }
    }

    // 生成建议（调用 Dify 工作流）；先通过 FindGeo/FindFaction 收集需避免重名的名称
    async function handleGenerateAdvice() {
        if (!worldViewId) {
            message.warning('请先选择世界观');
            return;
        }

        try {
            await baseForm.validateFields();
        } catch {
            message.warning('请填写基础参数');
            return;
        }

        const baseValues = baseForm.getFieldsValue();
        const constraintValues = constraintForm.getFieldsValue();
        const adjacentGeoCodes = baseValues.adjacentGeoCodes as string[] | undefined;
        const adjacentGeoNames = (adjacentGeoCodes || [])
            .map((code: string) => geoDataState.geoData.find((g: IGeoUnionData) => g.code === code)?.name)
            .filter(Boolean)
            .join('、');

        // 用 FindGeo、FindFaction 拉取已有地名/势力名，用于避免重名
        const locationType = baseValues.locationType?.trim() || '';
        const regionFeature = baseValues.regionFeature?.trim() || '';
        const namingSource = baseValues.namingSource?.trim() || '';
        const keywords = [locationType, namingSource].filter(Boolean);
        if (regionFeature) keywords.push(regionFeature.slice(0, 30));
        let excludeNamesList: string[] = [];
        try {
            const [geoRes, factionRes] = await Promise.all([
                keywords.length ? apiCalls.findGeo(worldViewId, keywords, 0.5) : Promise.resolve({ success: true, data: [] }),
                keywords.length ? apiCalls.findFaction(worldViewId, keywords, 0.5) : Promise.resolve({ success: true, data: [] }),
            ]);
            const geoData = (geoRes as unknown as ApiResponse<Array<{ name?: string }>>)?.data || [];
            const factionData = (factionRes as unknown as ApiResponse<Array<{ name?: string }>>)?.data || [];
            geoData.forEach((g: { name?: string }) => g?.name && excludeNamesList.push(String(g.name).trim()));
            factionData.forEach((f: { name?: string }) => f?.name && excludeNamesList.push(String(f.name).trim()));
        } catch (_e) {
            // 拉取失败不阻断生成，仅不传 excludeNames
        }
        const excludeNames = Array.from(new Set(excludeNamesList)).filter(Boolean).join('、') || undefined;

        setGenerateLoading(true);
        try {
            const response = await apiCalls.generateGeoNames({
                worldview_id: worldViewId,
                locationType,
                regionFeature,
                namingBackground: baseValues.namingBackground?.trim() || '',
                namingSource,
                namingHabit: constraintValues.namingHabit?.trim() || '',
                specialRequirement: constraintValues.specialRequirement?.trim() || '',
                specialSuffix: constraintValues.specialSuffix?.trim() || '',
                prohibition: constraintValues.prohibition?.trim() || '',
                adjacentGeoNames: adjacentGeoNames || undefined,
                excludeNames,
            });
            const result = response as unknown as ApiResponse<{ items: { id: string; name: string; description?: string }[] }>;

            if (result?.success && result.data?.items) {
                const items: IAdviceItem[] = result.data.items.map(item => ({
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    status: 'pending' as const,
                }));
                setAdviceList(items);
                message.success(`已生成 ${items.length} 个候选地名`);
            } else {
                message.error(result?.error || '生成失败');
                if (result?.data?.items && result.data.items.length === 0) {
                    message.info('Dify 返回为空，可能输出格式无法解析，请检查工作流配置');
                }
            }
        } catch (error: any) {
            console.error('生成建议失败:', error);
            message.error(error?.message || '生成失败，请稍后重试');
        } finally {
            setGenerateLoading(false);
        }
    }

    // 采纳建议
    function handleAccept(item: IAdviceItem) {
        setAdviceList(prev => 
            prev.map(i => i.id === item.id ? { ...i, status: 'accepted' } : i)
        );
        message.success(`已采纳：${item.name}`);
    }

    // 打开落选弹窗
    function handleOpenRejectModal(item: IAdviceItem) {
        setRejectingItem(item);
        setRejectReason('');
        setRejectModalVisible(true);
    }

    // 确认落选
    function handleConfirmReject() {
        if (!rejectingItem) return;
        
        if (!rejectReason.trim()) {
            message.warning('请填写落选理由');
            return;
        }

        // 更新建议列表状态
        setAdviceList(prev => 
            prev.map(i => i.id === rejectingItem.id ? { ...i, status: 'rejected' } : i)
        );

        // 添加到落选名单
        setRejectedList(prev => [
            ...prev,
            {
                id: rejectingItem.id,
                name: rejectingItem.name,
                reason: rejectReason.trim(),
            }
        ]);

        setRejectModalVisible(false);
        setRejectingItem(null);
        setRejectReason('');
        message.info(`已落选：${rejectingItem.name}`);
    }

    // 从落选名单移除
    function handleRemoveRejected(id: string) {
        setRejectedList(prev => prev.filter(i => i.id !== id));
        // 恢复为待定状态
        setAdviceList(prev => 
            prev.map(i => i.id === id ? { ...i, status: 'pending' } : i)
        );
    }

    // 渲染状态标签
    function renderStatusTag(status: IAdviceItem['status']) {
        switch (status) {
            case 'accepted':
                return <Tag color="success">已采纳</Tag>;
            case 'rejected':
                return <Tag color="error">已落选</Tag>;
            default:
                return <Tag color="default">待定</Tag>;
        }
    }

    const formLayout = {
        labelCol: { span: 4 },
        wrapperCol: { span: 20 },
    };

    return (
        <div className="f-fit-height" style={{ padding: 16, overflow: 'auto' }}>
            {/* 一、基础参数 */}
            <Card 
                size="small" 
                title={<><BulbOutlined /> 基础参数</>}
                extra={
                    <Tooltip title="根据上方选择的上级地点、相邻地点、地点类型，LLM 自动生成「区域特征」和「命名背景」">
                        <Button 
                            type="primary"
                            size="small"
                            icon={<ThunderboltOutlined />}
                            onClick={handleGenerateContext}
                            loading={contextLoading}
                            disabled={!worldViewId}
                        >
                            生成情境与基础参数
                        </Button>
                    </Tooltip>
                }
                style={{ marginBottom: 16 }}
            >
                <Alert
                    message="先选择/填写下方「上下文」和「地点类型」，再点击右上角按钮，可自动生成「区域特征」「命名背景」；「命名权来源」可由「从相关阵营生成」按钮填充。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
                <Form form={baseForm} {...formLayout}>
                    <Divider orientation="left" plain>上下文（用户选择）</Divider>
                    <Form.Item name="parentGeoCode" label="上级地点">
                        <TreeSelect
                            placeholder="选择上级地点（可选）"
                            treeData={geoTreeSelectData}
                            allowClear
                            treeDefaultExpandAll
                            showSearch
                            treeNodeFilterProp="title"
                            style={{ width: 320 }}
                        />
                    </Form.Item>
                    <Form.Item name="adjacentGeoCodes" label="相邻地点">
                        <TreeSelect
                            placeholder="选择相邻地点（可选）"
                            treeData={geoTreeSelectData}
                            allowClear
                            treeDefaultExpandAll
                            showSearch
                            treeNodeFilterProp="title"
                            treeCheckable
                            treeCheckStrictly
                            showCheckedStrategy={TreeSelect.SHOW_ALL}
                            style={{ width: 320 }}
                        />
                    </Form.Item>
                    <Form.Item name="relatedFactionIds" label="相关阵营">
                        <TreeSelect
                            placeholder="选择相关阵营（可选）"
                            treeData={factionState.factionTree || []}
                            fieldNames={{ label: 'title', value: 'value', children: 'children' }}
                            allowClear
                            treeDefaultExpandAll
                            showSearch
                            treeNodeFilterProp="title"
                            treeCheckable
                            treeCheckStrictly
                            showCheckedStrategy={TreeSelect.SHOW_ALL}
                            style={{ width: 320 }}
                        />
                    </Form.Item>
                    <Form.Item 
                        name="locationType" 
                        label="地点类型" 
                        rules={[{ required: true, message: '请输入地点类型' }]}
                    >
                        <Input placeholder="如：山脉、城市、恒星间转移轨道..." style={{ width: 280 }} allowClear />
                    </Form.Item>

                    <Divider orientation="left" plain>情境描述（LLM 可生成 或 手动填写）</Divider>
                    <Form.Item 
                        name="regionFeature" 
                        label={
                            <Tooltip title="点击右上角「生成情境与基础参数」按钮，LLM 将根据上下文和地点类型自动填充">
                                <span>区域特征 <Text type="secondary" style={{ fontSize: 12 }}>（LLM 可生成）</Text></span>
                            </Tooltip>
                        }
                        rules={[{ required: true, message: '请填写或点击生成' }]}
                    >
                        <TextArea 
                            rows={2} 
                            placeholder="描述该区域的地理、气候、环境等特征。可点击右上角按钮由 LLM 自动生成"
                        />
                    </Form.Item>
                    <Form.Item 
                        name="namingBackground" 
                        label={
                            <Tooltip title="点击右上角「生成情境与基础参数」按钮，LLM 将根据上下文和地点类型自动填充">
                                <span>命名背景 <Text type="secondary" style={{ fontSize: 12 }}>（LLM 可生成）</Text></span>
                            </Tooltip>
                        }
                    >
                        <TextArea 
                            rows={2} 
                            placeholder="命名的历史背景、文化渊源等。可点击右上角按钮由 LLM 自动生成"
                        />
                    </Form.Item>

                    <Form.Item 
                        label={
                            <Tooltip title="选择相关阵营后，点击「从相关阵营生成」可自动拼接阵营名称填充">
                                <span>命名权来源 <Text type="secondary" style={{ fontSize: 12 }}>（按钮可生成）</Text></span>
                            </Tooltip>
                        } 
                        required
                    >
                        <Space.Compact style={{ width: 360 }}>
                            <Button 
                                onClick={handleGenerateNamingSource}
                                disabled={!hasRelatedFactions}
                            >
                                从相关阵营生成
                            </Button>
                            <Form.Item 
                                name="namingSource" 
                                noStyle 
                                rules={[{ required: true, message: '请填写或生成' }]}
                            >
                                <Input placeholder="选择相关阵营后点击左侧按钮生成，或手动输入" style={{ flex: 1 }} />
                            </Form.Item>
                        </Space.Compact>
                    </Form.Item>
                </Form>
            </Card>

            {/* 二、命名约束 */}
            <Card 
                size="small" 
                title={<><BulbOutlined /> 命名约束</>}
                extra={
                    <Button 
                        type="primary"
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={handleGenerateConstraint}
                        loading={constraintLoading}
                        disabled={!worldViewId}
                    >
                        生成命名约束
                    </Button>
                }
                style={{ marginBottom: 16 }}
            >
                <Form form={constraintForm} {...formLayout}>
                    <Form.Item name="namingHabit" label="阵营命名习惯">
                        <TextArea 
                            rows={2} 
                            placeholder="Agent 将根据世界观设定自动生成，也可手动填写"
                        />
                    </Form.Item>
                    <Form.Item name="specialRequirement" label="特殊要求">
                        <TextArea 
                            rows={2} 
                            placeholder="对地名的特殊要求"
                        />
                    </Form.Item>
                    <Form.Item name="specialSuffix" label="特殊后缀">
                        <TextArea 
                            rows={2} 
                            placeholder="常用的地名后缀"
                        />
                    </Form.Item>
                    <Form.Item name="prohibition" label="严禁事项">
                        <TextArea 
                            rows={2} 
                            placeholder="命名时需要避免的事项"
                        />
                    </Form.Item>
                </Form>
            </Card>

            {/* 三、生成与结果 */}
            <Card 
                size="small" 
                title={<><RocketOutlined /> 生成与结果</>}
                extra={
                    <Button 
                        type="primary"
                        icon={<RocketOutlined />}
                        onClick={handleGenerateAdvice}
                        loading={generateLoading}
                        disabled={!worldViewId}
                    >
                        生成建议
                    </Button>
                }
            >
                {/* 结果列表 */}
                {adviceList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                        <Text type="secondary">暂无数据，请先填写参数并生成建议</Text>
                    </div>
                ) : (
                    <List
                        size="small"
                        dataSource={adviceList}
                        renderItem={(item) => (
                            <List.Item
                                actions={
                                    item.status === 'pending' ? [
                                        <Button 
                                            key="accept"
                                            type="link" 
                                            size="small"
                                            icon={<CheckOutlined />}
                                            onClick={() => handleAccept(item)}
                                        >
                                            采纳
                                        </Button>,
                                        <Button 
                                            key="reject"
                                            type="link" 
                                            size="small"
                                            danger
                                            icon={<CloseOutlined />}
                                            onClick={() => handleOpenRejectModal(item)}
                                        >
                                            落选
                                        </Button>
                                    ] : []
                                }
                            >
                                <List.Item.Meta
                                    title={
                                        <Space>
                                            <Text strong>{item.name}</Text>
                                            {renderStatusTag(item.status)}
                                        </Space>
                                    }
                                    description={item.description}
                                />
                            </List.Item>
                        )}
                    />
                )}

                {/* 落选名单 - 折叠面板 */}
                {rejectedList.length > 0 && (
                    <>
                        <Divider style={{ margin: '16px 0' }} />
                        <Collapse 
                            size="small"
                            items={[
                                {
                                    key: 'rejected',
                                    label: <Text type="secondary">落选设定及理由（{rejectedList.length}）</Text>,
                                    children: (
                                        <List
                                            size="small"
                                            dataSource={rejectedList}
                                            renderItem={(item) => (
                                                <List.Item
                                                    actions={[
                                                        <Button 
                                                            key="remove"
                                                            type="link" 
                                                            size="small"
                                                            onClick={() => handleRemoveRejected(item.id)}
                                                        >
                                                            撤销
                                                        </Button>
                                                    ]}
                                                >
                                                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                                                        <Text delete>{item.name}</Text>
                                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                                            理由：{item.reason}
                                                        </Text>
                                                    </Space>
                                                </List.Item>
                                            )}
                                        />
                                    ),
                                }
                            ]}
                        />
                    </>
                )}
            </Card>

            {/* 落选理由弹窗 */}
            <Modal
                title={`落选：${rejectingItem?.name || ''}`}
                open={rejectModalVisible}
                onOk={handleConfirmReject}
                onCancel={() => setRejectModalVisible(false)}
                okText="确认落选"
                cancelText="取消"
            >
                <Form layout="vertical">
                    <Form.Item label="落选理由" required>
                        <TextArea
                            rows={3}
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="请输入落选理由，如：与已有地名风格不符、命名过于现代化..."
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
