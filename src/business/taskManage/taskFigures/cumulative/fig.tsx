import { memo, useEffect, useRef } from "react";
import * as d3 from 'd3';
import { ICumulativeData } from "./ICumulativeData";
import _ from 'lodash';
import DayJS from 'dayjs';

class Legend {
    private keys: string[]

    constructor(keys: string[]) {
        this.keys = keys;
    }

    attach(context: d3.Selection<SVGSVGElement, unknown, null, any>) {

    }
}

/**
 * 初始化D3对象
 * @param context 
 */
class FigureInstance {

    public width = 640;
    public height = 400;

    public titleMarginTop = 20;
    public marginTop = 60;
    public marginRight = 60;
    public marginBottom = 60;
    public marginLeft = 40;

    private data: ICumulativeData[] = [];
    private svg: d3.Selection<SVGSVGElement, unknown, null, any>;

    private title;
    private x;
    private xaxis;
    private y;
    private yaxis;

    private paths: d3.Selection<SVGPathElement, unknown, null, any>[] = [];

    constructor(context: HTMLDivElement, initData: ICumulativeData[]) {

        this.width = context.clientWidth - this.marginLeft - this.marginRight;
        this.height = context.clientHeight - this.marginTop - this.marginBottom;

        console.debug(context.clientWidth, this.width);
        console.debug(context.offsetWidth, this.width);

        this.svg = d3.select(context).append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('viewbox', `0 0 ${this.width} ${this.height}`)
            .style('margin', `10px ${this.marginRight}px ${this.marginBottom}px 10px `);

        this.title = this.svg.append('text')
            .attr('x', this.width / 2)          // 设定标题的位置  
            .attr('y', this.titleMarginTop) // 设定标题的位置  
            .attr('text-anchor', 'middle') // 设定标题的对齐方式  
            .style('font-size', '20px')    // 设定标题的字体大小  
            .style('fill', 'black')        // 设定标题的颜色  
            .text('任务累积流图');          // 设定标题的文字

        // Declare the x (horizontal position) scale.
        this.x = d3.scaleUtc()
            .domain(this.getXRange())
            .range([this.marginLeft, this.width - this.marginRight]);

        // Declare the y (vertical position) scale.
        this.y = d3.scaleLinear()
            .domain(this.getYRange())
            .range([this.height - this.marginBottom, this.marginTop]);

        // Add the x-axis.
        this.xaxis = this.svg.append("g")
            .attr("transform", `translate(0,${this.height - this.marginBottom})`)
            .call(d3.axisBottom(this.x));

        // Add the y-axis.
        this.yaxis = this.svg.append("g")
            .attr("transform", `translate(${this.marginLeft},0)`)
            .call(d3.axisLeft(this.y).tickSize(1));

        // 绘制折线图  
        if (!(initData instanceof Array)) {
            initData = [];
        }

        this.setData(initData);
    }

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

    private getYRange() {
        let min = 0, max = 0;
        let range;

        if (!this.data.length) {
            range = [min, max];
        } else {

            let numList: number[] = [];

            this.data.forEach(item => {
                for (let k of Object.keys(item)) {
                    let sum = 0;

                    // 不break，且写死prop，让每个选项滚动累积，达到累积流图的效果
                    switch(k) {
                        case 'not_started':
                            sum += _.parseInt(item.not_started);
                        case 'developing':
                            sum += _.parseInt(item.developing);
                        case 'testing':
                            sum += _.parseInt(item.testing);
                        case 'fuckable':
                            sum += _.parseInt(item.fuckable);
                        case 'finished':
                            sum += _.parseInt(item.finished);
                    }

                    numList.push(sum);
                }
            })

            range = [Math.min(min, ...numList), Math.round(1.2 * Math.max(max, ...numList))]
        }

        console.debug('getYRange', range);
        return range;
    }

    /**
     * 绘制折线图
     */
    private drawLines() {
        const line = d3.area<Array<Date | number>>()
            .x(d => this.x(d[0]))
            .y0(d => this.y(d[1]))
            .y1(d => this.height - this.marginBottom)
            .curve(d3.curveBumpX);

        [
            { prop: 'not_started', color: 'steelblue' },
            { prop: 'developing', color: '#D46B06' },
            { prop: 'testing', color: '#FFCA21' },
            { prop: 'fuckable', color: '#FF6363' },
            { prop: 'finished', color: 'darkgreen' },
        ].forEach((config, index) => {

            let data = this.data.map(item => {
                let sum = 0;

                // 不break，且写死prop，让每个选项滚动累积，达到累积流图的效果
                switch(config.prop) {
                    case 'not_started':
                        sum += _.parseInt(item.not_started);
                    case 'developing':
                        sum += _.parseInt(item.developing);
                    case 'testing':
                        sum += _.parseInt(item.testing);
                    case 'fuckable':
                        sum += _.parseInt(item.fuckable);
                    case 'finished':
                        sum += _.parseInt(item.finished);
                }

                return [
                    DayJS(item.datestr, 'YYYYMMDD').toDate(),
                    sum
                ]
            })

            if (this.paths[index]) {
                this.paths[index].attr("d", line(data));
            } else {
                this.paths[index] = this.svg.append("path")
                    .attr("fill", config.color)
                    .attr("d", line(data));
            }
        })
    }

    /**
     * 设置数据
     * @param data 
     */
    public setData(data: ICumulativeData[]) {
        this.data = data;

        this.x.domain(this.getXRange());
        this.y.domain(this.getYRange());

        this.xaxis.call(d3.axisBottom(this.x));
        this.yaxis.call(d3.axisLeft(this.y).tickSize(1));

        this.drawLines();
    }

    

    public destroy() {
        this.svg.remove();
    }
}


interface ICumulativeFigureProps {
    data: any[]
}

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

    return (
        <div className="f-fit-content" ref={context}>&nbsp;</div>
    );
}

export default memo(CumulativeFigure);