import { Button, Divider, Input, Radio, List } from "antd";
import { useState } from "react";

export interface IGeoRecallTestProps {
    recommandQuery: string;
}

export default function(props: IGeoRecallTestProps) {

    let [isManualQuery, setIsManualQuery] = useState(false);
    let [queryText, setQueryText] = useState('');

    return (
        <div>
            <dl>
                <dt>关键词：</dt>
                <dd>
                    <Radio.Group size="small" value={isManualQuery} onChange={e => setIsManualQuery(e.target.value)}>
                        <Radio value={false}>{props.recommandQuery}</Radio>
                        <Radio value={true}><Input size="small" value={queryText} onInput={e => setQueryText}></Input></Radio>
                    </Radio.Group>
                </dd>
                <dd>
                    <Button type="primary" size="small" onClick={e => {}}>召回测试</Button>
                </dd>
            </dl>
            <Divider />
            <p>该功能用于测试地理资源召回的准确性和有效性。</p>
            <p>请在输入框中输入查询内容，然后点击“召回”按钮进行测试。</p>
            <List>
                
            </List>
        </div>
    )
}