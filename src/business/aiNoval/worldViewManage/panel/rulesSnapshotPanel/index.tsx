import { useState, useEffect } from 'react';
import { useWorldViewData } from '../../worldviewManageContext';
import { SnapshotContextProvider, useSnapshotData } from './snapshotContext';
import SnapshotList from './components/SnapshotList';
import SnapshotEditModal from './components/SnapshotEditModal';
import styles from './index.module.scss';

// 内部组件 - 使用 Context
function RulesSnapshotPanelContent() {
    const [worldViewData] = useWorldViewData();
    const { openNewSnapshot, openEditSnapshot, closeEditModal } = useSnapshotData();
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleNewSnapshot = () => {
        openNewSnapshot();
    };

    const handleSelectSnapshot = (snapshot: any) => {
        openEditSnapshot(snapshot);
    };

    const handleSaveSuccess = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <div className={styles.rulesSnapshotPanel}>
            <SnapshotList
                worldviewId={worldViewData?.id}
                onSelectSnapshot={handleSelectSnapshot}
                onNewSnapshot={handleNewSnapshot}
                refreshTrigger={refreshTrigger}
            />
            <SnapshotEditModal onSaveSuccess={handleSaveSuccess} />
        </div>
    );
}

// 数据加载组件
function RulesSnapshotPanelWithData() {
    const [worldViewData] = useWorldViewData();
    const { loadData, loading } = useSnapshotData();

    useEffect(() => {
        if (worldViewData?.id) {
            loadData(worldViewData.id);
        }
    }, [worldViewData?.id, loadData]);

    if (loading) {
        return <div>加载中...</div>;
    }

    return <RulesSnapshotPanelContent />;
}

// 主组件 - 提供 Context Provider
export default function RulesSnapshotPanel() {
    return (
        <SnapshotContextProvider>
            <RulesSnapshotPanelWithData />
        </SnapshotContextProvider>
    );
}
