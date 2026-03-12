'use client';

import { Button, Card, Checkbox, Input, Radio, Space, Typography } from 'antd';
import styles from './index.module.scss';
import { PlusOutlined } from '@ant-design/icons';
import WorldViewSelect from '@/src/components/aiNovel/worldviewSelect';
import EventManage2ContextProvider from './context';
import { useFactions, useGeos, useRoles, useWorldViewId, useNovelId, useTimelines } from './hooks';
import NovelSelect from '@/src/components/aiNovel/novelSelect';
import Figure from './figure';
import { useMemo } from 'react';

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

    const [factionList] = useFactions();
    const [geoList] = useGeos();
    const [roleList] = useRoles();

    const title = (
        <div className="flex flex-row justify-between">
            <Space>
                <Text>关键字：</Text>
                <Input placeholder="请输入关键字" size="small"/>
                <Text>时间范围：</Text>
            </Space>
            <Space>
                <Button type="primary" size="small" icon={<PlusOutlined />}>新增事件</Button>
            </Space>
        </div>
    );

    return (
        <>
            <Card title={title} size="small" styles={{ body: { height: 'calc(100vh - 110px)', overflow: 'auto' } }}>
                {/* <div> */}
                    {/* <pre>{JSON.stringify(factionList, null, 2)}</pre> */}
                    {/* <pre>{JSON.stringify(geoList.map(item => ({ id: item.id, parentId: item.parent_id, name: item.name, code: item.code })), null, 2)}</pre> */}
                    {/* <pre>{JSON.stringify(roleList, null, 2)}</pre> */}
                {/* </div> */}
                <Figure showDebugLayers/>
            </Card>
        </>
    )
}