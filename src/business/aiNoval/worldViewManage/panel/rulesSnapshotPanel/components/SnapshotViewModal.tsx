import { Modal, Typography } from 'antd';
import { ISnapshotData } from '../types';

const { Paragraph } = Typography;

interface SnapshotViewModalProps {
    open: boolean;
    snapshot: ISnapshotData | null;
    onCancel: () => void;
}

export default function SnapshotViewModal({
    open,
    snapshot,
    onCancel
}: SnapshotViewModalProps) {
    if (!snapshot) return null;

    return (
        <Modal
            title={`快照详情 #${snapshot.id || ''}`}
            open={open}
            onCancel={onCancel}
            footer={null}
            width={800}
        >
            <div style={{ marginBottom: 16 }}>
                <Typography.Text strong>标题：</Typography.Text>
                <Typography.Text>{snapshot.title || '-'}</Typography.Text>
            </div>
            {snapshot.created_at && (
                <div style={{ marginBottom: 16 }}>
                    <Typography.Text strong>创建时间：</Typography.Text>
                    <Typography.Text>
                        {new Date(snapshot.created_at).toLocaleString('zh-CN')}
                    </Typography.Text>
                </div>
            )}
            {snapshot.updated_at && (
                <div style={{ marginBottom: 16 }}>
                    <Typography.Text strong>更新时间：</Typography.Text>
                    <Typography.Text>
                        {new Date(snapshot.updated_at).toLocaleString('zh-CN')}
                    </Typography.Text>
                </div>
            )}
            <div style={{ marginTop: 24 }}>
                <Typography.Text strong>内容：</Typography.Text>
                <div
                    style={{
                        marginTop: 12,
                        padding: 16,
                        background: '#f5f5f5',
                        borderRadius: 4,
                        maxHeight: '500px',
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        lineHeight: '1.6'
                    }}
                >
                    {snapshot.content || '（无内容）'}
                </div>
            </div>
        </Modal>
    );
}
