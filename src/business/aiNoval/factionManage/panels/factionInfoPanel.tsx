import { Button, Card, Descriptions, Divider, message, Table, Typography } from 'antd';
import { FactionRelationType, IFactionDefData, IFactionRelation } from '@/src/types/IAiNoval';
import { EditOutlined } from '@ant-design/icons';
import FactionRecallTest from './factionRecallTest';
import { useCurrentFactionId, useCurrentFaction, useGetEditModal, useWorldViewId } from '../FactionManageContext';
import FactionEmbedPanel from './factionEmbedPanel';
import { useState } from 'react';
import { useEffect } from 'react';
import apiCalls from '../apiCalls';
import { getRelationTypeText } from '../utils/relationTypeMap';

// interface FactionInfoPanelProps {
//     worldViewId?: number | null;
// }

export default function FactionInfoPanel() {
    const currentFactionId = useCurrentFactionId();
    const currentFaction = useCurrentFaction();
    const getEditModal = useGetEditModal();
    const worldViewId = useWorldViewId();

    function handleEdit() {
        getEditModal()?.showAndEdit(currentFaction as IFactionDefData);
    }

    if (!currentFaction) {
        return <div>请选择阵营</div>;
    }

    let recommandQuery = [currentFaction.name || '', '设定'].join(' ');

    return (
        <div className="f-fit-height" style={{ overflow: 'auto' }}>
            <Typography.Title level={3}>
                {currentFaction.name || '-'}
                <Button
                    type="text" size="small"
                    icon={<EditOutlined />}
                    style={{ marginLeft: '8px', color: '#1890ff' }}
                    onClick={handleEdit}
                >编辑</Button>
            </Typography.Title>
            <Typography.Paragraph style={{ fontSize: '12px' }}>
                <pre style={{ minHeight: '10em' }}>{currentFaction.description || '-'}</pre>
            </Typography.Paragraph>


            <Descriptions title="阵营属性" column={1} size="small" bordered style={{ marginTop: 16 }} styles={{ label: { width: '100px' } }}>
                <Descriptions.Item label="阵营类型">{currentFaction.faction_type || '-'}</Descriptions.Item>
                <Descriptions.Item label="阵营文化">{currentFaction.faction_culture || '-'}</Descriptions.Item>
                <Descriptions.Item label="意识形态/梗文化">{currentFaction.ideology_or_meme || '-'}</Descriptions.Item>
                <Descriptions.Item label="决策尺度">{currentFaction.scale_of_operation || '-'}</Descriptions.Item>
                <Descriptions.Item label="决策禁忌">{currentFaction.decision_taboo || '-'}</Descriptions.Item>
                <Descriptions.Item label="最大威胁来源">{currentFaction.primary_threat_model || '-'}</Descriptions.Item>
                <Descriptions.Item label="内部矛盾">{currentFaction.internal_contradictions || '-'}</Descriptions.Item>
                <Descriptions.Item label="正统来源">{currentFaction.legitimacy_source || '-'}</Descriptions.Item>
                <Descriptions.Item label="PTSD">{currentFaction.known_dysfunctions || '-'}</Descriptions.Item>
            </Descriptions>

            <Divider orientation="left" plain>地理·命名规范</Divider>

            <Descriptions column={1} size="small" bordered style={{ marginTop: 8 }} styles={{ label: { width: '100px' } }}>
                <Descriptions.Item label="地理·命名习惯">{currentFaction.geo_naming_habit || '-'}</Descriptions.Item>
                <Descriptions.Item label="地理·命名后缀">{currentFaction.geo_naming_suffix || '-'}</Descriptions.Item>
                <Descriptions.Item label="地理·命名禁忌">{currentFaction.geo_naming_prohibition || '-'}</Descriptions.Item>
            </Descriptions>

            <FactionEmbedPanel factionData={currentFaction} style={{ marginTop: 16 }} />
        
            <Divider>阵营关系</Divider>

            <FactionRelationList factionId={currentFaction.id || null} />

            {/* <Typography.Title level={4}>知识库召回测试</Typography.Title> */}
                
            {/* <FactionRecallTest worldViewId={worldViewId} recommandQuery={recommandQuery} /> */}
        </div>
    );
}

function FactionRelationList({ factionId }: { factionId?: number | null }) {
    const [relations, setRelations] = useState<IFactionRelation[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchRelations()
    }, [factionId])

    const fetchRelations = async () => {
        if (!factionId) { 
            setRelations([])
            return;
        }

        setLoading(true)
        try {
            const response = await apiCalls.getUsableFactionRelationsById(factionId)
            // 兼容数组和对象两种响应格式
            const data = Array.isArray(response) ? response : (response.data || [])
            setRelations(data)
        } catch (error) {
            message.error('获取关系列表失败')
            console.error('Failed to fetch relations:', error)
        } finally {
            setLoading(false)
        }
    }

    function renderRelationType(relationType: FactionRelationType) {
        return getRelationTypeText(relationType)
    }

    return (
        <div>
            <Table dataSource={relations} loading={loading} rowKey="id">
                <Table.Column title="来源阵营" dataIndex="source_faction_name" key="source_faction_name" />
                <Table.Column title="目标阵营" dataIndex="target_faction_name" key="target_faction_name" />
                <Table.Column title="关系类型（目标是来源的什么？）" dataIndex="relation_type" key="relation_type" render={renderRelationType} />
                <Table.Column title="关系说明" dataIndex="description" key="description" />
            </Table>
        </div>
    )
}
