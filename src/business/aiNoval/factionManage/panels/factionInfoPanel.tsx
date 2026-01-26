import { Button, Card, Descriptions, Divider, Typography } from 'antd';
import { IFactionDefData } from '@/src/types/IAiNoval';
import { EditOutlined } from '@ant-design/icons';
import FactionRecallTest from './factionRecallTest';
import { useCurrentFactionId, useCurrentFaction, useGetEditModal, useWorldViewId } from '../FactionManageContext';
import FactionEmbedPanel from './factionEmbedPanel';

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


            <FactionEmbedPanel factionData={currentFaction} />
            
            <Divider />

            <Typography.Title level={4}>知识库召回测试</Typography.Title>
                
            <FactionRecallTest worldViewId={worldViewId} recommandQuery={recommandQuery} />
        </div>
    );
}
