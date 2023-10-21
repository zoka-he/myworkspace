import { memo, useEffect, useRef } from "react";
import * as d3 from 'd3';
import { ICumulativeData } from "./ICumulativeData";
import _, { divide } from 'lodash';
import DayJS from 'dayjs';

const seriesDef = {
    'datestr': '日期',
    'not_started': '未开始',
    'developing': '执行中',
    'testing': '验证中',
    'fuckable': '待上线',
    'finished': '已完成',
}

interface ILegendProps {
    color: Function
    items: { [key: string]: string }
}

function Legend(props: ILegendProps) {
    let lis = Object.entries(props.items).map(([k, v]) => {
        return (
            <li className="m-legend">
                <div className="m-legend-marker" style={{ backgroundColor: props.color(k) }}>&nbsp;</div>
                <span style={{ color: '#555' }}>{v}</span>
            </li>
        )
    });

    return (
        <ul className="m-legend-grp">{lis}</ul>
    )
}

/**
 * 初始化D3对象
 * @param context  
 */
class FigureInstance {

    public width = 640;
    public height = 400;

    public marginTop = 20;
    public marginRight = 40;
    public marginBottom = 30;
    public marginLeft = 40;

    public data: ICumulativeData[] = [];
    private seriesKey: string[] = ['finished', 'fuckable', 'testing', 'developing', 'not_started'];
    private series?: d3.Series<{ [key: string]: number; }, string>[];
    public colorScale: d3.ScaleOrdinal<string, unknown, never>;

    private svg: d3.Selection<SVGSVGElement, unknown, null, any>;
    private x;
    private xaxis;
    private y;
    private yaxis;

    private paths?: string & d3.Selection<SVGPathElement | null, d3.Series<{ [key: string]: number; }, string>, SVGGElement, unknown>;
    private points;

    private tooltipPos: number = -1;
    private tooltip;


    constructor(context: HTMLDivElement, initData: ICumulativeData[]) {

        // 计算图表区域
        this.width = context.clientWidth - this.marginLeft - this.marginRight;
        this.height = Math.max(500, context.clientHeight - this.marginTop - this.marginBottom);

        console.debug(context.clientWidth, this.width);
        console.debug(context.offsetWidth, this.width);

        // 创建svg画布
        this.svg = d3.select(context).append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('viewbox', `0 0 ${this.width} ${this.height}`)
            .style('margin', `${this.marginTop}px ${this.marginRight}px ${this.marginBottom}px ${this.marginLeft}px `);


        // 定义x坐标系
        this.x = d3.scaleUtc()
            .domain(this.getXRange())
            .range([this.marginLeft, this.width - this.marginRight]);

        // 定义y坐标系
        this.y = d3.scaleLinear()
            .domain(this.getYRange())
            .range([this.height - this.marginBottom, this.marginTop]);

        // 添加x轴控件
        this.xaxis = this.svg.append("g")
            .attr("transform", `translate(0,${this.height - this.marginBottom})`)
            .call(d3.axisBottom(this.x));

        // 添加y轴控件
        this.yaxis = this.svg.append("g")
            .attr("transform", `translate(${this.marginLeft},0)`)
            .call(d3.axisLeft(this.y).tickSize(1));

        // 颜色主题
        this.colorScale = d3.scaleOrdinal().domain(this.seriesKey).range(d3.schemeTableau10);    

        // 绘制折线图  
        if (!(initData instanceof Array)) {
            initData = [];
        }

        this.setData(initData);

        // 定义游标
        // this.tooltip = this.createTooltip();

        // 初始化事件
        this.initEvents();
    }

    /**
     * 获得x轴数值范围
     * @returns 
     */
    private getXRange() {
        let range;

        if (!this.data.length) {
            range = [
                DayJS().startOf('day').subtract(1, 'day').toDate(),
                DayJS().startOf('day').toDate(),
            ]
        } else {
            range = [
                DayJS(this.data[0].datestr, 'YYYYMMDD'),
                DayJS(this.data[this.data.length - 1].datestr, 'YYYYMMDD'),
            ]
        }

        console.debug('getXRange', range);
        return range;
    }

    /**
     * 获得y轴数值范围
     * @returns 
     */
    private getYRange() {
        if (!this.series) {
            return [0, 0];
        }

        return [0, d3.max(this.series, d => d3.max(d, d => d[1])) || 0];
    }

    /**
     * 绘制累积流图
     */
    private drawAreas() {

        // 面积图计算
        const area = d3.area<Array<Date | number>>()
            .x(d => this.x(d.data[0]))
            .y0(d => this.y(d[0]))
            .y1(d => this.y(d[1]))
            .curve(d3.curveBumpX);

        // 渲染面积图
        if (this.series) {
            if (!this.paths) {
                this.paths = this.svg.append("g")
                    .selectAll('path')
                    .data(this.series)
                    .join("path")
                    .attr("fill", d => this.colorScale(d.key))
                    .attr("d", area);
            } else {
                this.paths.data(this.series).attr("d", area);
            }

            
        }
    }

    /**
     * 设置数据
     * @param data 
     */
    public setData(data: ICumulativeData[]) {
        this.data = data;

        // 累积运算，越靠后的项，位置越高
        this.series = d3.stack()
            .keys(this.seriesKey)
            .value(([, D], key) => _.parseInt(D[key]))
            (
                // 按照date排序
                d3.index(this.data, d => DayJS(d.datestr).toDate())
            );

        const getStackValue = (key: string, index: number, defaultValue: number = 0) => {
            try {
                let keyId = this.seriesKey.indexOf(key);
                return this.series[keyId][index][1];
            } catch(e) {
                console.error(e);
                return defaultValue;
            }
        }    

        // 调整xy坐标系
        this.x.domain(this.getXRange());
        this.y.domain(this.getYRange());


        // ------------------------- 显示数据 ------------------------- 
        
        
        // 调整x轴y轴组件
        this.xaxis.call(d3.axisBottom(this.x));
        this.yaxis.call(d3.axisLeft(this.y).tickSize(1));
        
        this.drawAreas();

        // ---------------------- 准备tooltip数据 ------------------------------

        this.points = data.map((item, index) => {
            return {
                x_date: this.x(DayJS(item.datestr).toDate()),
                y_not_started: this.y(getStackValue('not_started', index)),
                y_developing: this.y(getStackValue('developing', index)),
                y_testing: this.y(getStackValue('testing', index)),
                y_fuckable: this.y(getStackValue('fuckable', index)),
                y_finished: this.y(getStackValue('finished', index)),
            }
        });

        console.debug('this.points', this.points);

        this.updateTooltip(0);
    }


    private updateTooltipSize(
        text: d3.Selection<SVGTextElement, unknown, null, any>, 
        path: d3.Selection<d3.BaseType | SVGPathElement, undefined, SVGGElement, unknown>
    ) {
        const paddingTop = 5, paddingRight = 10,  paddingBottom = 5, paddingLeft = 10;
        const arrowSize = 5;
        const marginLeft = 5;

        const {x, y, width: w, height: h} = text.node().getBBox();
        text.attr("transform", `translate(${marginLeft + arrowSize + paddingLeft}, ${paddingTop - y})`);

        let pathcmd = [
            `M${marginLeft + arrowSize} 0 `,
            `H${marginLeft + arrowSize + paddingLeft + w + paddingRight}`,
            `V${paddingTop + h + paddingBottom}`,
            `H${marginLeft + arrowSize}`,
            `V${paddingTop + h/2 + arrowSize}`,
            `L${marginLeft} ${paddingTop + h/2}`,
            `L${marginLeft + arrowSize} ${paddingTop + h/2 - arrowSize}`,
            `V0`,
            `z`
        ].join(' ');
        path.attr("d", pathcmd);
    }

    private createTooltip() {
        let container = this.svg.append('g');
        container.attr('display', 'none');

        const line = container.append('line')
            .attr('x1', 0)
            .attr('y1', this.marginTop)
            .attr('x2', 0)
            .attr('y2', this.height - this.marginBottom)
            .attr("stroke-width", 4)
            .attr("stroke", this.colorScale('datestr'));

         

        const path = container.selectAll("path")
            .data([,])
            .join("path")
                .attr("fill", "white")
                .attr("stroke", "black");

        const text = container.append('text');

        this.updateTooltipSize(text, path);

        return {container, path, text};
    }

    private updateTooltip(pos: number) {
        console.debug('updateTooltip', pos);

        // 节流
        if (pos === this.tooltipPos) {
            return;
        }

        this.tooltipPos = pos;

        if (!this.tooltip) {
            this.tooltip = this.createTooltip();
        }

        let tooltipData = this.data[this.tooltipPos];

        if (!tooltipData) {
            // 更新显示状态
            this.tooltip.container.attr('display', 'none');
        } else {
            // 更新显示状态
            this.tooltip.container
                .attr('display', 'inherit')
                .transition()
                .ease(d3.easeSinInOut)
                .duration(60)
                .attr(
                    'transform', 
                    `translate(${this.x(DayJS(tooltipData.datestr, 'YYYYMMDD').toDate())}, 0)`
                );

            // 更新tooltip文字内容
            this.tooltip.text.selectAll('tspan').remove();
            this.tooltip.text.selectAll("text")
                .data(Object.entries(tooltipData || []))
                .join("tspan")
                    .attr("x", 0)
                    .attr("y", (_, i) => `${i * 1.1}em`)
                    .attr("font-weight", (_, i) => i ? null : "bold")
                    .text(d => `${seriesDef[d[0]]}：${d[1]}`)
            this.updateTooltipSize(this.tooltip.text, this.tooltip.path);
        }
    }

    private onPointerMove(event: any) {
        if (!this.points?.length) {
            return;
        }

        const [xm, ym] = d3.pointer(event);
        const i = d3.leastIndex(this.points, (item) => Math.hypot(item.x_date - xm));
        this.updateTooltip(i);
    }

    private onPointerEnter(event: any) {

    }

    private onPointerLeave(event: any) {
        this.updateTooltip(-1);
    }



    private initEvents() {
        this.svg
            .on("pointerenter", e => this.onPointerEnter(e))
            .on("pointermove", e => this.onPointerMove(e))
            .on("pointerleave", e => this.onPointerLeave(e))
    }

    public destroy() {
        this.svg.remove();
    }
}


interface ICumulativeFigureProps {
    data: any[]
}

/**
 * 累积流图控件
 * @param props 
 * @returns 
 */
function CumulativeFigure(props: ICumulativeFigureProps) {

    let context = useRef<null | HTMLDivElement>(null);
    let d3Instance = useRef<null | FigureInstance>(null);

    

    useEffect(() => {
        if (!context.current) {
            return;
        }

        setTimeout(() => {
            d3Instance.current = new FigureInstance(context.current, props.data);
        }, 0)

        return () => {
            if (d3Instance.current) {
                d3Instance.current.destroy();
                d3Instance.current = null;
            }
        }

    }, []);

    useEffect(() => {
        let instance = d3Instance.current;
        if (!instance) {
            return;
        }

        console.debug('fig setdata', props.data);
        instance.setData(props.data);

    }, props.data);

    function proxyColorScale(key: string) {
        if (!d3Instance.current) {
            return '#555';
        }

        return d3Instance.current.colorScale(key); 
    }

    return (
        <div className="f-fit-content">
            <h2 className="f-align-center">任务累积流图</h2>
            <Legend color={proxyColorScale} items={seriesDef}></Legend>
            <div className="f-fit-width" ref={context}>&nbsp;</div>
        </div>
    );
}

export default memo(CumulativeFigure);