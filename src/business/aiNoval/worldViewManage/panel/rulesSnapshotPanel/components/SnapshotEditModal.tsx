import { Modal, Row, Col, Button, Space, message, Input, Form, Checkbox } from 'antd';
import { useSnapshotData } from '../snapshotContext';
import CheckboxTree from './CheckboxTree';
import SnapshotEditor from './SnapshotEditor';
import { useWorldViewData } from '../../../worldviewManageContext';
import { createOrUpdateWorldRuleSnapshot } from '@/src/api/aiNovel';

interface SnapshotEditModalProps {
    onSaveSuccess?: () => void;
}

export default function SnapshotEditModal({ onSaveSuccess }: SnapshotEditModalProps) {
    const [worldViewData] = useWorldViewData();
    const {
        isEditModalOpen,
        checkedKeys,
        snapshotContent,
        snapshotTitle,
        includeItemTitle,
        editingSnapshot,
        snapshotConfig,
        handleCheck,
        setSnapshotContent,
        setSnapshotTitle,
        setIncludeItemTitle,
        closeEditModal
    } = useSnapshotData();

    const handleSave = async () => {
        if (!worldViewData?.id) {
            message.error('世界观ID不存在');
            return;
        }

        if (!snapshotTitle?.trim()) {
            message.error('请输入快照标题');
            return;
        }

        try {
            await createOrUpdateWorldRuleSnapshot({
                id: editingSnapshot?.id || undefined,
                worldview_id: worldViewData.id,
                title: snapshotTitle.trim(),
                config: JSON.stringify(snapshotConfig),
                content: snapshotContent
            });
            message.success(editingSnapshot ? '更新成功' : '创建成功');
            closeEditModal();
            onSaveSuccess?.();
        } catch (error: any) {
            message.error((editingSnapshot ? '更新' : '创建') + '失败: ' + (error.message || '未知错误'));
        }
    };

    return (
        <Modal
            title={editingSnapshot ? '编辑快照' : '新建快照'}
            open={isEditModalOpen}
            onCancel={closeEditModal}
            footer={
                <Space>
                    <Button onClick={closeEditModal}>取消</Button>
                    <Button type="primary" onClick={handleSave}>
                        保存
                    </Button>
                </Space>
            }
            width={1200}
            style={{ top: 20 }}
            styles={{
                body: { padding: '16px' }
            }}
        >
            <Form layout="vertical" size="small" style={{ marginBottom: 12 }}>
                <Form.Item label="快照标题" required style={{ marginBottom: 8 }}>
                    <Input
                        value={snapshotTitle}
                        onChange={(e) => setSnapshotTitle(e.target.value)}
                        placeholder="请输入快照标题"
                        maxLength={100}
                    />
                </Form.Item>
            </Form>
            
            <Row gutter={12}>
                {/* 左侧：勾选树 */}
                <Col span={10}>
                    <CheckboxTree
                        checkedKeys={checkedKeys}
                        onCheck={handleCheck}
                    />
                </Col>

                {/* 右侧：快照编辑器 */}
                <Col span={14}>
                    <SnapshotEditor
                        content={snapshotContent}
                        onChange={setSnapshotContent}
                        includeItemTitle={includeItemTitle}
                        onIncludeItemTitleChange={setIncludeItemTitle}
                    />
                </Col>
            </Row>
        </Modal>
    );
}
