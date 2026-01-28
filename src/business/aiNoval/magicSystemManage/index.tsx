import { useState } from 'react';
import { Row, Col } from 'antd';
import MagicSystemManageContextProvider from "./context";
import { useMagicSystemManage } from "./context";
import SystemTree from "./components/SystemTree";
import SystemInfo from "./components/SystemInfo";
import VersionManage from "./components/VersionManage";
import AddSystemModal from "./components/AddSystemModal";
import fetch from '@/src/fetch';

function MagicSystemManageContent() {
    const { state, dispatch } = useMagicSystemManage();
    const [addModalVisible, setAddModalVisible] = useState(false);

    async function handleAddSystemSuccess() {
        // 重新加载所有技能系统数据
        try {
            const response = await fetch.get('/api/aiNoval/magic_system/def', {
                params: { page: 1, limit: 10000 }
            });
            dispatch({ type: 'SET_MAGIC_SYSTEM_LIST', payload: response.data || [] });
        } catch (e: any) {
            console.error(e);
        }
    }

    return (
        <div style={{ padding: '0', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
            <Row gutter={16} style={{ height: '100%' }}>
                {/* 左侧：世界观和技能系统树 */}
                <Col span={6} style={{ height: '100%' }}>
                    <SystemTree onAddSystem={() => setAddModalVisible(true)} />
                </Col>
                
                {/* 右侧：技能系统信息和版本管理 */}
                <Col span={18} style={{ height: '100%', overflow: 'auto' }}>
                    <div style={{ marginBottom: 16 }}>
                        <SystemInfo />
                    </div>
                    <div>
                        <VersionManage />
                    </div>
                </Col>
            </Row>

            <AddSystemModal
                visible={addModalVisible}
                onCancel={() => setAddModalVisible(false)}
                onSuccess={handleAddSystemSuccess}
            />
        </div>
    );
}

export default function MagicSystemManage() {
    return (
        <MagicSystemManageContextProvider>
            <MagicSystemManageContent />
        </MagicSystemManageContextProvider>
    )
}