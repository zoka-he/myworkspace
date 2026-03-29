'use client';

import { Button, Card, Checkbox, Input, Radio, Select, Space, Typography } from 'antd';
import styles from './index.module.scss';
import { PlusOutlined } from '@ant-design/icons';
import WorldViewSelect from '@/src/components/aiNovel/worldviewSelect';
import EventManage2ContextProvider from './context';
import { useFactions, useGeos, useRoles, useWorldViewId, useNovelId, useTimelines, useStoryLineIds, useStoryLines } from './hooks';
import NovelSelect from '@/src/components/aiNovel/novelSelect';
import Figure from './figure';
import EventTip from './figure/EventTip';
import { useEffect, useMemo, useState } from 'react';
import { connectAiNovelSharedWorker, postAiNovelWorkerMessage, subscribeAiNovelWorker, type WriteCompletedPayload } from '../sharedWorkerBridge';
import { useTimelineEvents } from './useTimelineEvents';
import GraphDataContext from './graphDataContext';
import EventLayer from './figure/EventLayer';
import TerritoryLayer from './figure/TerritoryLayer';

const { Text } = Typography;

export default function EventManage2() {
    return (
        <EventManage2ContextProvider>
            <div className={`${styles.patchOutlet} flex flex-row gap-3 h-screen overflow-hidden`}>
                <div className={`${styles.patchHeader} h-screen overflow-auto`}>
                    <LeftPanel />
                </div>
                <div className={`${styles.patchHeader} flex-1 h-screen overflow-auto`}>
                    <RightPanel />
                </div>
            </div>
        </EventManage2ContextProvider>
    );
}



function LeftPanel() {
    const [worldViewId, setWorldViewId] = useWorldViewId();
    const [novelId, setNovelId] = useNovelId();
    const [timelineList] = useTimelines();
    const [factionList] = useFactions();
    const [storyLineList] = useStoryLines();
    const [storyLineIds, setStoryLineIds] = useStoryLineIds();

    const timelineOptions = useMemo(() => {
        let timelineFactionSet = new Set();
        console.log('timelineList --->', timelineList);

        timelineList.forEach(item => {
            if (item.faction_id) {
                timelineFactionSet.add(item.faction_id);
            }
        });

        return factionList.filter(item => timelineFactionSet.has(item.id)).map(item => ({ label: item.name, value: item.id }));

    }, [factionList, timelineList]);
    
    const storyLineOptions = useMemo(() => {
        return storyLineList.map(item => ({ label: item.name, value: item.id, key: item.id }));
    }, [storyLineList]);

    return (
        <div className="flex flex-col gap-3">
            <Card title="世界观 & 小说选择" size="small">
                <Space direction='vertical'>
                    <Space>
                        <Text>世界观：</Text>
                        <WorldViewSelect value={worldViewId} onChange={setWorldViewId} />
                    </Space>
                    <Space>
                        <Text>小&nbsp;&nbsp;&nbsp;说：</Text>
                        <NovelSelect value={novelId} onChange={setNovelId} />
                    </Space>
                    <Space>
                        <Text>故事线：</Text>
                        <Select className="w-44" value={storyLineIds} onChange={setStoryLineIds} options={storyLineOptions} allowClear mode="multiple" />
                    </Space>
                </Space>
            </Card>

            <Card title="时间线选择" size="small">
                <Radio.Group options={timelineOptions} />
            </Card>

            <Card title="浮层选择" size="small">
                <Space direction='vertical'>
                    <Checkbox.Group options={[]}>
                        <Checkbox value="1">阵营</Checkbox>
                        <Checkbox value="3">文化</Checkbox>
                        <Checkbox value="4">科技水平</Checkbox>
                    </Checkbox.Group>
                    <Checkbox.Group>
                        <Checkbox value="2">人物</Checkbox>
                    </Checkbox.Group>
                    <Checkbox.Group>
                        <Checkbox value="5">季节</Checkbox>
                    </Checkbox.Group>
                    <Checkbox.Group>
                        <Checkbox value="6">章节</Checkbox>
                    </Checkbox.Group>
                </Space>
            </Card>
        </div>
    );
}
    
function RightPanel() {

    const [worldViewId] = useWorldViewId();
    const [novelId] = useNovelId();
    const [factionList] = useFactions();
    const [geoList] = useGeos();
    const [roleList] = useRoles();
    const [lastWrite, setLastWrite] = useState<WriteCompletedPayload | null>(null);
    const [workerReady, setWorkerReady] = useState(false);

    const { data: timelineEvents, isLoading: isLoadingTimelineEvents } = useTimelineEvents(worldViewId, null);

    const [eventTip, setEventTip] = useState<{
        eventId: number | null;
        position: { clientX: number; clientY: number };
    }>({ eventId: null, position: { clientX: 0, clientY: 0 } });

    useEffect(() => {
        setWorkerReady(connectAiNovelSharedWorker());
        const unsubscribe = subscribeAiNovelWorker((message) => {
            if (message.type === 'WRITE_COMPLETED') {
                setLastWrite(message.payload);
            } else if (message.type === 'STATE_SYNC' && message.payload.lastWriteCompleted) {
                setLastWrite(message.payload.lastWriteCompleted);
            }
        });
        postAiNovelWorkerMessage({ type: 'GET_STATE' });
        return unsubscribe;
    }, []);

    const openInNewWindow = (path: string) => {
        window.open(path, '_blank');
    };

    const openEventManageInNewWindow = () => {
        postAiNovelWorkerMessage({
            type: 'REQUEST_EVENT_EDIT',
            payload: {
                from: 'worldviewFullGraph',
                worldviewId: worldViewId ?? null,
                novelId: novelId ?? null,
            },
        });
        openInNewWindow('/novel/eventManage2');
    };

    const title = (
        <div className="flex flex-row justify-between">
            <Space>
                <Text>关键字：</Text>
                <Input placeholder="请输入关键字" size="small"/>
                {/* <Text>时间范围：</Text> */}
            </Space>
            <Space>
                <Button size="small" icon={<PlusOutlined />} onClick={() => openInNewWindow('/novel/geographyManage')}>管理地点</Button>
                <Button size="small" icon={<PlusOutlined />} onClick={() => openInNewWindow('/novel/factionManage')}>管理阵营</Button>
                <Button size="small" icon={<PlusOutlined />} onClick={() => openInNewWindow('/novel/roleManage')}>管理角色</Button>
                <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openEventManageInNewWindow}>管理事件</Button>
            </Space>
        </div>
    );

    let layers = useMemo(() => {
        return [
            <TerritoryLayer key="territory-layer" />,
            <EventLayer key="event-layer" />,
        ];
    }, []);

    return (
        <>
            <Card title={title} size="small" styles={{ body: { height: 'calc(100vh - 110px)', overflow: 'auto' } }}>
                {(lastWrite || (process.env.NODE_ENV === 'development' && !workerReady)) ? (
                    <div style={{ marginBottom: 8 }}>
                        {lastWrite ? (
                            <Text type="secondary">{`最近写库完成：${lastWrite.source}`}</Text>
                        ) : null}
                        {process.env.NODE_ENV === 'development' && !workerReady ? (
                            <Text type="warning" style={{ display: 'block', marginTop: lastWrite ? 4 : 0 }}>
                                SharedWorker 未建立（浏览器不支持、非 https/localhost，或脚本 /scripts/aiNovelSharedWorker.js 加载失败）。请打开控制台查看 [aiNovel SharedWorker] 日志；Chrome 可在 chrome://inspect → Shared workers 中查看（名称：aiNovel-cross-tab）。
                            </Text>
                        ) : null}
                    </div>
                ) : null}
                {/* <div> */}
                    {/* <pre>{JSON.stringify(factionList, null, 2)}</pre> */}
                    {/* <pre>{JSON.stringify(geoList.map(item => ({ id: item.id, parentId: item.parent_id, name: item.name, code: item.code })), null, 2)}</pre> */}
                    {/* <pre>{JSON.stringify(roleList, null, 2)}</pre> */}
                {/* </div> */}

                

                <GraphDataContext.Provider value={{ timelineEvents }}>
                    <Figure
                        showDebugLayers
                        onShowEventTip={(eventId, position) => setEventTip({ eventId, position })}
                    >
                        {layers}
                    </Figure>
                    <EventTip eventId={eventTip.eventId} position={eventTip.position} />
                </GraphDataContext.Provider>
            </Card>
        </>
    )
}