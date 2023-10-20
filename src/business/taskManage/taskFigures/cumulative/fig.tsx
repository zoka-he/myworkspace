import { memo, useEffect, useRef } from "react";
import * as d3 from 'd3';
import { ICumulativeData } from "./ICumulativeData";
import _, { divide } from 'lodash';
import DayJS from 'dayjs';

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

    public titleMarginTop = 20;
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

        

        // ------------------------- 显示数据 ------------------------- 
        
        // 调整xy坐标系
        this.x.domain(this.getXRange());
        this.y.domain(this.getYRange());

        // 调整x轴y轴组件
        this.xaxis.call(d3.axisBottom(this.x));
        this.yaxis.call(d3.axisLeft(this.y).tickSize(1));
        
        this.drawAreas();
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

    let seriesDef = {
        'not_started': '未开始',
        'developing': '执行中',
        'testing': '验证中',
        'fuckable': '待上线',
        'finished': '已完成',
    }

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