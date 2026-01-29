import { Modal, Form, Input, message } from 'antd';
import { createOrUpdateWorldRuleSnapshot } from '@/src/api/aiNovel';
import { ISnapshotData, ISnapshotConfig } from '../types';

interface SnapshotModalProps {
    open: boolean;
    snapshot?: ISnapshotData | null;
    worldviewId?: number;
    config: ISnapshotConfig;
    content: string;
    onOk: () => void;
    onCancel: () => void;
}

export default function SnapshotModal({
    open,
    snapshot,
    worldviewId,
    config,
    content,
    onOk,
    onCancel
}: SnapshotModalProps) {
    const [form] = Form.useForm();

    const handleOk = async () => {
        if (!worldviewId) {
            message.error('世界观ID不存在');
            return;
        }

        try {
            await createOrUpdateWorldRuleSnapshot({
                id: snapshot?.id || undefined,
                worldview_id: worldviewId,
                config: JSON.stringify(config),
                content: content
            });
            message.success(snapshot ? '更新成功' : '创建成功');
            form.resetFields();
            onOk();
        } catch (error: any) {
            message.error((snapshot ? '更新' : '创建') + '失败: ' + (error.message || '未知错误'));
        }
    };

    return (
        <Modal
            title={snapshot ? '编辑快照' : '保存快照'}
            open={open}
            onOk={handleOk}
            onCancel={onCancel}
            okText="保存"
            cancelText="取消"
            width={600}
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={{
                    note: snapshot?.id ? `快照 #${snapshot.id}` : ''
                }}
            >
                <Form.Item
                    label="备注"
                    name="note"
                >
                    <Input placeholder="可选：为快照添加备注信息" />
                </Form.Item>
                <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                    <div style={{ marginBottom: 8 }}>
                        <strong>已选择：</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                        <div>分组: {config.selectedGroupIds.length} 个</div>
                        <div>条目: {config.selectedItemIds.length} 个</div>
                        <div>内容长度: {content.length} 字符</div>
                    </div>
                </div>
            </Form>
        </Modal>
    );
}
