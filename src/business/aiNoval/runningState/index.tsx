import { Card, Radio } from "antd";
import RabbitMqState from "./rabbitMqState";
import { useState } from "react";

export default function RunningState() {

    const [activePanel, setActivePanel] = useState('rabbitMq');

    const title = (
        <div style={{ textAlign: 'center' }}>
        <Radio.Group value={activePanel} onChange={e => setActivePanel(e.target.value)} buttonStyle="solid" optionType="button" size="small">
            <Radio.Button value="rabbitMq">RabbitMQ状态</Radio.Button>
        </Radio.Group>
        </div>
    )

    let Content = <div>不支持的面板...</div>;

    switch (activePanel) {
        case 'rabbitMq':
            Content = <RabbitMqState />;
            break;
    }

    return (
        <Card title={title} size="small">
            <div style={{ 'height': 'calc(100vh - 135px)', 'overflow': 'auto' }}>
                {Content}
            </div>
        </Card>
    )
}