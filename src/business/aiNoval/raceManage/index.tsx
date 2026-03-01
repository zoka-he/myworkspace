import { useState, useEffect } from 'react';
import useApp from 'antd/lib/app/useApp';
import { Button, Space, Typography } from 'antd';
import NovelSelect from '@/src/components/aiNovel/novelSelect';
import WorldviewSelect from '@/src/components/aiNovel/worldviewSelect';

const { Text } = Typography;

export default function RaceManage() {
    

    const [novelId, setNovelId] = useState<number | null>(null);
    const [worldviewId, setWorldviewId] = useState<number | null>(null);

    function onCreateRace() {
    }

    return (
        <div>
            <div className="flex flex-row justify-between items-center">
                <Space>
                    <Text>世界观：</Text>
                    <WorldviewSelect value={worldviewId} onChange={setWorldviewId} allowClear/>
                    {/* <label htmlFor="">小说：</label>
                    <NovelSelect value={novelId} onChange={setNovelId} /> */}
                </Space>
                <Space>
                    <Button type="primary" onClick={onCreateRace}>新增</Button>
                </Space>
            </div>
        </div>
    )
}