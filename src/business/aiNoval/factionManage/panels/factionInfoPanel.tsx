import { Button, Card, Descriptions, Typography } from 'antd';
import { IFactionDefData } from '@/src/types/IAiNoval';
import { EditOutlined } from '@ant-design/icons';

interface FactionInfoPanelProps {
    faction?: IFactionDefData;
    onEdit?: (faction: IFactionDefData) => void;
}

export default function FactionInfoPanel({ faction, onEdit }: FactionInfoPanelProps) {
    if (!faction) {
        return <div>请选择阵营</div>;
    }

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
        </div>
    );
}
