import { Card, Button } from "antd";
import { 
    VerticalAlignTopOutlined, 
    VerticalAlignBottomOutlined,
    EditOutlined
} from '@ant-design/icons';


interface IDayViewerProps {
    day: number,
    onPrepend?: Function,
    onAppend?: Function,
    onEdit?: Function,
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

    return (
        <div className="m-dayviewer">
            <h5 className="m-dvtitle">
                <span>D{props.day}</span>
                <Button type="link" 
                    onClick={() => callHook(EDayViewerHookNames.onPrepend)}
                >
                    <VerticalAlignTopOutlined />
                    <span>上方插入</span>
                </Button>
                <Button type="link"
                    onClick={() => callHook(EDayViewerHookNames.onAppend)}
                >
                    <VerticalAlignBottomOutlined />
                    <span>下方插入</span>
                </Button>
                <Button type="link"
                    onClick={() => callHook(EDayViewerHookNames.onEdit)}
                >
                    <EditOutlined/>
                    <span>编辑行程</span>
                </Button>
            </h5>
            <Card>
                <table className="m-dvtable">
                    <thead>
                        <tr>
                            <th>日程</th>
                            <th>地点</th>
                            <th>路上时间</th>
                            <th>路程</th>
                            <th>停留时间</th>
                            <th>参考时间</th>
                            <th>参考海拔</th>
                        </tr>
                        <tr>
                            <th>&nbsp;</th>
                            <th>&nbsp;</th>
                            <th>H:mm</th>
                            <th>km</th>
                            <th>H:mm</th>
                            <th>H:mm</th>
                            <th>&nbsp;</th>
                        </tr>
                    </thead>
                    <tbody>

                    </tbody>
                </table>
            </Card>
        </div>
    )

}