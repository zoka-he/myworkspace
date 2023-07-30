import { Space, Button, Descriptions, Tabs, Tag } from "antd";
import { AimOutlined, EditOutlined, DeleteOutlined, MinusCircleFilled, CheckCircleFilled } from '@ant-design/icons';
import GeoCoder from "@/src/utils/geo/GeoCoder";
import DayJS from 'dayjs';

interface IFavPosItemProps {
    data: any
    onEditPos?: Function
    onPosAimClick?: Function
}

export default function(props: IFavPosItemProps) {

    function callIfExist(fn?: Function) {
        if (!fn) {
            return;
        }

        fn(props.data);
    }

    let posTag = <Tag>全国</Tag>;
    if (props.data.province_code) {
        let name = GeoCoder.findProvinceOfCode(props.data.province_code);
        if (name) {
            posTag = <Tag color='blue'>{name}</Tag>
        }
    }

    let arrived = <span className="f-silver"><MinusCircleFilled/>&nbsp;无记录</span>
    if (props.data.arrived_date) {
        let fmtDate = DayJS(props.data.arrived_date).format('YYYY-MM-DD');
        arrived = <span className="f-green"><CheckCircleFilled/>&nbsp;{fmtDate}</span>
    }

    let weather = <span className="f-silver"><MinusCircleFilled/>&nbsp;关闭</span>
    if (props.data.use_weather) {
        weather = <span className="f-blue"><CheckCircleFilled/>&nbsp;启用</span>
    }

    let preferMonth = <Tag>全年</Tag>;
    if (props.data.prefer_month instanceof Array) {
        preferMonth = props.data.prefer_month.toString();
    }

    return (
        <div>
            <div className={'f-flex-two-side'}>
                <Space>
                    <Button icon={<AimOutlined/>} shape="circle" size="small" onClick={() => callIfExist(props.onPosAimClick)}></Button>
                    <strong>{props.data.label}</strong>
                </Space>
                <Space>
                    <Button icon={<EditOutlined/>} shape="circle" size="small" onClick={() => callIfExist(props.onEditPos)}></Button>
                </Space>
            </div>
            <Descriptions size="small" column={2}>
                <Descriptions.Item label="地区">{posTag}</Descriptions.Item>
                <Descriptions.Item label="天气">{weather}</Descriptions.Item>
                <Descriptions.Item label="打卡">{arrived}</Descriptions.Item>
                <Descriptions.Item label="季节" span={2}>{preferMonth}</Descriptions.Item>
            </Descriptions>
        </div>
    );
}