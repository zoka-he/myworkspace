import { useEffect, useRef } from "react";

import chinaJson from './china_full.json';
import * as echarts from 'echarts';
import { EChartsType } from 'echarts';
import GeoCoder from "@/src/utils/geo/GeoCoder";

echarts.registerMap('CHINA', chinaJson);

interface IGraphProps {
    range?: number | [number, number],
    data?: any
}

export default function(props: IGraphProps) {

    let divRef = useRef<HTMLDivElement | null>(null);
    let echartRef = useRef<EChartsType | null>(null);

    function convertData(data?: any) {
        if (data === null || data === undefined) {
            return {
                data: [],
                min: 0, max: 0
            };
        }

        let retData: any[] = [];
        let min = Infinity, max = 0;
        for (let [k, v] of Object.entries(data)) {
            let provinceName = GeoCoder.findProvinceOfCode(k);
            if (provinceName) {
                retData.push({
                    name: provinceName,
                    value: v
                });
                min = Math.min(min, v);
                max = Math.max(max, v);
            }
        }
        if (min > max) {
            min = max;
        }

        return {
            data: retData,
            min, max
        }
    }

    function initGraph(container: HTMLDivElement) {
        if (echartRef.current) {
            return;
        }

        var myChart = echarts.init(container);
        echartRef.current = myChart;

        let { min, max, data } = convertData(props.data);

        const mapOption = {
            title: {
                text: '路书分布',
                x: 'center'
            },
            visualMap: {
                left: 'right',
                min,
                max,
                inRange: {
                    color: [
                        // '#a50026'
                        // '#d73027',
                        // '#f46d43',
                        // '#fdae61',
                        // '#fee090',
                        // '#ffffbf',
                        '#e0f3f8',
                        '#abd9e9',
                        '#74add1',
                        '#4575b4',
                        '#313695',
                    ]
                },
                text: ['High', 'Low'],
                calculable: true
            },
            tooltip: {
                trigger: 'item',
                showDelay: 0,
                transitionDuration: 0.2
            },
            toolbox: {
                show: true,
                //orient: 'vertical',
                left: 'left',
                top: 'top',
                feature: {
                    dataView: { readOnly: false },
                    restore: {},
                    saveAsImage: {}
                }
            },
            series: [
                {
                    name: '路书分布',
                    type: 'map',
                    roam: true,
                    map: 'CHINA',
                    emphasis: {
                        label: {
                            show: true
                        }
                    },
                    data
                },
            ]
        }

        myChart.setOption(mapOption);
    }

    useEffect(() => {
        let div = divRef.current;
        if (!div) {
            return;
        }

        initGraph(div);
    }, [divRef]);

    useEffect(() => {
        if (!echartRef.current) {
            console.debug('no echartRef.current');
            return;
        }

        let { min, max, data } = convertData(props.data);

        const mapOption = {
            visualMap: {
                min,
                max,
            },
            series: [
                {
                    data
                },
            ]
        }

        echartRef.current.setOption(mapOption);

    }, [props.data]);

    return (
        <div className="m-planboard-countgraph">
            <div ref={divRef} className="f-fit-content"></div>
        </div>
    )
}