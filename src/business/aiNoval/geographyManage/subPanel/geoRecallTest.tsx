import { Button, Divider, Input, Radio, List, Tag, Col, Row, Alert } from "antd";
import { useEffect, useState } from "react";
import fetch from "@/src/fetch";

export interface IGeoRecallTestProps {
    recommandQuery: string;
}

export default function(props: IGeoRecallTestProps) {

    let [isManualQuery, setIsManualQuery] = useState(false);
    let [queryText, setQueryText] = useState('');

    let [recallResults, setRecallResults] = useState([]);

    async function testRecall() {
        const query = isManualQuery ? queryText : props.recommandQuery;
        try {
            const response = await fetch.get('/api/aiNoval/toolConfig/testRecall', {
                params: { datasetName: 'DIFY_GEO_DATASET_ID', query }
            });
            const results = response?.records;
            console.debug('results', response);
            setRecallResults(results);
        } catch (error) {
            console.error('Recall test failed:', error);
        }
    }

    function getColorOfScore(score: number, startColor: string = '#ff4d4f', endColor: string = '#52c41a'): string {
        // Convert hex to RGB
        const start = {
            r: parseInt(startColor.slice(1,3), 16),
            g: parseInt(startColor.slice(3,5), 16),
            b: parseInt(startColor.slice(5,7), 16)
        };
        
        const end = {
            r: parseInt(endColor.slice(1,3), 16),
            g: parseInt(endColor.slice(3,5), 16),
            b: parseInt(endColor.slice(5,7), 16)
        };

        // Interpolate between colors
        const r = Math.round(start.r + (end.r - start.r) * score);
        const g = Math.round(start.g + (end.g - start.g) * score);
        const b = Math.round(start.b + (end.b - start.b) * score);

        // Convert back to hex
        return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
    }

    let lowQuality = false;
    if (recallResults.length > 0) {
        if (!recallResults.some(item => item.score > 0.7)) {
            lowQuality = true;
        }
    }

    useEffect(() => {
        setRecallResults([]);
    }, [props.recommandQuery]);

    return (
        <div>
            <Row>
                <Col span={12}>
                    <p>该功能用于验证地理资源知识库的质量。</p>
                    <p>如要修改，需到dify重新编辑。</p>
                    
                    <dl>
                        <dt>关键词：</dt>
                        <dd>
                            <Radio.Group size="small" value={isManualQuery} onChange={e => setIsManualQuery(e.target.value)}>
                                <Radio value={false}>{props.recommandQuery}</Radio>
                                <Radio value={true}><Input size="small" value={queryText} onInput={e => setQueryText(e.target.value)}></Input></Radio>
                            </Radio.Group>
                        </dd>
                        <dd>
                            <Button type="primary" size="small" onClick={e => testRecall()}>召回测试</Button>
                        </dd>
                    </dl>
                </Col>
                <Col span={12}>
                    {lowQuality && <Alert message="提示" description="召回结果置信度全部小于0.7，请检查Dify知识库质量。" type="warning" showIcon size="small" />}
                </Col>
            </Row>
            <List
                size="small"
                header={<h4>召回结果</h4>}
                dataSource={recallResults}
                renderItem={item => {
                    return (
                        <List.Item>
                            <dl>
                                <p><strong>置信度：</strong><Tag size="small" color={getColorOfScore(item?.score)}>{item?.score}</Tag></p>
                                <p>{item?.segment?.content}</p>
                            </dl>
                        </List.Item>
                    )
                }}
            />
        </div>
    )
}