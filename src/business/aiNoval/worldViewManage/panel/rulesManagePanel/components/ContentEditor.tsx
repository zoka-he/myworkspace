import { Space, Button, Card, Typography, Popconfirm, Empty, Divider, message } from 'antd';
import { FileTextOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useWorldRule } from '../worldRuleContext';
import styles from '../index.module.scss';

const { Title, Text } = Typography;

interface ContentEditorProps {
    onAddItem: () => void;
    onEditItem: () => void;
    onEditGroup: (groupId: number) => void;
}

export default function ContentEditor({
    onAddItem,
    onEditItem,
    onEditGroup
}: ContentEditorProps) {
    const {
        selectedGroup,
        selectedItem,
        selectedGroupId,
        deleteGroup,
        deleteItem,
        getItemsByGroupId
    } = useWorldRule();

    const handleDeleteGroup = async () => {
        if (selectedGroupId) {
            try {
                await deleteGroup(selectedGroupId);
                message.success('删除成功');
            } catch (error) {
                // 错误已在 Context 中处理
            }
        }
    };

    const handleDeleteItem = async () => {
        if (selectedItem?.id) {
            try {
                await deleteItem(selectedItem.id);
                message.success('删除成功');
            } catch (error) {
                // 错误已在 Context 中处理
            }
        }
    };
    return (
        <Card 
            title={
                <div className={styles.cardTitle}>
                    <FileTextOutlined /> 内容编辑
                </div>
            }
            extra={
                <Space>
                    {(selectedGroup && !selectedItem ) && (
                        <>
                            <Button 
                                icon={<EditOutlined />}
                                onClick={() => selectedGroupId && onEditGroup(selectedGroupId)}
                            >
                                编辑分组
                            </Button>
                            <Popconfirm
                                title="确定要删除这个分组吗？"
                                description="删除分组会同时删除分组下的所有条目，此操作无法恢复"
                                onConfirm={handleDeleteGroup}
                                okText="确定"
                                cancelText="取消"
                            >
                                <Button 
                                    danger
                                    icon={<DeleteOutlined />}
                                >
                                    删除分组
                                </Button>
                            </Popconfirm>
                        </>
                    )}
                    {selectedItem && (
                        <>
                            <Button 
                                type="primary"
                                icon={<EditOutlined />}
                                onClick={onEditItem}
                            >
                                编辑条目
                            </Button>
                            <Popconfirm
                                title="确定要删除这个条目吗？"
                                description="删除后无法恢复"
                                onConfirm={handleDeleteItem}
                                okText="确定"
                                cancelText="取消"
                            >
                                <Button 
                                    danger
                                    icon={<DeleteOutlined />}
                                >
                                    删除条目
                                </Button>
                            </Popconfirm>
                        </>
                    )}
                </Space>
            }
            className={styles.editorCard}
        >
            {selectedItem ? (
                <div className={styles.editorContent}>
                    <div className={styles.editorHeader}>
                        <Title level={4}>{selectedItem.summary}</Title>
                    </div>
                    <Divider size="small"/>
                    <div className={styles.editorBody}>
                        {selectedItem.content ? (
                            <div className={styles.contentDisplay}>
                                {selectedItem.content.split('\n').map((line, index) => (
                                    <p key={index}>{line}</p>
                                ))}
                            </div>
                        ) : (
                            <Empty 
                                description="暂无内容" 
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        )}
                    </div>
                </div>
            ) : selectedGroup ? (
                <div className={styles.editorContent}>
                    <div className={styles.editorHeader}>
                        <div className={styles.headerLeft}>
                            <Title level={4}>{selectedGroup.title}</Title>
                            <Text type="secondary">分组</Text>
                        </div>
                        <Button 
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={onAddItem}
                            className={styles.addItemButton}
                        >
                            添加条目
                        </Button>
                    </div>
                    <Divider size="small"/>
                    <div className={styles.editorBody}>
                        {(() => {
                            const groupItems = selectedGroupId ? getItemsByGroupId(selectedGroupId) : [];
                            if (groupItems.length === 0) {
                                return (
                                    <Empty 
                                        description={
                                            <span>
                                                该分组下暂无条目，请点击<strong>"添加条目"</strong>创建新条目
                                            </span>
                                        }
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    />
                                );
                            }
                            return (
                                <div className={styles.groupItemsDisplay}>
                                    {groupItems.map((item, index) => (
                                        <div key={item.id || index} className={styles.groupItemBlock}>
                                            <div className={styles.itemSummary}>
                                                <Title level={5}>{item.summary || '未命名条目'}</Title>
                                            </div>
                                            {item.content && (
                                                <div className={styles.itemContent}>
                                                    {item.content.split('\n').map((line, lineIndex) => (
                                                        <p key={lineIndex}>{line || '\u00A0'}</p>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            ) : (
                <Empty 
                    description="请从左侧选择一个分组或条目"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            )}
        </Card>
    );
}
