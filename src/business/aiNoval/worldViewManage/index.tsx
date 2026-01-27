import { useState, useRef, useEffect, useMemo } from 'react';
import fetch from '@/src/fetch';
import { Button, Input, Space, List, message, Card, Row, Col, Typography, Radio, Divider } from 'antd';
import { ExclamationCircleFilled, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import confirm from "antd/es/modal/confirm";
import WorldViewInfoEditor from './edit/worldViewInfoEditor';
import { IWorldViewDataWithExtra, ITimelineDef, IWorldViewData } from '@/src/types/IAiNoval';
import WorldviewManageContextProvider, { useLoadWorldviewList, useWorldViewData, useWorldViewEditorRef, useWorldViewId, useWorldviewList } from './worldviewManageContext';
import { useAsyncEffect } from '@/src/utils/hooks/useAsyncEffect';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import styles from './index.module.scss';
import BaseInfoPanel from './panel/baseInfoPanel';
import RulesManagePanel from './panel/rulesManagePanel';

const { Text } = Typography;

export default function WorldViewManage() {
    return (
        <WorldviewManageContextProvider>
            <WorldViewManageContent />
        </WorldviewManageContextProvider>
    )
}

function WorldViewManageContent() {
    const [worldViewId, setWorldViewId] = useWorldViewId();
    const loadWorldviewList = useLoadWorldviewList();
    const mEditor = useRef<WorldViewInfoEditor | null>(null);
    const [worldViewEditorRef, setWorldViewEditorRef] = useWorldViewEditorRef();

    useAsyncEffect(async () => {
        let worldviewList = await loadWorldviewList();
        if (worldviewList && worldviewList.length > 0) {
            setWorldViewId(worldviewList[0].id!);
        }
    }, []);
    
    useEffect(() => {
        setWorldViewEditorRef(mEditor);
    }, [mEditor]);

    function onQuery() {
        loadWorldviewList()
    }

    return (
        <>
            <Row gutter={16}>
                <Col span={6}>
                    <WorldViewListPanel />
                </Col>
                <Col span={18}>
                    <WorldViewInfoPanel />
                </Col>
            </Row> 

            <WorldViewInfoEditor ref={mEditor} onFinish={() => onQuery()}/>
        </> 
    )
}

function WorldViewListPanel() {
    const [worldviewList] = useWorldviewList();
    const loadWorldviewList = useLoadWorldviewList();
    const [searchValue, setSearchValue] = useState('');
    const [worldViewId, setWorldViewId] = useWorldViewId();
    const [mEditorRef, setMEditorRef] = useWorldViewEditorRef();

    const filteredWorldviewList = useMemo(() => worldviewList.filter((item) => {
        return item?.title?.toLowerCase().includes(searchValue.toLowerCase());
    }), [worldviewList, searchValue]);

    let title = (
        <div className="f-flex-two-side">
            <Space>
                <Input placeholder="搜索世界观" prefix={<SearchOutlined/>} onChange={(e) => {setSearchValue(e.target.value);}} />
            </Space>
            <Space>
                <Button type="primary" icon={<ReloadOutlined />} onClick={() => {loadWorldviewList();}}>刷新</Button>
                <Button type="default" icon={<PlusOutlined />} onClick={() => {mEditorRef?.current?.show();}}></Button>
            </Space>
        </div>
    )

    function onDelete(worldViewData: IWorldViewDataWithExtra) {
        confirm({
            title: '删除确认',
            icon: <ExclamationCircleFilled />,
            content: '警告！将删除对象，请二次确认！',
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            onOk() {
                fetch.delete('/api/web/aiNoval/worldView', { 
                    params: { id: worldViewData?.id } 
                }).then(() => {
                    message.success('已删除');
                    loadWorldviewList();
                });
            },
        });
    }

    let worldviewListContent = useMemo(() => {

        let options = filteredWorldviewList.map((item) => (
            <Radio key={item.id} className={styles.worldviewListItem} value={item.id}>
                <div className='f-flex-two-side' style={{ alignItems: 'center' }}>
                    <Text>
                        {item?.title || ''}
                    </Text>
                    <Space>
                        <Button type="link" icon={<EditOutlined/>} onClick={() => mEditorRef?.current?.showAndEdit(item as IWorldViewData)}></Button>
                        <Button type="link" danger icon={<DeleteOutlined/>} onClick={() => onDelete(item as IWorldViewDataWithExtra)}></Button>
                    </Space>
                </div>
            </Radio>
        ));

        return <Radio.Group onChange={(e) => {setWorldViewId(e.target.value);}} value={worldViewId}>{options}</Radio.Group>;
    }, [filteredWorldviewList]);

    return (
        <Card title={title} style={{ margin: '12px 0' }}>
            <div className={styles.worldviewListContainer}>
                {worldviewListContent}
            </div>
        </Card>
    )
}

function WorldViewInfoPanel() {

    const [activeTab, setActiveTab] = useState('baseInfo');

    let title = <>
        <Radio.Group value={activeTab} onChange={(e) => setActiveTab(e.target.value)} optionType='button' buttonStyle="solid" >
            <Radio value="baseInfo">基础信息</Radio>
            <Radio value="worldRules">世界书</Radio>
        </Radio.Group>
    </>


    let content = useMemo(() => {
        switch (activeTab) {
            case 'baseInfo':
                return <BaseInfoPanel />;
            case 'worldRules':
                return <RulesManagePanel />;
            default:
                return <div>开发中...</div>;
        }
    }, [activeTab]);    

    return (
        <div className="f-fit-height f-flex-col">
            <Card title={title} style={{ margin: '12px 0' }}>
                <div className={styles.worldviewInfoContainer}>
                    {content}
                </div>
            </Card>
        </div>
    )
}