import { Card } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { useMagicSystemManage } from '../context';
import { IMagicSystemVersion } from '@/src/types/IAiNoval';

export default function CurrentVersionPreview() {
    const { state } = useMagicSystemManage();

    // 获取当前版本
    const getCurrentVersion = (): IMagicSystemVersion | null => {
        if (!state.selectedMagicSystemId) return null;

        const currentSystem = state.magicSystemList.find(
            sys => sys.id === state.selectedMagicSystemId
        );

        if (!currentSystem?.version_id) return null;

        return state.magicSystemVersions.find(
            version => version.id === currentSystem.version_id
        ) || null;
    };

    const currentVersion = getCurrentVersion();

    if (!state.selectedMagicSystemId) {
        return null;
    }

    if (!currentVersion) {
        return (
            <Card
                title={
                    <span>
                        <FileTextOutlined style={{ marginRight: 8 }} />
                        当前版本预览
                    </span>
                }
            >
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                    暂无当前版本
                </div>
            </Card>
        );
    }

    return (
        <Card
            title={
                <span>
                    <FileTextOutlined style={{ marginRight: 8 }} />
                    当前版本：{currentVersion.version_name}
                </span>
            }
        >
            <pre style={{
                background: '#f5f5f5',
                padding: 16,
                borderRadius: 4,
                margin: 0,
                minHeight: 200,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                fontSize: '12px',
                lineHeight: '1.5'
            }}>
                {(() => {
                    try {
                        return JSON.stringify(JSON.parse(currentVersion.content), null, 2);
                    } catch {
                        return currentVersion.content;
                    }
                })()}
            </pre>
        </Card>
    );
}
