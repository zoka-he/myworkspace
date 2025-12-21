import { useEffect } from 'react'
import SimpleTimelineProvider, { useSimpleTimelineProvider } from '../common/SimpleTimelineProvider'
import SimpleWorldviewProvider, { useSimpleWorldviewContext } from '../common/SimpleWorldviewProvider';
import SimpleFactionProvider, { useSimpleFactionContext } from '../common/SimpleFactionProvider';
import TimelineManageProvider, { useTimelineManageContext } from './timelineManageProvider';
import { Button, Card, Radio, Select, Typography, Checkbox } from 'antd';
const { Text } = Typography;
import styles from './index.module.scss';
import EditOrCreateTimeline from './EditOrCreateTimeline';

export default function TimelineManage() {
    return (
        <SimpleWorldviewProvider>
            <SimpleFactionProvider>
                <SimpleTimelineProvider>
                    <TimelineManageProvider>
                        <Init>
                            <div className={styles.timelineManageLayout}>
                                {/* <h1>Timeline Manage</h1> */}
                                <TimelineList />
                                <TimelineEditCard />
                            </div>
                        </Init>
                    </TimelineManageProvider>
                </SimpleTimelineProvider>
            </SimpleFactionProvider>
        </SimpleWorldviewProvider>
    )
}

function Init({ children }: { children: React.ReactNode }) {
    return children;
}

function TimelineList() {
    const { state: timelineState, loadTimelineList } = useSimpleTimelineProvider();
    const { state: worldviewState, loadWorldviews, setWorldviewId } = useSimpleWorldviewContext();
    const { state: factionState } = useSimpleFactionContext();
    const { state: timelineManageState, setCompareIds, setSelectedTimelineId } = useTimelineManageContext();

    async function handleRefreshWorldViewList() {
        if (!worldviewState.worldviewId) {
            return;
        }
        await loadTimelineList(worldviewState.worldviewId);
    }

    function handleWorldviewIdChange(value: number | null) {
        setWorldviewId(value);
        setCompareIds([]);
        setSelectedTimelineId(null);
    }

    function handleNewEpochClick() {
        console.log('handleNewEpochClick');
    }

    let ListComponent = () => <div>不支持的模式...</div>

    if (timelineManageState.mode === 'compare') {
        ListComponent = TimelineCheckList;
    }

    if (timelineManageState.mode === 'edit' || timelineManageState.mode === 'create') {
        ListComponent = TimelineRadioList;
    }

    return (
        <Card className={styles.timelineListCard} styles={{ body: { padding: 0 } }}
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text>选择世界观：</Text>
                    <Select
                        style={{ flex: 1, maxWidth: 300 }}
                        placeholder="请选择世界观"
                        value={worldviewState.worldviewId || undefined}
                        onChange={handleWorldviewIdChange}
                        // allowClear
                    >
                        {worldviewState.worldviewList.map(worldview => (
                            <Select.Option key={worldview.id} value={worldview.id}>
                                {worldview.title || `世界观 ${worldview.id}`}
                            </Select.Option>
                        ))}
                    </Select>
                    <Button type="primary" onClick={handleRefreshWorldViewList}>刷新</Button>
                </div>
            }
        >
            <div style={{ padding: 16, height: 'calc(100vh - 130px)', overflow: 'auto' }}>
                <ListComponent />
            </div>
        </Card>
    )
}

function TimelineEditCard() {

    const { state: timelineState } = useSimpleTimelineProvider();
    const { state: timelineManageState, setMode } = useTimelineManageContext();

    let EditComponent = () => <div>不支持的模式...</div>
    if (timelineManageState.mode === 'edit' || timelineManageState.mode === 'create') {
        EditComponent = EditOrCreateTimeline;
    }

    return (
        <Card className={styles.timelineEditCard}
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Radio.Group value={timelineManageState.mode} onChange={(e: any) => setMode(e.target.value)}>
                        <Radio.Button value="compare">比较</Radio.Button>
                        <Radio.Button value="edit">编辑</Radio.Button>
                        {/* <Radio.Button value="create">新建</Radio.Button> */}
                    </Radio.Group>
                    <Button type="primary" onClick={() => setMode('create')}>新建纪元</Button>
                </div>
            }
        >
            <div>
                {(timelineManageState.mode !== 'create' && !timelineState.timelineData) ? (
                    <Text>未选择时间线</Text>
                ) : (
                    <EditComponent />
                )}
            </div>
            
        </Card>
    )
}

function FactionGroup(props: { factionId: string }) {
    const { state: factionState } = useSimpleFactionContext();
    const faction = factionState.factionList.find(faction => '' + faction.id === props.factionId);
    return (
        <Text strong>{faction?.name || '无阵营'}</Text>
    )
}

function TimelineCheckList() {
    const { state: timelineState } = useSimpleTimelineProvider();
    const { state: timelineManageState, setCompareIds } = useTimelineManageContext();

    // 根据 faction_id 分组
    const groupedTimelines = timelineState.timelineList.reduce((acc, timeline) => {
        const factionId = timeline.faction_id || 0;
        if (!acc[factionId]) {
            acc[factionId] = [];
        }
        acc[factionId].push(timeline);
        return acc;
    }, {} as Record<number, typeof timelineState.timelineList>);

    const handleChange = (checkedValues: any[]) => {
        setCompareIds(checkedValues.map(v => Number(v)));
    };

    return (
        <Checkbox.Group 
            value={timelineManageState.compare_ids.map(id => String(id))} 
            onChange={handleChange}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
            {Object.entries(groupedTimelines).map(([factionId, timelines]) => (
                <div key={factionId} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <FactionGroup factionId={factionId} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 16 }}>
                        {timelines.sort((a, b) => a.start_seconds - b.start_seconds).map(timeline => (
                            <Checkbox key={timeline.id} value={String(timeline.id)}>
                                {timeline.epoch}
                            </Checkbox>
                        ))}
                    </div>
                </div>
            ))}
        </Checkbox.Group>
    );
}

function TimelineRadioList() {
    const { state: timelineState, setTimelineId } = useSimpleTimelineProvider();
    const { state: timelineManageState, setSelectedTimelineId, setMode } = useTimelineManageContext();

    // 根据 faction_id 分组
    const groupedTimelines = timelineState.timelineList.reduce((acc, timeline) => {
        const factionId = timeline.faction_id || 0;
        if (!acc[factionId]) {
            acc[factionId] = [];
        }
        acc[factionId].push(timeline);
        return acc;
    }, {} as Record<number, typeof timelineState.timelineList>);

    const handleChange = (e: any) => {
        const timelineId = e.target.value;
        // 转为编辑模式
        if (timelineManageState.selectedTimelineId === null) {
            setMode('edit');
        }
        setSelectedTimelineId(timelineId);
        setTimelineId(timelineId);
    };

    return (
        <Radio.Group 
            value={timelineManageState.selectedTimelineId} 
            onChange={handleChange}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
            {Object.entries(groupedTimelines).map(([factionId, timelines]) => (
                <div key={factionId} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <FactionGroup factionId={factionId} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 16 }}>
                        {timelines.sort((a, b) => a.start_seconds - b.start_seconds).map(timeline => (
                            <Radio key={timeline.id} value={timeline.id}>
                                {timeline.epoch}
                            </Radio>
                        ))}
                    </div>
                </div>
            ))}
        </Radio.Group>
    );
}
