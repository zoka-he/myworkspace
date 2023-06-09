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
    let t0 = DayJS().startOf('day');
    let t1 = t0.add(DayJS.duration({ days: 1 }));

    let m_addPlaceModal = useRef<AddPlaceModal | null>(null);
    let [listData, setListData] = useState<any[]>([]);
    let [spinning, setSpinning] = useState(false);
    let [fcLen, setFcLen] = useState(5);

    function getWeatherScore(fc: any[]) {
        let score = 0;

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

            for (let i = 0; i < data.length; i++) {
                let ow = new (Openweather as any)(data[i].lng, data[i].lat);
                try {
                    let fc = await ow.getForecast();
                    let data2 = [...data];
                    data2[i].fc = fc;
                    data2[i].score = getWeatherScore(fc);
                    data = data2;
                    data.sort((a: any, b: any) => b.score - a.score);
                    setListData(data);
                } catch (e: any) {
                    console.error(e);
                    message.error(e.message);
                }
            }
        } catch (e: any) {
            console.error(e);
            message.error(e.message);
        } finally {
            setSpinning(false);
        }
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


    useEffect(() => {
        onQuery();
    }, []);

    return (
        <div className="f-fit-height f-flex-col">
            <div className="f-flex-two-side">
                <Space>
                    <label>预报天数：</label>
                    <Select value={fcLen} onChange={e => setFcLen(e)}>
                        { Array.from(
                            {length: 5}, 
                            (v, k: number) => <Select.Option value={k+1} key={k+1}>{k+1}</Select.Option>) 
                        }
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
                    <Table.Column title={`今天 ${t0.format('YYYY-MM-DD')}`} width={'260px'} key="t0" render={renderForecast(0)}/>
                    <Table.Column title={`明天 ${t1.format('YYYY-MM-DD')}`} width={'260px'} key="t1" render={renderForecast(1)}/>
                    <Table.Column title={renderForecastTitle(2)}            width={'260px'} key="t2" render={renderForecast(2)}/>
                    <Table.Column title={renderForecastTitle(3)}            width={'260px'} key="t3" render={renderForecast(3)}/>
                    <Table.Column title={renderForecastTitle(4)}            width={'260px'} key="t4" render={renderForecast(4)}/>
                    {/* <Table.Column title='偏好分数' dataIndex="score" key="score" width={100}/> */}
                    <Table.Column title="操作" render={(cell, row) => renderAction(row)} key="action" width={160} fixed="right"/>
                </Table>
            </div>
            <AddPlaceModal ref={m_addPlaceModal} onFinish={onQuery}/>
        </div>
    )

}