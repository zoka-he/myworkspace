import { Card, Button, message } from "antd";
import { 
    VerticalAlignTopOutlined, 
    VerticalAlignBottomOutlined,
    EditOutlined
} from '@ant-design/icons';
import * as Dayjs from 'dayjs';


interface IDayViewerProps {
    day: number,
    onPrepend?: Function,
    onAppend?: Function,
    onEdit?: Function,
    data: any
}

enum EDayViewerHookNames {
    onPrepend = 'onPrepend',
    onAppend = 'onAppend',
    onEdit = 'onEdit'
}


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

    function renderTitle() {
        return `D${props.day}`;
    }

    function renderExtra() {
        return <Button type="link" icon={<EditOutlined/>}
            onClick={() => callHook(EDayViewerHookNames.onEdit)}
        >编辑行程</Button>
    }

    function renderRemark() {
        if (props.data?.remark) {
            return (
                <div>
                    {props.data.remark};
                </div>
            )
        } else {
            return null;
        }
    }

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
            } catch(e) {
                console.error(e);
                message.error(e.message);
            }
        }

        function secondToHHmm(n: number) {
            let t0 = Dayjs().startOf('day');
            t0 = t0.add(Dayjs.duration({ seconds: n }));
            return t0.format('HH:mm');
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

        let trs = [];
        if (detail?.points?.length) {
            for (let item of detail.points) {
                trs.push(<tr>
                    <td>{type2disp(item.type)}</td>
                    <td>{item.addr}</td>
                    <td>{preferTime2Str(item.preferTime)}</td>
                </tr>)
            }
        }

        

        return (
            <table className="m-dvtable">
                <thead>
                    <tr>
                        <th>日程</th>
                        <th>地点</th>
                        <th>参考时间</th>
                        {/* <th>参考海拔</th> */}
                    </tr>
                </thead>
                <tbody>
                    { trs }
                </tbody>
            </table>
        )
    }

    return (
        <div className="m-dayviewer">
            <Card title={renderTitle()} extra={renderExtra()}>
                { renderRemark() }
                { renderDetail() }
            </Card>
        </div>
    )

}