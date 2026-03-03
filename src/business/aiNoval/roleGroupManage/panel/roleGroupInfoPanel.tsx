import { Button, Descriptions, Empty, Tag, Typography } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { IRoleGroup, IRoleGroupMember, ROLE_GROUP_TYPES, ROLE_GROUP_STATUSES } from '@/src/types/IAiNoval';
import { useCurrentRoleGroup, useCurrentRoleGroupId } from '../RoleGroupManageContext';
import { RoleGroupEditRef } from '../edit/roleGroupEdit';

interface RoleGroupInfoPanelProps {
    editRef: React.RefObject<RoleGroupEditRef | null>;
    onRefresh?: () => void;
}

function getGroupTypeLabel(value: string | null | undefined) {
    if (!value) return '-';
    return ROLE_GROUP_TYPES.find((t) => t.value === value)?.label ?? value;
}

function getGroupStatusLabel(value: string | null | undefined) {
    if (!value) return '-';
    return ROLE_GROUP_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export default function RoleGroupInfoPanel({ editRef, onRefresh }: RoleGroupInfoPanelProps) {
    const [currentId] = useCurrentRoleGroupId();
    const current = useCurrentRoleGroup();

    const handleEdit = () => {
        if (!current) return;
        editRef.current?.showAndEdit(current);
    };

    if (!current) {
        return (
            <div style={{ padding: 24 }}>
                <Empty description="请从左侧选择或新建角色组" />
            </div>
        );
    }

    const members = (current.members || []) as (IRoleGroupMember & { name_in_worldview?: string })[];

    return (
        <div>
            <Typography.Title level={5}>
                {current.name || '-'}
                <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    style={{ marginLeft: 8 }}
                    onClick={handleEdit}
                >
                    编辑
                </Button>
            </Typography.Title>
            <Descriptions column={1} size="small" bordered style={{ marginTop: 8 }}>
                <Descriptions.Item label="类型">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>
                        {current.group_type || '-'}
                    </pre>
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                    <Tag color={current.group_status === 'active' ? 'green' : 'default'}>
                        {getGroupStatusLabel(current.group_status)}
                    </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="描述">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>
                        {current.description || '-'}
                    </pre>
                </Descriptions.Item>
                <Descriptions.Item label="集体行动说明">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>
                        {current.collective_behavior || '-'}
                    </pre>
                </Descriptions.Item>
                <Descriptions.Item label="决策方式">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>
                        {current.decision_style || '-'}
                    </pre>
                </Descriptions.Item>
                <Descriptions.Item label="冲突点">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>
                        {current.conflict_points || '-'}
                    </pre>
                </Descriptions.Item>
                <Descriptions.Item label="默契点">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>
                        {current.accord_points || '-'}
                    </pre>
                </Descriptions.Item>
                <Descriptions.Item label="常见行动模式/剧本">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>
                        {current.action_pattern || '-'}
                    </pre>
                </Descriptions.Item>
                <Descriptions.Item label="小组风格/节奏">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>
                        {current.group_style || '-'}
                    </pre>
                </Descriptions.Item>
                <Descriptions.Item label="共同目标">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>
                        {current.shared_goal || '-'}
                    </pre>
                </Descriptions.Item>
                <Descriptions.Item label="小组禁忌">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>
                        {current.taboo || '-'}
                    </pre>
                </Descriptions.Item>
                <Descriptions.Item label="情境-典型反应">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>
                        {current.situation_responses || '-'}
                    </pre>
                </Descriptions.Item>
                <Descriptions.Item label="对外一致口径/习惯用语">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>
                        {current.group_mannerisms || '-'}
                    </pre>
                </Descriptions.Item>
                <Descriptions.Item label="类型备注">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>
                        {current.group_type_notes || '-'}
                    </pre>
                </Descriptions.Item>
                <Descriptions.Item label="状态起始时间/剧情节点">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>
                        {current.status_since ? String(current.status_since) : '-'}
                    </pre>
                </Descriptions.Item>
                <Descriptions.Item label="状态说明">
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>
                        {current.status_notes || '-'}
                    </pre>
                </Descriptions.Item>
            </Descriptions>
            <Typography.Title level={5} style={{ marginTop: 16 }}>
                成员（{members.length}）
            </Typography.Title>
            {members.length === 0 ? (
                <Typography.Text type="secondary">暂无成员</Typography.Text>
            ) : (
                <ul style={{ paddingLeft: 20, marginTop: 4 }}>
                    {members.map((m, i) => (
                        <li key={m.id ?? i}>
                            {m.name_in_worldview ?? `角色信息 #${m.role_info_id}`}
                            {m.role_in_group ? `（${m.role_in_group}）` : ''}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
