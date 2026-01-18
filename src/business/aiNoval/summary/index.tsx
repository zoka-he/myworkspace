import { Switch, Radio, Layout, Card } from 'antd';
import BussSwitchProvider, { useBussSwitchContext } from './switchProvider';
import ChapterDuration from './chapterDuration';

function Summary() {
    return (
        <BussSwitchProvider>
            <Card title={<Switcher />}>
                <Content />
            </Card>
        </BussSwitchProvider>
    )
}

function Switcher() {
    const { state, setCurrentBuss } = useBussSwitchContext();
    
    return (
        <div style={{ textAlign: 'center' }}>
        <Radio.Group buttonStyle="solid" value={state.currentBuss} onChange={e => setCurrentBuss(e.target.value)}>
            <Radio.Button value="chapterDuration">章节工时分析</Radio.Button>
        </Radio.Group>
        </div>
    )
}

function Content() {
    const { state } = useBussSwitchContext();

    let content: React.ReactNode = "暂未支持的模式";

    switch (state.currentBuss) {
        case "chapterDuration":
            content = <ChapterDuration />;
            break;
    }

    return (
        <div style={{ height: 'calc(100vh - 175px)', overflow: 'hidden' }}>
            {content}
        </div>
    )
}

export default Summary;