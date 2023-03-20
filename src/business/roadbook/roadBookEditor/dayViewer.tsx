import { Card, Button, message, Space } from "antd";
import { 
    EditOutlined,
    CloseOutlined
} from '@ant-design/icons';
import * as Dayjs from 'dayjs';
import Openweather from '@/src/utils/openweather';
import { useEffect, useState } from "react";

interface IWeatherViewProps {
    lng: number,
    lat: number,
    onData: Function
}

function WeatherView(props: IWeatherViewProps) {
    let [data, setData] = useState(null);

    useEffect(() => {
        let openweather = new (Openweather as any)(props.lng, props.lat);

        openweather.getWeather().then((weather: any) => {
            // console.debug('weather comp data', weather);
            setData(weather);
            if (typeof props.onData === 'function') {
                props.onData(weather);
            }
        })
    }, []);

    if (!data) {
        return <span>--</span>;
    } else {
        // @ts-ignore
        return <span>{data.description} {data.temp}°C <img style={{ width:'24px' }} src={data.iconUrl}/></span>
    }
}


interface ITrForNodeProps {
    point: any
}

/**
 * 显示途经点
 * @param props 
 * @returns 
 */
function TrForNode(props: ITrForNodeProps) {
    let [trClassName, setTrClassName] = useState('');

    if (!props?.point) {
        return null;
    }

    let { point } = props;  

    function secondToHHmm(n: number) {
        // @ts-ignore
        let t0 = Dayjs().startOf('day');
        t0 = t0.add(Dayjs.duration({ seconds: n }));
        return t0.format('HH:mm');
    }

    function timestampToHHmm(ts: number) {
        // @ts-ignore
        return Dayjs(ts).format('HH:mm');
    }

    function preferTime2Str(preferTime: any) {
        let ss = null;
        if (preferTime instanceof Array) {
            ss = preferTime.map(n => secondToHHmm(n)).join(' - ');
        }
        return ss;
    }

    function type2disp(type: string) {
        return {
            meal: '用餐',
            position: '途经',
            hotel: '住宿',
            sights: '景点',
        }[type];
    }

    function onWeatherData(data: any) {
        if (!point?.preferTime?.length || !data) {
            return;
        }

        let sunriseHHmm = timestampToHHmm(data.sunrise * 1000);
        let sunsetHHmm = timestampToHHmm(data.sunset * 1000);

        let t0HHmm = secondToHHmm(point.preferTime[0]);
        let t1HHmm = secondToHHmm(point.preferTime[1]);


        /* 关于这一块的设计，开夜车（安全问题）、日出日落（摄影需要）的显示优先级应该高于白天 
         * states:
         * [t0, t1, sunrise, sunset]  night
         * [t0, sunrise, t1, sunset]  sunrise
         * [sunrise, t0, t1, sunset]  daytime
         * [sunrise, t0, sunset, t1]  sunset
         * [sunrise, sunset, t0, t1]  night
         */

        let className = '';
        if (t1HHmm < sunriseHHmm || sunsetHHmm <= t0HHmm) { // night
            className = 'night';
        } else if (t0HHmm < sunriseHHmm && sunriseHHmm < t1HHmm && t1HHmm < sunsetHHmm) { // sunrise
            className = 'sunrise';
        } else if (sunriseHHmm < t0HHmm && t1HHmm < sunsetHHmm) { // daytime
            className = 'daytime';
        } else if (sunriseHHmm < t0HHmm && t0HHmm < sunsetHHmm && sunsetHHmm < t1HHmm) { // sunset
            className = 'sunset';
        } else {
            console.table(
                ['t0', 't1', 'sunrise', 'sunset'],
                [t0HHmm, t1HHmm, sunriseHHmm, sunsetHHmm]
            )
        }

        setTrClassName(className);
    }
    

    let tds = [
        <td>{type2disp(point.type)}</td>,
        <td>{point.addr}</td>,
        <td>{preferTime2Str(point.preferTime)}</td>,
        <td><WeatherView lng={point.lng} lat={point.lat} onData={onWeatherData}/></td>
    ];

    return (<tr className={trClassName}>{tds}</tr>)
}


interface IDayViewerProps {
    day: number,
    onPrepend?: Function,
    onAppend?: Function,
    onEdit?: Function,
    onDelete?: Function,
    data: any,
    showWeather?: boolean,
    isEdit: boolean,
    next: any,
    prev: any
}

enum EDayViewerHookNames {
    onPrepend = 'onPrepend',
    onAppend = 'onAppend',
    onEdit = 'onEdit',
    onDelete = 'onDelete'
}

/**
 * 管理界面
 * @param props 
 * @returns 
 */
export default function(props: IDayViewerProps) {

    function callHook(hookName: EDayViewerHookNames, ...args: any[]) {
        let fn: Function | undefined = props[hookName];
        if (!fn) {
            console.log('hook ' + hookName + ' not found');
            return;
        } else {
            if (args) {
                fn(...args);
            } else {
                fn();
            }
        }
    }

    /**
     * 渲染日程标题
     * @returns 
     */
    function renderTitle() {
        let s_title = `D${props.day}`
        if (props.data?.name) {
            s_title += '：' + props.data.name;
        }
        return s_title;
    }

    /**
     * 渲染修改、删除按钮
     * @returns 
     */
    function renderExtra() {
        if (!props.isEdit) {
            return null;
        }

        return <Space>
            <Button type="link" icon={<EditOutlined/>} size="small"
                onClick={() => callHook(EDayViewerHookNames.onEdit)}
            >修改</Button>
            <Button type="link" icon={<CloseOutlined/>} size="small" danger disabled={!!props.next}
                onClick={() => callHook(EDayViewerHookNames.onDelete)}
            ></Button>
        </Space>
    }

    /**
     * 渲染日程说明
     * @returns 
     */
    function renderRemark() {
        if (props.data?.remark) {
            return (
                <div className="m-dayviewer-remark">
                    <p>{props.data.remark}</p>
                </div>
            )
        } else {
            return null;
        }
    }

    /**
     * 渲染日程列表
     * @returns 
     */
    function renderDetail() {
        let detailData = props.data.data;

        let detailJson = '';
        if (detailData?.type === 'Buffer') {
            let nums: Array<number> = detailData.data;
            let decoder = new TextDecoder('utf-8');
            detailJson = decoder.decode(new Uint8Array(nums));
        }

        let detail: any = {};
        if (detailJson) {
            try {
                detail = JSON.parse(detailJson);
            } catch(e: any) {
                console.error(e);
                message.error(e.message);
            }
        }

        

        let trs: JSX.Element[] = [];
        if (detail?.points?.length) {
            detail.points.forEach((item: any, index: number) => {
                trs.push(<TrForNode point={item}/>)
            });
        }

        /**
         * 表头
         */
        let ths = [
            <th>日程</th>,
            <th>地点</th>,
            <th>参考时间</th>
        ];
        if (props.showWeather) {
            ths.push(<th>当前天气</th>);
        }

        return (
            <table className="m-dvtable">
                <thead>
                    <tr>{ ths }</tr>
                </thead>
                <tbody>
                    { trs }
                </tbody>
            </table>
        )
    }

    return (
        <div className="m-dayviewer">
            <Card size="small" title={renderTitle()} extra={renderExtra()}>
                { renderRemark() }
                { renderDetail() }
            </Card>
        </div>
    )

}