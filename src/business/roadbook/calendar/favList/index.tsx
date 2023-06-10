import {Button, message, Space, Table, Modal, Select} from "antd";
import DayJS from 'dayjs';
import AddPlaceModal from './addPlaceModal';
import {MutableRefObject, useEffect, useRef, useState} from "react";
import fetch from '@/src/fetch';
import Openweather from "@/src/utils/openweather";

interface IShowable {
    show: Function
};

export default function() {
    enum E_fcDisplayMode {
        DETAIL = 'detail',
        SIMPLE = 'simple',
        FIGURE = 'figure'
    };

    let t0 = DayJS().startOf('day');
    let t1 = t0.add(DayJS.duration({ days: 1 }));

    let m_addPlaceModal = useRef<AddPlaceModal | null>(null);
    let [listData, setListData] = useState<any[]>([]);
    let [spinning, setSpinning] = useState(false);
    let [fcLen, setFcLen] = useState(5);
    let [fcDispMode, setFcDispMode] = useState(E_fcDisplayMode.DETAIL);
    

    /**
     * 获取天气倾向分数
     * @param fc 天气预报数组
     * @returns 
     */
    function getWeatherScore(fc: any[]) {
        let score = 0;

        let tn = t0.add(DayJS.duration({ days: fcLen }));
        fc = fc.filter(item => item.dt < tn.unix());

        console.debug('参考预报：', tn.unix(), fc);

        fc.forEach((item: any) => {
            let iScore = 0;
            let iScoreDiv = 0;

            if (item.desc.indexOf('晴') > -1) {
                iScore += 1;
                iScoreDiv += 1;
            }

            if (item.desc.indexOf('少云') > -1) {
                iScore += 2;
                iScoreDiv += 1;
            }

            if (item.desc.indexOf('多云') > -1) {
                iScore += 0.5;
                iScoreDiv += 1;
            }

            if (item.desc.indexOf('阴') > -1) {
                iScore -= 0.5;
                iScoreDiv += 1;
            }

            if (item.desc.indexOf('小雨') > -1) {
                iScore -= 0.5;
                iScoreDiv += 1;
            }

            if (item.desc.indexOf('中雨') > -1) {
                iScore -= 1;
                iScoreDiv += 1;
            }

            if (item.desc.indexOf('大雨') > -1) {
                iScore -= 2;
                iScoreDiv += 1;
            }

            if (item.desc.indexOf('暴雨') > -1) {
                iScore -= 2;
                iScoreDiv += 1;
            }

            if (iScoreDiv === 0) {
                iScoreDiv = 1;
            }

            score += iScore / iScoreDiv;
        });

        return score;
    }

    async function onQuery() {
        try {
            setSpinning(true);

            let {data} = await fetch.get('/api/roadPlan/favGeoLocation/list', {params: {page: 1, limit: 100}});
            setListData(data);

            // 获取天气，但是不计算分数，也不变更排序（因为这样可能会导致重复请求）
            for (let i = 0; i < data.length; i++) {
                let ow = new (Openweather as any)(data[i].lng, data[i].lat);
                try {
                    let fc = await ow.getForecast();
                    let data2 = [...data];
                    data2[i].fc = fc;
                    data = data2;
                    setListData(data);
                } catch (e: any) {
                    console.error(e);
                    message.error(e.message);
                }
            }

            sortItemsByScore(data);

        } catch (e: any) {
            console.error(e);
            message.error(e.message);
        } finally {
            setSpinning(false);
        }
    }

    function sortItemsByScore(data?: any[]) {
        if (data === undefined) {
            data = Array.from(listData);
        }

        console.debug('重新排序天气');

        for (let i = 0; i < data.length; i++) {
            let fc = data[i].fc;
            if (fc instanceof Array) {
                data[i].score = getWeatherScore(fc);
            } else {
                data[i].score = 114514; // 哼哼哼啊啊啊啊啊啊啊啊啊啊啊啊啊啊
            }
        }

        let data2 = Array.from(data).sort((a: any, b: any) => b.score - a.score);
        setListData(data2);
    }

    function showModal(ref?: MutableRefObject<IShowable | null>) {
        if (!ref || !ref?.current?.show) {
            return;
        }

        ref.current.show();
    }

    async function delRow(row: any) {
        Modal.confirm({
            title: '二次确认！',
            content: <span>即将删除地点：{row.label}</span>,
            async onOk() {
                await fetch.delete('/api/roadPlan/favGeoLocation', { params: { ID: row.ID } });
                onQuery();
            }
        })
    }

    function editRow(row: any) {
        if (!m_addPlaceModal?.current) {
            throw new Error('编辑模态窗口未就绪');
        }

        m_addPlaceModal.current.showAndEdit(row);
    }

    function renderAction(row: any) {
        return <Space>
            <Button onClick={() => editRow(row)}>修改</Button>
            <Button danger onClick={() => delRow(row)}>删除</Button>
        </Space>
    }

    function formatWeather(item: any) {
        let clazzName = '';

        if (/晴|少云|^多云$/.test(item.desc)) {
            clazzName = 'f-blue f-bold';
        } else if (/(中|大|暴)(雨|雪)/.test(item.desc)) {
            clazzName = 'f-red f-bold';
        } else {
            clazzName = 'f-silver';
        }

        return <p>
            <img style={{ width:'24px' }} src={Openweather.getIconUrl(item.icon)}/>
            <span className={clazzName}>{item.desc}，</span>
            <span className={clazzName}>{item.feels_like}°C，</span>
            <span className={clazzName}>{item.grnd_level}hPa</span>
        </p>;
    }

    function renderForecastTitle(d_day: number) {
        return t0.add(DayJS.duration({ days: d_day })).format('YYYY-MM-DD');
    }

    function renderForecast(d_day: number) {
        return function(cell: any, row: any) {
            if (typeof row?.fc?.map !== 'function') {
                return null;
            }
    
            return row.fc
                .filter((item: any) => {
                    return (item.dt >= t0.add(DayJS.duration({ days: d_day })).unix() 
                        && item.dt < t0.add(DayJS.duration({ days: d_day + 1 })).unix());
                })
                .map(formatWeather)
        }
    }

    function renderFcColumn() {
        let fullComps = [
            <Table.Column title={`今天 ${t0.format('YYYY-MM-DD')}`} width={'260px'} key="t0" render={renderForecast(0)}/>,
            <Table.Column title={`明天 ${t1.format('YYYY-MM-DD')}`} width={'260px'} key="t1" render={renderForecast(1)}/>,
            <Table.Column title={renderForecastTitle(2)}            width={'260px'} key="t2" render={renderForecast(2)}/>,
            <Table.Column title={renderForecastTitle(3)}            width={'260px'} key="t3" render={renderForecast(3)}/>,
            <Table.Column title={renderForecastTitle(4)}            width={'260px'} key="t4" render={renderForecast(4)}/>,
        ];

        return fullComps.slice(0, fcLen);
    }


    useEffect(() => {
        onQuery();
    }, []);

    useEffect(() => {
        sortItemsByScore();
    }, [fcLen]);

    return (
        <div className="f-fit-height f-flex-col">
            <div className="f-flex-two-side">
                <Space>
                    <label>预报天数：</label>
                    <Select value={fcLen} onChange={e => setFcLen(e)} style={{ width: '100px' }}>
                        { Array.from(
                            {length: 5}, 
                            (v, k: number) => <Select.Option value={k+1} key={k+1}>{k+1}</Select.Option>) 
                        }
                    </Select>

                    <label>显示模式：</label>
                    <Select value={fcDispMode} onChange={e => setFcDispMode(e)} style={{ width: '100px' }}>
                        <Select.Option value={E_fcDisplayMode.DETAIL} key={E_fcDisplayMode.DETAIL}>详细文字</Select.Option>
                        <Select.Option value={E_fcDisplayMode.SIMPLE} key={E_fcDisplayMode.SIMPLE}>简短文字</Select.Option>
                        <Select.Option value={E_fcDisplayMode.FIGURE} key={E_fcDisplayMode.FIGURE}>图表</Select.Option>
                    </Select>

                    <Button type="primary" loading={spinning} onClick={ () => onQuery() }>刷新</Button>
                </Space>
                <Space>
                    <Button onClick={ () => showModal(m_addPlaceModal) }>添加地区</Button>
                </Space>
            </div>
            <div className="f-flex-1" style={{ margin: '12px 0' }}>
                <Table dataSource={listData} size="small" 
                       scroll={{ x: 1300, y: 'calc(100vh - 270px)' }}>
                    <Table.Column title="地名" dataIndex="label" key="label" width={'180px'} fixed="left"/>
                    {renderFcColumn()}
                    {/* <Table.Column title='偏好分数' dataIndex="score" key="score" width={100}/> */}
                    <Table.Column title="操作" render={(cell, row) => renderAction(row)} key="action" width={160} fixed="right"/>
                </Table>
            </div>
            <AddPlaceModal ref={m_addPlaceModal} onFinish={onQuery}/>
        </div>
    )

}