'use client';

import { Button, Card, Checkbox, Divider, Input, Radio, Select, Space, Typography } from 'antd';
import styles from './index.module.scss';
import { PlusOutlined } from '@ant-design/icons';
import WorldViewSelect from '@/src/components/aiNovel/worldviewSelect';
import EventManage2ContextProvider from './context';
import { useFactions, useGeos, useRoles, useWorldViewId, useNovelId, useTimelines, useStoryLineIds, useStoryLines, useWorldViewData } from './hooks';
import NovelSelect from '@/src/components/aiNovel/novelSelect';
import Figure, { type IFigureHandle } from './figure';
import EventTip from './figure/EventTip';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    broadcastEventEditRequest,
    connectAiNovelSharedWorker,
    getEventManage2TabCount,
    notifyAiNovelWriteCompleted,
    postAiNovelWorkerMessage,
    subscribeAiNovelWorker,
    subscribeWorldviewBroadcastForWriteCompleted,
    type WriteCompletedPayload,
} from '../sharedWorkerBridge';
import { createOrUpdateTimelineEvent } from '@/src/api/aiNovel';
import { message } from '@/src/utils/antdAppMessage';
import { useTimelineEvents } from './useTimelineEvents';
import GraphDataContext from './graphDataContext';
import EventLayer from './figure/EventLayer';
import TerritoryLayer from './figure/TerritoryLayer';
import EventEditorModal from '../eventManage2/components/EventEditorModal';
import ViewportFitModal from './ViewportFitModal';
import type { ITimelineEvent } from '@/src/types/IAiNoval';

const { Text } = Typography;

export default function EventManage2() {

    const [backgroundLayer, setBackgroundLayer] = useState<string>('faction');
    const [eventRelationType, setEventRelationType] = useState<string>('geo-event');

    return (
        <EventManage2ContextProvider>
            <div className={`${styles.patchOutlet} flex flex-row gap-3 h-screen overflow-hidden`}>
                <div className={`${styles.patchHeader} h-screen overflow-auto`}>
                    <LeftPanel 
                        backgroundLayer={backgroundLayer}
                        eventRelationType={eventRelationType}
                        onBackgroundLayerChange={setBackgroundLayer}
                        onEventRelationTypeChange={setEventRelationType}
                    />
                </div>
                <div className={`${styles.patchHeader} flex-1 h-screen overflow-auto`}>
                    <RightPanel backgroundLayer={backgroundLayer} eventRelationType={eventRelationType}/>
                </div>
            </div>
        </EventManage2ContextProvider>
    );
}

interface ILeftPanelProps {
    backgroundLayer: string;
    eventRelationType: string;
    onBackgroundLayerChange: (layer: string) => void;
    onEventRelationTypeChange: (layer: string) => void;
}

function LeftPanel(props: ILeftPanelProps) {
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
                        <WorldViewSelect className="w-44" value={worldViewId} onChange={setWorldViewId} />
                    </Space>
                    <Space>
                        <Text>小&nbsp;&nbsp;&nbsp;说：</Text>
                        <NovelSelect 
                            className="w-44" 
                            value={novelId} 
                            onChange={setNovelId} 
                            allowClear
                            placeholder="选择以显示章节位置"
                        />
                    </Space>
                    <Space>
                        <Text>故事线：</Text>
                        <Select 
                            className="w-44" 
                            value={storyLineIds} 
                            onChange={setStoryLineIds} 
                            options={storyLineOptions} 
                            allowClear 
                            mode="multiple" 
                            placeholder="不选=全选"
                        />
                    </Space>
                </Space>
            </Card>

            <Card title="时间线选择" size="small">
                <Select 
                    className="w-60" 
                    options={timelineOptions} 
                    placeholder="如不选，默认为基准事件线"
                    disabled
                    // onChange={(value) => props.onTimelineChange(value)}
                />
            </Card>

            <Card title="浮层选择" size="small">

                <Radio.Group 
                    style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                    value={props.backgroundLayer} 
                    onChange={(e) => props.onBackgroundLayerChange(e.target.value)}
                    disabled
                >
                    <Radio value="faction">阵营</Radio>
                    <Radio value="culture">文化</Radio>
                    <Radio value="technology">科技水平</Radio>
                    <Radio value="seasons">季节</Radio>
                </Radio.Group>
                <Divider size="small"/>
                <Checkbox.Group>
                    <Checkbox disabled>章节</Checkbox>
                </Checkbox.Group>
            </Card>

            <Card title="事件关联方式" size="small">
                <Radio.Group 
                    style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                    value={props.eventRelationType} 
                    onChange={(e) => props.onEventRelationTypeChange(e.target.value)}
                >
                    <Radio value="geo-event">按地点关联</Radio>
                    <Radio value="role-event">按角色关联</Radio>
                    <Radio value="faction-event" disabled>按阵营关联</Radio>
                </Radio.Group>
            </Card>
        </div>
    );
}

interface IRightPanelProps {
    backgroundLayer: string;
    eventRelationType: string;
}
    
function RightPanel(props: IRightPanelProps) {

    const [worldViewId] = useWorldViewId();
    const [novelId] = useNovelId();
    const [factionList] = useFactions();
    const [geoList] = useGeos();
    const [roleList] = useRoles();
    const [lastWrite, setLastWrite] = useState<WriteCompletedPayload | null>(null);
    const [workerReady, setWorkerReady] = useState(false);

    const { data: timelineEvents, isLoading: isLoadingTimelineEvents, mutate: refreshTimelineEvents } = useTimelineEvents(worldViewId);
    const [storyLineIds] = useStoryLineIds();

    const filteredTimelineEvents = useMemo(() => {
        const list = timelineEvents ?? [];
        if (!storyLineIds.length) return list;
        const allow = new Set(storyLineIds);
        return (list as ITimelineEvent[]).filter((e) => allow.has(Number(e.story_line_id)));
    }, [timelineEvents, storyLineIds]);
    const refreshTimelineEventsRef = useRef(refreshTimelineEvents);
    refreshTimelineEventsRef.current = refreshTimelineEvents;

    const [eventEditorOpen, setEventEditorOpen] = useState(false);
    const [editingEventId, setEditingEventId] = useState<number | null>(null);
    const [isEventSubmitting, setIsEventSubmitting] = useState(false);

    const [eventTip, setEventTip] = useState<{
        eventId: number | null;
        position: { clientX: number; clientY: number };
    }>({ eventId: null, position: { clientX: 0, clientY: 0 } });

    const figureRef = useRef<IFigureHandle>(null);
    const [viewportFitOpen, setViewportFitOpen] = useState(false);
    const [timelineList] = useTimelines();
    const [worldViewData] = useWorldViewData();

    const viewportTimelineDef = useMemo(() => {
        if (!timelineList?.length) {
            return null;
        }
        return timelineList.find((t) => t.faction_id == null) ?? timelineList[0];
    }, [timelineList]);

    const viewportDefaultTimes = useMemo(() => {
        if (!viewportTimelineDef) {
            return { start: undefined as number | undefined, end: undefined as number | undefined };
        }
        const start = viewportTimelineDef.start_seconds || 0;
        const end = (worldViewData?.te_max_seconds || 1) + 3600 * 24 * 365;
        return { start, end };
    }, [viewportTimelineDef, worldViewData]);

    useEffect(() => {
        setWorkerReady(connectAiNovelSharedWorker());
        const unsubscribe = subscribeAiNovelWorker((workerMessage) => {
            if (workerMessage.type === 'WRITE_COMPLETED') {
                setLastWrite(workerMessage.payload);
                if (workerMessage.payload.source === 'event') {
                    void refreshTimelineEventsRef.current();
                }
            } else if (workerMessage.type === 'STATE_SYNC' && workerMessage.payload.lastWriteCompleted) {
                setLastWrite(workerMessage.payload.lastWriteCompleted);
            }
        });
        postAiNovelWorkerMessage({ type: 'GET_STATE' });
        return unsubscribe;
    }, []);

    useEffect(() => {
        return subscribeWorldviewBroadcastForWriteCompleted((payload) => {
            setLastWrite(payload);
            void refreshTimelineEventsRef.current();
        });
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
            <Space wrap>
                {/* <Text>关键字：</Text>
                <Input placeholder="请输入关键字" size="small"/> */}
                <Button size="small" type="default" onClick={() => setViewportFitOpen(true)}>
                    对准视口
                </Button>
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
            <EventLayer key="event-layer" relationType={props.eventRelationType}/>,
        ];
    }, [props.eventRelationType]);

    return (
        <>
            <Card title={title} size="small" styles={{ body: { height: 'calc(100vh - 110px)', overflow: 'auto' } }}>
                {/* {(lastWrite || (process.env.NODE_ENV === 'development' && !workerReady)) ? (
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
                ) : null} */}

                <GraphDataContext.Provider value={{ timelineEvents: filteredTimelineEvents }}>
                    <Figure
                        ref={figureRef}
                        // showDebugLayers
                        onShowEventTip={(eventId, position) => setEventTip({ eventId, position })}
                        onEventClick={async (eventId) => {
                            if (!worldViewId) {
                                message.warning('请先选择世界观');
                                return;
                            }
                            const n = await getEventManage2TabCount();
                            if (n > 0) {
                                const payload = {
                                    from: 'worldviewFullGraph' as const,
                                    worldviewId: worldViewId ?? null,
                                    novelId: novelId ?? null,
                                    eventId,
                                };
                                postAiNovelWorkerMessage({
                                    type: 'REQUEST_EVENT_EDIT',
                                    payload,
                                });
                                broadcastEventEditRequest(payload);
                                message.info('已在事件管理页签打开编辑，请在该页签中完成修改。');
                                return;
                            }
                            setEditingEventId(eventId);
                            setEventEditorOpen(true);
                        }}
                    >
                        {layers}
                    </Figure>
                    <EventTip eventId={eventTip.eventId} position={eventTip.position} />
                </GraphDataContext.Provider>
            </Card>
            <ViewportFitModal
                open={viewportFitOpen}
                onCancel={() => setViewportFitOpen(false)}
                timelineDef={viewportTimelineDef}
                defaultStartSeconds={viewportDefaultTimes.start}
                defaultEndSeconds={viewportDefaultTimes.end}
                onConfirm={(visibleStartSeconds, visibleEndSeconds) => {
                    figureRef.current?.fitViewportToTimeRange(visibleStartSeconds, visibleEndSeconds);
                    setViewportFitOpen(false);
                }}
            />
            <EventEditorModal
                open={eventEditorOpen}
                worldviewId={worldViewId}
                eventId={editingEventId}
                submitting={isEventSubmitting}
                onCancel={() => {
                    setEventEditorOpen(false);
                    setEditingEventId(null);
                }}
                onSubmit={async (values) => {
                    if (!worldViewId && !values.id) {
                        message.warning('请先选择世界观');
                        return;
                    }
                    setIsEventSubmitting(true);
                    try {
                        await createOrUpdateTimelineEvent(values);
                        notifyAiNovelWriteCompleted({
                            source: 'event',
                            action: values.id ? 'UPDATE' : 'CREATE',
                            api: '/timelineEvent',
                        });
                        message.success(values.id ? '事件已更新' : '事件已创建');
                        setEventEditorOpen(false);
                        setEditingEventId(null);
                        await refreshTimelineEvents();
                    } finally {
                        setIsEventSubmitting(false);
                    }
                }}
            />
        </>
    )
}