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
                        {/* TODO 柱状图 */}
                        <Graph_ChapterWorkTime data={chapterList} />
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
    const arcTickRef = useRef<SVGGElement>(null);

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
            // draw();
            blink();
        }, 500);
    }

    function draw() {
        drawDimensions();
        adjustClockText();
        adjustArcTick();
        drawChart();
    }

    function adjustClockText() {
        if (!svgRef.current) {
            return;
        }

        const groups = [
            'g.clock_text',
            'g.chapter_count_text',
            'g.hovered_hour_text',
        ]

        d3.select(svgRef.current).selectAll(groups.join(', '))
            .attr('transform', `translate(${svgDimensions.current.width * 0.5}, ${svgDimensions.current.height * 0.48})`);

        d3.select(svgRef.current).selectAll('g.arc_tick')
            .attr('transform', `translate(${svgDimensions.current.width * 0.5}, ${svgDimensions.current.height * 0.5})`)
            .selectAll('path')
    }

    function adjustArcTick(blinkState: boolean = true) {
        if (!svgRef.current) {
            return;
        }

        const centerX = svgDimensions.current.width * 0.5;
        const centerY = svgDimensions.current.height * 0.5;
        const radius = Math.min(svgDimensions.current.width, svgDimensions.current.height) * 0.21;
        const angle = 2 * Math.PI / 24 * (parseInt(hourText) + 0.5);
        const x = centerX + radius * Math.sin(angle);
        const y = centerY - radius * Math.cos(angle);
        const opacity = hourText === null ? 0 : (blinkState ? 0 : 1);

        const trans = [
            `translate(${x}, ${y})`,
            // `translate(${centerX}, ${centerY})`,
            `rotate(${angle * 180 / Math.PI})`,
        ]

        d3.select(svgRef.current).selectAll('g.arc_tick').attr('transform', trans.join(' ')) 
            .attr('opacity', opacity);
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
            // console.debug(`${s}: ${JSON.stringify(num)}`);
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
        const newState = !isBlinking.current;

        d3.select(svgRef.current).selectAll('text.separator')
            .attr('opacity', newState ? 0 : 1);

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
            .attr('opacity', newState ? 0 : 1);

        adjustArcTick(newState);
    }

    function getArcTickData() {
        
    }

    return (
        <div className="f-fit-content" ref={divRef}>
            <svg ref={svgRef} width="100%" height="100%">
                <g ref={arcBarsRef} className="arc_bars"></g>
                <g ref={arcTickRef} className="arc_tick">
                    <path d="M 0 0 L -2 2 L -2 7 L 2 7 L 2 2 z" fill="red" />
                </g>
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

declare type WorkTimeSummaryDataItem = {
    start: number;
    duration: number;
}

declare type WorkTimeSummaryGroupedData = {
    hour: number;
    min: number;
    max: number;
    mid: number;
    avg: number;
    count: number;
}

declare type WorkTimeSummaryData = {
    minX: number;
    maxX: number;
    minY: number;
    midY: number;
    avgY: number;
    maxY: number;
    groupedData: WorkTimeSummaryGroupedData[];
    data: WorkTimeSummaryDataItem[];
}

declare type WorkTimeSummaryConfig = {
    padding: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    },
}

function Graph_ChapterWorkTime(props: IGraphProps) {

    const svgRef = useRef<SVGSVGElement>(null);
    const divRef = useRef<HTMLDivElement>(null);
    const xAxisRef = useRef<SVGGElement>(null);
    const yAxisRef = useRef<SVGGElement>(null);
    const dotsRef = useRef<SVGGElement>(null);
    const axisLabelsRef = useRef<SVGGElement>(null);
    const linesRef = useRef<SVGGElement>(null);

    const svgDimensions = useRef({ width: 0, height: 0 });

    useEffect(() => {
        const resizeObserver = observeResize();

        draw();

        return () => {
            resizeObserver?.disconnect();
        };
    }, []);

    useEffect(() => {
        draw();
    }, [props.data]);

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

    function draw() {
        const data = processData();
        drawDimensions();

        const width = svgDimensions.current.width;
        const height = svgDimensions.current.height;

        const config: WorkTimeSummaryConfig = {
            padding: {
                top: 20,
                right: 10,
                bottom: 30,
                left: 55,
            },
        }

        const x = d3.scaleLinear()
            .domain([data.minX, data.maxX])
            .range([config.padding.left, width - config.padding.right]);

        const y = d3.scaleLinear()
            .domain([0, 48]) // 存疑，可以采用不同的指标
            .range([height - config.padding.bottom, config.padding.top]);

        drawXAxis(config, data, x);
        drawYAxis(config, data, y);
        drawDots(config, data, x, y);
        drawLines(config, data, x, y);
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

    function processData() {
        const ret: WorkTimeSummaryData = {
            data: [],
            groupedData: [],
            minX: 0,
            maxX: 24,
            minY: 0,
            midY: 0,
            avgY: 0,
            maxY: 0,

        }

        if (props.data && props.data.length > 0) {
            ret.data = props.data.map(item => {
                let start = dayjs(item.created_at).unix() - dayjs(item.created_at).startOf('day').unix();
                let duration = dayjs(item.updated_at).unix() - dayjs(item.created_at).unix();

                return {
                    start: start / 3600,
                    duration: duration / 3600,
                }
            })

            ret.minY = d3.min(ret.data, d => d.duration) || 0;
            ret.maxY = d3.max(ret.data, d => d.duration) || 0;
            ret.midY = d3.median(ret.data, d => d.duration) || 0;
            ret.avgY = d3.mean(ret.data, d => d.duration) || 0;
        }

        let groupedData = d3.rollup(
            ret.data,
            v => {
                return {
                    min: d3.min(v, d => d.duration) || 0,
                    max: d3.max(v, d => d.duration) || 0,
                    mid: d3.median(v, d => d.duration) || 0,
                    avg: d3.mean(v, d => d.duration) || 0,
                    std: d3.deviation(v, d => d.duration) || 0,
                    count: v.length,
                }
            },
            d => Math.floor(d.start)
        );

        ret.groupedData = Array.from({ length: 24 }, (_, i) => {
            return Object.assign<WorkTimeSummaryGroupedData, Partial<WorkTimeSummaryGroupedData>>({
                hour: i,
                min: 0,
                max: 0,
                mid: 0,
                avg: 0,
                count: 0,
            }, groupedData.get(i) || {});
        });

        console.debug('processData', ret);

        return ret;
    }

    

    function drawXAxis(config: WorkTimeSummaryConfig, data: WorkTimeSummaryData, x: d3.ScaleLinear<number, number>) {
        if (!svgRef.current) {
            return;
        }

        const xAxis = d3.select(xAxisRef.current);
        xAxis.attr('transform', `translate(0, ${svgDimensions.current.height - config.padding.bottom})`);
        xAxis.call(d3.axisBottom(x).tickSizeOuter(0) as any);

        const labelSelection = d3.select(axisLabelsRef.current).selectAll('text');
        let xAxisLabel: SVGTextElement | null = labelSelection.nodes()[0] as SVGTextElement | undefined || null;
        if (!xAxisLabel) {
            xAxisLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            const axisLabelsNode = axisLabelsRef.current as SVGGElement | null;
            if (axisLabelsNode) {
                axisLabelsNode.appendChild(xAxisLabel);
            }
        }
        d3.select(xAxisLabel)
            .attr('x', svgDimensions.current.width / 2 + (config.padding.left - config.padding.right) / 2)
            .attr('y', svgDimensions.current.height - config.padding.bottom + 25)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '12px')
            .attr('fill', '#000')
            .text('开始时间');
    }

    function drawYAxis(config: WorkTimeSummaryConfig, data: WorkTimeSummaryData, y: d3.ScaleLinear<number, number>) {
        if (!svgRef.current) {
            return;
        }

        const yAxis = d3.select(yAxisRef.current);
        yAxis.attr('transform', `translate(${config.padding.left}, 0)`);
        yAxis.call(
            d3.axisLeft(y)
                .tickSizeOuter(0)
                .tickValues([0, 12, 24, 36, 48])
                .tickFormat((_, i) => ['', '12h', '1d', '1.5d', '2d'][i]) as any
        );

        const labelSelection = d3.select(axisLabelsRef.current).selectAll('text');
        let yAxisLabel: SVGTextElement | null = labelSelection.nodes()[1] as SVGTextElement | undefined || null;

        if (!yAxisLabel) {
            // Create the second <text> element if missing (assume need to append to parent)
            yAxisLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            const axisLabelsNode = axisLabelsRef.current as SVGGElement | null;
            if (axisLabelsNode) {
                axisLabelsNode.appendChild(yAxisLabel);
            }
        }

        // d3.select(yAxisLabel) is type-safe since yAxisLabel is SVGTextElement
        d3.select(yAxisLabel)
            .attr('x', config.padding.left - 20)
            .attr('y', 10)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '12px')
            .attr('fill', '#000')
            .text('时长');
    }

    function drawDots(config: WorkTimeSummaryConfig, data: WorkTimeSummaryData, x: d3.ScaleLinear<number, number>, y: d3.ScaleLinear<number, number>) {
        if (!svgRef.current) {
            return;
        }

        const g_dots = d3.select(dotsRef.current).selectAll<SVGGElement, WorkTimeSummaryDataItem>('g.dot-group')
            .data(data.data);
        const g_dots_new = g_dots.enter().append('g').attr('class', 'dot-group');
        const g_dots_exit = g_dots.exit();

        g_dots_new.append('circle').attr('class', 'dot')

        g_dots.merge(g_dots_new)
            .selectAll<SVGCircleElement, WorkTimeSummaryDataItem>('circle.dot')
            .data(d => [d])
            .attr('cx', d => x(d.start))
            .attr('cy', d => y(d.duration))
            .attr('r', 2)
            .attr('fill', '#000777')
            .attr('opacity', 0.2);
        
        g_dots_exit.remove();
    }

    function drawLines(config: WorkTimeSummaryConfig, data: WorkTimeSummaryData, x: d3.ScaleLinear<number, number>, y: d3.ScaleLinear<number, number>) {
        if (!svgRef.current) {
            return;
        }

        // const avgLine = d3.select(linesRef.current).selectAll<SVGPathElement, WorkTimeSummaryGroupedData[]>('path.avg_line')
        //     .data([data.groupedData]);
        // const avgLineNew = avgLine.enter().append('path').attr('class', 'avg_line');
        // const avgLineExit = avgLine.exit();
        
        // avgLine.merge(avgLineNew)
        //     .attr('d', d => d3.line<WorkTimeSummaryGroupedData>()
        //         .curve(d3.curveBumpX)
        //         .x(d => x(d.hour))
        //         .y(d => y(d.avg))
        //         (d)
        //     )
        //     .attr('fill', 'none')
        //     .attr('stroke', '#ef7e00')
        //     .attr('stroke-width', 1);

        const midLine = d3.select(linesRef.current).selectAll<SVGPathElement, WorkTimeSummaryGroupedData[]>('path.mid_line')
            .data([data.groupedData]);
        const midLineNew = midLine.enter().append('path').attr('class', 'mid_line');
        const midLineExit = midLine.exit();
        
        midLine.merge(midLineNew)
            .attr('d', d => d3.line<WorkTimeSummaryGroupedData>()
                .curve(d3.curveBumpX)
                .x(d => x(d.hour))
                .y(d => y(d.mid))
                (d)
            )
            .attr('fill', 'none')
            .attr('stroke', '#00d05f')
            .attr('stroke-width', 1);

        // avgLineExit.remove();
        midLineExit.remove();
    }

    return (
        <div className="f-fit-content" ref={divRef}>
            <svg ref={svgRef} width="100%" height="100%">
                <g className="axis_labels" ref={axisLabelsRef}>
                    <text></text>
                    <text></text>
                </g>
                <g className="x_axis" ref={xAxisRef}></g>
                <g className="y_axis" ref={yAxisRef}></g>
                <g className="dots" ref={dotsRef}></g>
                <g className="lines" ref={linesRef}></g>
            </svg>
        </div>
    )
}

