import { Button, Card, Descriptions, Typography } from 'antd';
import { IFactionDefData } from '@/src/types/IAiNoval';
import { EditOutlined } from '@ant-design/icons';
import FactionRecallTest from './factionRecallTest';

interface FactionInfoPanelProps {
    faction?: IFactionDefData;
    onEdit?: (faction: IFactionDefData) => void;
}

export default function FactionInfoPanel({ faction, onEdit }: FactionInfoPanelProps) {
    if (!faction) {
        return <div>请选择阵营</div>;
    }

    let recommandQuery = [faction.name || '', '设定'].join(' ');

    return (
        <div className="f-fit-height" style={{ overflow: 'auto' }}>
            <Typography.Title level={3}>
                {faction.name || '-'}
                <Button
                    type="text" size="small"
                    icon={<EditOutlined />}
                    style={{ marginLeft: '8px', color: '#1890ff' }}
                    onClick={() => onEdit?.(faction)}
                >编辑</Button>
            </Typography.Title>
            <Typography.Paragraph style={{ fontSize: '12px' }}>
                <pre>{faction.description || '-'}</pre>
            </Typography.Paragraph>

            <Typography.Title level={4}>知识库召回测试</Typography.Title>
                
            <FactionRecallTest recommandQuery={recommandQuery} />
        </div>
    );
}
