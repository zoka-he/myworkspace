import { useEffect, useMemo, useRef, useState } from 'react';
import { getNovelList, getChapterList } from '@/src/api/aiNovel';
import { IChapter, INovalData } from '../chapterManage/types';
import { Table, Col, Row, Typography, Card, Space, Radio } from 'antd';
import styles from './chapterDuration.module.scss';
import dayjs from 'dayjs';
import * as d3 from 'd3';
import { useTheme } from '@/src/utils/hooks/useTheme';

export default function ChapterDuration() {
    const [novelList, setNovelList] = useState<INovalData[]>([]);
    const [selectedNovelIds, setSelectedNovelIds] = useState<number[]>([]);

    useEffect(() => {
        getNovelList().then(response => {
            setNovelList(response.data);
        });
    }, []);

    const graphNovelIds = useMemo(() => {
        if (selectedNovelIds.length === 0) {
            return novelList.map(novel => novel.id as number);
        }

        return selectedNovelIds;
    }, [selectedNovelIds]);

    const columns = [
        {
            title: '小说名称',
            dataIndex: 'title',
            key: 'title',
        },
    ];

    return (
        <div className="f-flex-row f-fit-content" style={{ gap: '10px' }}>
            <div className={styles.novelList}>
                <Table dataSource={novelList} 
                    columns={columns} 
                    size="small" 
                    pagination={false} 
                    rowKey="id"
                    rowSelection={{
                        type: 'checkbox',
                        onChange: (selectedRowKeys: React.Key[], selectedRows: INovalData[]) => {
                            setSelectedNovelIds(selectedRows.map(row => row.id as number));
                        },
                    }}
                />
            </div>
            <div className="f-flex-1">
                <SummaryD3GraphContainer novelIds={graphNovelIds} />
            </div>
        </div>
    )
}

interface SummaryD3GraphContainerProps {
    novelIds: number[];
}

function SummaryD3GraphContainer({ novelIds }: SummaryD3GraphContainerProps) {

    const text = JSON.stringify(novelIds);

    const [finishDateMode, setFinishDateMode] = useState<'count' | 'duration'>('count');

    const [chapterList, setChapterList] = useState<IChapter[]>([]);

    useEffect(() => {
        queryChapters();
    }, [novelIds]);

    useEffect(() => {
        queryChapters();
    }, []);

    async function queryChapters() {
        if (novelIds.length === 0) {
            setChapterList([]);
            return;
        }
        const response = await getChapterList(novelIds[0], 1, 10000);
        setChapterList(response.data);
    }

    return (
        <div className={styles.summaryD3GraphContainer}>

            <Row gutter={10}>
                <Col span={8}>
                    <Card title="章节创建时点分析" size="small">
                        {/* TODO 24小时太阳图 */}
                        <Graph_ChapterCreateHour data={chapterList} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card title="写作耗时分析" size="small">
                        TODO 柱状图
                    </Card>
                </Col>
                <Col span={8}>
                    <Card title="完成时点分析" size="small">
                        {/* TODO 24小时太阳图 */}
                        <Graph_ChapterUpdateHour data={chapterList} />
                    </Card>
                </Col>
            </Row>

            <Row gutter={10}>
                <Col span={12}>
                    <Card title="章节创建日期分析" size="small">
                        TODO 日历图，颜色深度代表创建数量
                    </Card>
                </Col>

                <Col span={12}>
                    <Card title={ 
                            <Space>
                                <Typography.Text>章节完成日期分析（颜色表示：</Typography.Text>
                                <Radio.Group 
                                    // buttonStyle="solid"
                                    value={finishDateMode} 
                                    onChange={e => setFinishDateMode(e.target.value as 'count' | 'duration')}
                                >
                                    <Radio value="count">数量</Radio>
                                    <Radio value="duration">耗时</Radio>
                                </Radio.Group>
                                <Typography.Text>）</Typography.Text>
                            </Space> 
                        } 
                        size="small"
                    >
                        TODO 日历图，颜色深度代表完成数量，或完成耗时
                    </Card>
                </Col>
                
            </Row>

            
        </div>
    )
}


interface IGraphProps {
    data?: any[];
}

function Graph_ChapterCreateHour(props: IGraphProps) {
    const data = Array.from(props.data || []).map(item => {
        return {
            date: item.created_at,
        }
    });

    const chapterCountText = (total: number, count: number): [string, string] => {

        // let percentage = total > 0 ? Math.round((count / total) * 100) : 0;

        return [
            '你在这段时间里',
            `开始了(${count}/${total})的章节`,
        ]
    }

    return <HourCircleGraph data={data} colorInterpolator={d3.interpolateSpectral} chapterCountText={chapterCountText} />;
}

function Graph_ChapterUpdateHour(props: IGraphProps) {
    const data = Array.from(props.data || []).map(item => {
        return {
            date: item.updated_at,
        }
    });

    const chapterCountText = (total: number, count: number): [string, string] => {
        // let percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        return [
            '你在这段时间里',
            `完成了(${count}/${total})的章节`,
        ]
    }

    return <HourCircleGraph data={data} colorInterpolator={d3.interpolateSpectral} chapterCountText={chapterCountText} />;
}

interface IHourCircleGraphProps extends IGraphProps {
    colorInterpolator?: (t: number) => string;
    chapterCountText: (total: number, count: number) => [string, string];
}

function HourCircleGraph(props: IHourCircleGraphProps) {

    const svgRef = useRef<SVGSVGElement>(null);
    const divRef = useRef<HTMLDivElement>(null);
    const arcBarsRef = useRef<SVGGElement>(null);

    const svgDimensions = useRef({ width: 0, height: 0 });

    const [hourText, setHourText] = useState<string>('');
    const [minuteText, setMinuteText] = useState<string>('');
    const [chapterCountText, setChapterCountText] = useState<[string, string]>(['', '']);

    const [hoveredHour, setHoveredHour] = useState<number | null>(null);

    const isBlinking = useRef(false);

    // 获取主题颜色
    const { textColor } = useTheme();

    const text = (props.data || []).map(item => dayjs(item.date).hour()).join('\n');

    useEffect(() => {
        const resizeObserver = observeResize();
        const timer = createTimer();
        return () => {
            resizeObserver?.disconnect();
            clearInterval(timer);
        };
    }, []);

    useEffect(() => {
        draw();
    }, []);

    useEffect(() => {
        draw();
    }, [props.data, svgRef.current]);

    useEffect(() => {
        let totalCount = props.data?.length || 0;
        let targetHour = (hoveredHour === null) ? parseInt(hourText) : hoveredHour;
        let targetHourCount = props.data?.filter(item => dayjs(item.date).hour() === targetHour).length || 0;
        setChapterCountText(props.chapterCountText(totalCount, targetHourCount));
    }, [hourText, hoveredHour, props.data]);

    function observeResize() {
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                svgDimensions.current = { width, height };
            }

            draw();
        });
        
        if (!divRef.current) {
            return;
        }

        resizeObserver.observe(divRef.current);
        return resizeObserver;
    }

    function createTimer() {
        return setInterval(() => {
            const now = dayjs();
            setHourText(now.hour().toString().padStart(2, '0'));
            setMinuteText(now.minute().toString().padStart(2, '0'));
            blink();
        }, 500);
    }

    function draw() {
        drawDimensions();
        adjustClockText();
        drawChart();
    }

    function adjustClockText() {
        if (!svgRef.current) {
            return;
        }

        d3.select(svgRef.current).selectAll('g.clock_text, g.chapter_count_text, g.hovered_hour_text')
            .attr('transform', `translate(${svgDimensions.current.width * 0.5}, ${svgDimensions.current.height * 0.48})`);
    }

    // 显示分辨率，用于调试
    function drawDimensions() {
        if (!svgRef.current) {
            return;
        }

        let textNode = d3.select(svgRef.current).selectAll('text.dimension').data([svgDimensions.current]);
        textNode.enter()
            .append('text').attr('class', 'dimension')
            .merge(textNode as any)
            .text(d => `${d.width}x${d.height}`)
            .attr('x', d => d.width)
            .attr('y', 12)
            .attr('text-anchor', 'end')
            .attr('font-size', 12)
            .attr('fill', '#000');
        textNode.exit().remove();
    }

    

    function drawChart() {
        if (!arcBarsRef.current) {
            return;
        }

        let innerRadius = Math.min(svgDimensions.current.width, svgDimensions.current.height) * 0.22;
        let outerRadius = Math.min(svgDimensions.current.width, svgDimensions.current.height) * 0.45;

        // 使用d3的分类汇总方法，根据props.data的created_at时间戳字段的小时，统计每个小时有多少条数据
        let dataGroupByHour = d3.rollup(
            props.data || [],
            v => v.length,
            d => dayjs(d.date).hour()
        );

        let x = d3.scaleBand()
            .domain(Array.from({ length: 24 }, (_, i) => i.toString()))
            .range([0, 2 * Math.PI])
            .paddingInner(0.01)
            .paddingOuter(0);

        const maxValue = d3.max(Array.from(dataGroupByHour.values()), d => d) || 0;

        let y = d3.scaleLinear()
            .domain([0, maxValue])
            .range([innerRadius, outerRadius]);

        let color = d3.scaleSequential()
            .domain([0, 23])
            .interpolator(props.colorInterpolator || d3.interpolateRdYlGn)
            .unknown('#ccc');

        function debugResult(s: string, num: any) {
            console.debug(`${s}: ${JSON.stringify(num)}`);
            return num;
        }

        let arc = d3.arc<[number, number]>()
            .innerRadius(debugResult('y(0)', y(0)))
            .outerRadius(d => debugResult('y(d[1])', y(d[1])))
            .startAngle(d => debugResult('x(d[0].toString())', x(d[0].toString()) || 0))
            .endAngle(d => {
                const startAngle = x(d[0].toString()) || 0;
                const bandwidth = x.bandwidth();
                return debugResult('x(d[0].toString()) + x.bandwidth()', startAngle + bandwidth);
            })
            .padAngle(1.5 / innerRadius);


        // 使用键函数确保数据正确绑定，避免分辨率改变时清空元素
        let arcNodeSet = d3.select(arcBarsRef.current).selectAll('g.arc_node')
            .data(dataGroupByHour, (d: any) => (d as [number, number])[0]);
        let newArcNodeSet = arcNodeSet.enter().append('g').attr('class', 'arc_node');
        let exitArcNodeSet = arcNodeSet.exit();

        // newArcNodeSet.append('text');
        newArcNodeSet.append('path').attr('class', 'shadow');
        newArcNodeSet.append('path').attr('class', 'actual');

        arcNodeSet = arcNodeSet.merge(newArcNodeSet as any);

        // 更新所有节点（包括已存在的）的 transform 和 data-hour，因为分辨率改变时中心点会变化
        arcNodeSet.attr('transform', `translate(${svgDimensions.current.width / 2}, ${svgDimensions.current.height / 2})`)
            .attr('data-hour', d => (d as [number, number])[0]);

        arcNodeSet.selectAll('path.shadow')
            .attr('d', d => {
                const data = d as [number, number];
                return debugResult('arc(d)', arc([
                    data[0],
                    y.domain()[1]
                ]));
            })
            .attr('fill', '#777')
            .attr('opacity', 0)
            .on('mouseenter', function(d) {
                // 正确获取 D3 v6 及以上的 data 推荐用 event.currentTarget.__data__ 或 d3.select(this).datum()
                const hourData = d3.select(this).datum() as [number, number];
                setHoveredHour(hourData[0]);
                d3.select(this).attr('opacity', 0.1);
            })
            .on('mouseout', function() {
                setHoveredHour(null);
                d3.select(this).attr('opacity', 0);
            });

        arcNodeSet.selectAll('path.actual')
            .attr('pointer-events', 'none')
            .attr('d', d => {
                const data = d as [number, number];
                return debugResult('arc(d)', arc(data));
            })
            .attr('fill', d => {
                const data = d as [number, number];
                return color(data[0]);
            })
            .attr('opacity', d => {
                // 保持闪烁状态：如果当前小时匹配且正在闪烁，则设置 opacity 为 0，否则为 1
                const data = d as [number, number];
                const currentHour = parseInt(hourText);
                if (!isNaN(currentHour) && data[0] === currentHour && isBlinking.current) {
                    return 0;
                }
                return 1;
            });

        exitArcNodeSet.remove();
    }

    function blink() {
        isBlinking.current = !isBlinking.current;

        d3.select(svgRef.current).selectAll('text.separator')
            .attr('opacity', isBlinking.current ? 0 : 1);

        // 只有当 hourText 有效时才执行闪烁
        if (!hourText || hourText === '') {
            return;
        }

        const currentHour = parseInt(hourText);
        if (isNaN(currentHour)) {
            return;
        }

        // 选择当前小时的 arc_node，然后选择其下的 path.actual
        // 由于已经通过 data-hour 属性筛选了，所以直接设置 opacity 即可
        d3.select(arcBarsRef.current).selectAll(`g.arc_node[data-hour="${currentHour}"]`)
            .selectAll('path.actual')
            .attr('opacity', isBlinking.current ? 0 : 1);
    }

    return (
        <div className="f-fit-content" ref={divRef}>
            <svg ref={svgRef} width="100%" height="100%">
                <g ref={arcBarsRef} className="arc_bars"></g>
                <g className="clock_text" opacity={hoveredHour === null ? 1 : 0}>
                    <text x="0" y="-12" textAnchor="middle" dominantBaseline="middle" fontSize="10px" fontWeight="bold" fill={textColor}>现在是</text>
                    <text x="-12" y="3" textAnchor="middle" dominantBaseline="middle" fontSize="12px" fontWeight="bold" fill={textColor}>{hourText}</text>
                    <text x="0" y="1.5" textAnchor="middle" dominantBaseline="middle" fontSize="12px" fontWeight="bold" fill={textColor} className="separator">:</text>
                    <text x="12" y="3" textAnchor="middle" dominantBaseline="middle" fontSize="12px" fontWeight="bold" fill={textColor}>{minuteText}</text>
                </g>
                <g className="hovered_hour_text" opacity={hoveredHour === null ? 0 : 1}>
                    <text x="0" y="-12" textAnchor="middle" dominantBaseline="middle" fontSize="10px" fontWeight="bold" fill={textColor}>当前时间段是</text>
                    <text x="-12" y="3" textAnchor="middle" dominantBaseline="middle" fontSize="12px" fontWeight="bold" fill={textColor}>{(hoveredHour === null) ? '' : hoveredHour}</text>
                    <text x="0" y="1.5" textAnchor="middle" dominantBaseline="middle" fontSize="12px" fontWeight="bold" fill={textColor}>-</text>
                    <text x="12" y="3" textAnchor="middle" dominantBaseline="middle" fontSize="12px" fontWeight="bold" fill={textColor}>{(hoveredHour === null) ? '' : (hoveredHour === 23 ? 0 : (hoveredHour + 1))}</text>
                </g>
                <g className="chapter_count_text">
                    <text x="0" y="17" textAnchor="middle" dominantBaseline="middle" fontSize="9px" fontWeight="normal" fill="#777">{chapterCountText[0]}</text>
                    <text x="0" y="28" textAnchor="middle" dominantBaseline="middle" fontSize="9px" fontWeight="normal" fill="#777">{chapterCountText[1]}</text>
                </g>
            </svg>
        </div>
    )
}

