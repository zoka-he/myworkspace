import { Card, Input, Checkbox, Space } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import styles from '../index.module.scss';

const { TextArea } = Input;

interface SnapshotEditorProps {
    content: string;
    onChange: (content: string) => void;
    includeItemTitle?: boolean;
    onIncludeItemTitleChange?: (include: boolean) => void;
}

export default function SnapshotEditor({
    content,
    onChange,
    includeItemTitle,
    onIncludeItemTitleChange
}: SnapshotEditorProps) {
    return (
        <Card 
            title={
                <div className={styles.cardTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Space>
                        <FileTextOutlined /> 
                        <span>快照正文</span>
                    </Space>
                    {onIncludeItemTitleChange && (
                        <Checkbox
                            checked={includeItemTitle}
                            onChange={(e) => onIncludeItemTitleChange(e.target.checked)}
                        >
                            条目标题
                        </Checkbox>
                    )}
                </div>
            }
            className={styles.editorCard}
            size="small"
            styles={{
                body: { padding: '12px' }
            }}
        >
            <TextArea
                value={content}
                onChange={(e) => onChange(e.target.value)}
                placeholder="快照正文内容..."
                autoSize={{ minRows: 30, maxRows: 50 }}
                style={{ 
                    width: '100%',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    minHeight: '500px'
                }}
            />
        </Card>
    );
}
