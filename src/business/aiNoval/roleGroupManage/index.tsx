import { Card, List, Button, Row, Col, Select, Space, Typography, Affix } from 'antd';
import { message } from '@/src/utils/antdAppMessage';
import { useEffect, useState, useRef } from 'react';
import { IWorldViewData, IRoleGroup } from '@/src/types/IAiNoval';
import apiCalls from './apiCalls';
import RoleGroupManageContextProvider, {
    useWorldViewId,
    useWorldViewList,
    useRoleGroupList,
    useLoadRoleGroupList,
    useLoadWorldViewList,
    useCurrentRoleGroupId,
    useLoadRoleGroupDetail,
} from './RoleGroupManageContext';
import RoleGroupEdit, { RoleGroupEditRef } from './edit/roleGroupEdit';
import RoleGroupInfoPanel from './panel/roleGroupInfoPanel';
import { PlusOutlined } from '@ant-design/icons';
import { ROLE_GROUP_STATUSES, ROLE_GROUP_TYPES } from '@/src/types/IAiNoval';

const { Text } = Typography;

function getGroupTypeLabel(value: string | null | undefined) {
    if (!value) return '';
    return ROLE_GROUP_TYPES.find((t) => t.value === value)?.label ?? value;
}

function getGroupStatusLabel(value: string | null | undefined) {
    if (!value) return '';
    return ROLE_GROUP_STATUSES.find((s) => s.value === value)?.label ?? value;
}

function InitRoleGroupManage({ children }: { children: React.ReactNode }) {
    const [isReady, setIsReady] = useState(false);
    const loadWorldViewList = useLoadWorldViewList();
    const [worldViewId, setWorldViewId] = useWorldViewId();
    const loadRoleGroupList = useLoadRoleGroupList();

    useEffect(() => {
        if (isReady) return;
        loadWorldViewList().then((data: IWorldViewData[]) => {
            if (data?.length > 0) setWorldViewId(data[0].id ?? null);
            setIsReady(true);
        });
    }, [isReady]);

    useEffect(() => {
        if (worldViewId) loadRoleGroupList();
    }, [worldViewId]);

    return isReady ? children : null;
}

function LeftPanel({ editRef }: { editRef: React.RefObject<RoleGroupEditRef | null> }) {
    const [worldViewId, setWorldViewId] = useWorldViewId();
    const worldViewList = useWorldViewList();
    const roleGroupList = useRoleGroupList();
    const loadRoleGroupList = useLoadRoleGroupList();
    const [currentId, setCurrentId] = useCurrentRoleGroupId();
    const loadRoleGroupDetail = useLoadRoleGroupDetail();

    const handleAdd = () => {
        if (!worldViewId) {
            message.warning('请先选择世界观');
            return;
        }
        editRef.current?.showAndEdit({ worldview_id: worldViewId });
    };

    const handleSelect = (group: IRoleGroup) => {
        setCurrentId(group.id ?? null);
        if (group.id) loadRoleGroupDetail(group.id);
    };

    const handleRefresh = () => {
        loadRoleGroupList();
    };

    const handleEditSuccess = () => {
        loadRoleGroupList();
        if (currentId) loadRoleGroupDetail(currentId);
    };

    return (
        <Card
            // className="f-fit-height"
            styles={{ body: { height: 'calc(100vh - 130px)' } }}
            title={
                <Space>
                    <Text>选择世界观：</Text>
                    <Select
                        style={{ width: 180 }}
                        value={worldViewId}
                        onChange={(v) => setWorldViewId(v)}
                        placeholder="选择世界观"
                        options={worldViewList.map((w) => ({ value: w.id, label: w.title || `世界观 ${w.id}` }))}
                    />
                    <Button onClick={handleRefresh}>刷新</Button>
                </Space>
            }
        >
            <div className="f-fit-height f-flex-col">
                <Button type="primary" icon={<PlusOutlined />} style={{ width: '100%', marginBottom: 8 }} onClick={handleAdd} disabled={!worldViewId}>
                    新建角色组
                </Button>
                <div style={{ flex: 1, overflow: 'auto' }}>
                    <List
                        size="small"
                        dataSource={roleGroupList}
                        renderItem={(item) => (
                            <List.Item
                                key={item.id}
                                onClick={() => handleSelect(item)}
                                style={{ cursor: 'pointer', background: currentId === item.id ? '#e6f7ff' : undefined }}
                            >
                                <div>
                                    <div>{item.name || '未命名'}</div>
                                    <div style={{ fontSize: 12, color: '#666' }}>
                                        {getGroupTypeLabel(item.group_type)} · {getGroupStatusLabel(item.group_status)}
                                    </div>
                                </div>
                            </List.Item>
                        )}
                    />
                </div>
            </div>
        </Card>
    );
}

function RightPanel({ editRef }: { editRef: React.RefObject<RoleGroupEditRef | null> }) {
    const loadRoleGroupList = useLoadRoleGroupList();
    const [currentId] = useCurrentRoleGroupId();
    const loadRoleGroupDetail = useLoadRoleGroupDetail();

    const handleRefresh = () => {
        loadRoleGroupList();
        if (currentId) loadRoleGroupDetail(currentId);
    };

    return (
        <Card title="角色组详情">
            <div style={{ minHeight: 'calc(100vh - 180px)' }}>
                <RoleGroupInfoPanel editRef={editRef} onRefresh={handleRefresh} />
            </div>
        </Card>
    );
}

function RoleGroupManageContent() {
    const editRef = useRef<RoleGroupEditRef>(null);
    const loadRoleGroupList = useLoadRoleGroupList();
    const [currentId] = useCurrentRoleGroupId();
    const loadRoleGroupDetail = useLoadRoleGroupDetail();

    const handleEditSuccess = () => {
        loadRoleGroupList();
        if (currentId) loadRoleGroupDetail(currentId);
    };

    return (
        <>
            <div className="flex flex-row w-full gap-3 pb-3">
                <Affix offsetTop={60} target={() => document.getElementById('m-app-main') || window}>
                    <LeftPanel editRef={editRef} />
                </Affix>
                <div className="flex-1">
                    <RightPanel editRef={editRef} />
                </div>
            </div>
            <RoleGroupEdit ref={editRef} onSuccess={handleEditSuccess} />
        </>
    );
}

export default function RoleGroupManage() {
    return (
        <RoleGroupManageContextProvider>
            <InitRoleGroupManage>
                <RoleGroupManageContent />
            </InitRoleGroupManage>
        </RoleGroupManageContextProvider>
    );
}
