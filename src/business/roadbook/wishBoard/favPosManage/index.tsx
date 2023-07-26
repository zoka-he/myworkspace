import { Button, Descriptions, Input, Radio, Select, Space, Table, message } from "antd";
import { useEffect, useRef, useState } from "react";
import CommonBmap from "../../commonBmap";
import fetch from '@/src/fetch';
import uuid from "@/src/utils/common/uuid";
import { DeleteOutlined, EditOutlined, AimOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { blue } from '@ant-design/colors';
import PosForm from "./PosForm";

export default function() {
    let bmap = useRef();
    let [queryName, setQueryName] = useState('');
    let [queryMapType, setQueryMapType] = useState('gaode');
    let [queryWeatherDate, setQueryWeatherDate] = useState<number>(0);
    let [queryPreferMonth, setQueryPreferMonth] = useState<number[] | null>([]);
    let [spinning, setSpinning] = useState(false);
    let [listData, setListData] = useState<any[]>([]);
    let [filteredData, setFilteredData] = useState<any[]>([]);
    let [mapViewport, setMapViewport] = useState<any>(null);
    let [mapCenter, setMapCenter] = useState<any>(null);
    let [targetMk, setTargetMk] = useState<any>(null);
    let [posFormHelper] = PosForm.usePosForm();

    useEffect(() => {
        onQuery();
    }, [])

    useEffect(() => {
        setFilteredData(listData);
    }, [listData]);

    function onBmapReady(map: any) {
        bmap.current = map;
    }

    async function onQuery() {
        try {
            setSpinning(true);

            let {data} = await fetch.get('/api/roadPlan/favGeoLocation/list', {params: {page: 1, limit: 100}});
            setListData(data);


            if (data instanceof Array) {
                let viewportPoints = data.map(item => {
                    return {lng: item.lng, lat: item.lat};
                });
                setMapViewport(viewportPoints);
            }

        } catch (e: any) {
            console.error(e);
            message.error(e.message);
        } finally {
            setSpinning(false);
        }
    }

    function onPosAimClick(item: any) {
        setMapCenter({
            lng: item.lng,
            lat: item.lat
        });
    }

    function renderFavPos(cell: any, row: any) {
        return (
            <div>
                <div className={'f-flex-two-side'}>
                    <Space>
                        <Button icon={<AimOutlined/>} shape="circle" size="small" onClick={e => onPosAimClick(row)}></Button>
                        <strong>{row.label}</strong>
                    </Space>
                    <Space>
                        <Button icon={<EditOutlined/>} shape="circle" size="small"></Button>
                        <Button icon={<DeleteOutlined/>} danger type="text" size="small"></Button>
                    </Space>
                </div>
                <Descriptions size="small" column={2}>
                    <Descriptions.Item label="地区"> </Descriptions.Item>
                    <Descriptions.Item label="天气"> </Descriptions.Item>
                    <Descriptions.Item label="打卡"> </Descriptions.Item>
                    <Descriptions.Item label="适宜季节" span={2}> </Descriptions.Item>
                </Descriptions>
            </div>
        );
    }

    function renderMarkers() {
        let markers: JSX.Element[] = [];

        if (posFormHelper.open && targetMk) {
            markers.push(<CommonBmap.Marker {...targetMk} key={uuid()}/>);
        }
        
        listData.forEach(item => {
            let mk = (
                <CommonBmap.Marker 
                    lng={item.lng} lat={item.lat} 
                    label={item.label} 
                    key={uuid()}
                    config={{ icon: "/mapicons/star.png" }}
                />
            );
            markers.push(mk);
        })

        return markers;
    }

    async function onMapClick(e: any) {
        console.debug('map click', e);

        if (!e?.lng || !e?.lat) {
            setTargetMk(null);
            return;
        }

        // alert('显示位置' + JSON.stringify(data));
        const svg_searchAddr = await fetch.get('/mapicons/Target.svg');
        setTargetMk({
            lng: e.lng,
            lat: e.lat,
            config: {
                icon: new BMapGL.SVGSymbol(
                    svg_searchAddr,
                    {
                        rotation: 0,
                        fillColor: 'red',
                        fillOpacity : 1,
                        scale: 0.05,
                        anchor: new BMapGL.Size(530, 560)
                    }
                )
            }
        });
    }

    function onMarkerClick() {

    }

    function onAddPos() {
        posFormHelper.show();
    }

    let listTitle = (
        <div className="f-flex-two-side f-fit-width">
            <strong>地点</strong>
            <Button icon={<PlusCircleOutlined/>} size="small" type="link" onClick={onAddPos}>添加</Button>
        </div>
    )

    let tableHeight = posFormHelper.open ? 'calc(100vh - 570px)' : 'calc(100vh - 280px)';
    let posFormHeight = '290px';

    return (
        <div className="m-wishboard-favposmanage">
            <Space>
                <label>名称：</label>
                <Input value={queryName} onInput={(e) => setQueryName}></Input>
                <label>天气预报：</label>
                <Select value={queryWeatherDate} onChange={(e) => setQueryWeatherDate(e.target?.value)} style={{ width: 130 }}>
                    <Select.Option value={0}>实时</Select.Option>
                    <Select.Option value={1}>明天</Select.Option>
                    <Select.Option value={2}>后天</Select.Option>
                    <Select.Option value={3}>T+3</Select.Option>
                    <Select.Option value={4}>T+4</Select.Option>
                </Select>
                <label>适宜季节：</label>
                <Select mode="multiple" style={{ width: 200 }} allowClear
                        value={queryPreferMonth} onChange={(e) => setQueryPreferMonth(e.target?.value)}>
                    <Select.Option value={1}>一月</Select.Option>
                    <Select.Option value={2}>二月</Select.Option>
                    <Select.Option value={3}>三月</Select.Option>
                    <Select.Option value={4}>四月</Select.Option>
                    <Select.Option value={5}>五月</Select.Option>
                    <Select.Option value={6}>六月</Select.Option>
                    <Select.Option value={7}>七月</Select.Option>
                    <Select.Option value={8}>八月</Select.Option>
                    <Select.Option value={9}>九月</Select.Option>
                    <Select.Option value={10}>十月</Select.Option>
                    <Select.Option value={11}>十一月</Select.Option>
                    <Select.Option value={12}>十二月</Select.Option>
                </Select>
                <label>地图类型：</label>
                <Radio.Group value={queryMapType} onChange={e => setQueryMapType(e.target.value)}>
                    <Radio value="gaode">高德</Radio>
                    <Radio value="baidu">百度</Radio>
                </Radio.Group>
                <Button onClick={onQuery}>刷新</Button>
            </Space>

            <div className="f-flex-row">
                <div className="m-table-container">
                    <PosForm form={posFormHelper} height={posFormHeight}/>

                    <Table dataSource={filteredData} size={'small'} scroll={{ y: tableHeight }}>
                        <Table.Column title={listTitle} dataIndex="label" key="label" render={renderFavPos}/>
                        {/* <Table.Column title="操作" render={(cell, row) => renderTableAction(row)} key="action" width={160} fixed="right"/> */}
                    </Table>
                </div>

                <div className="m-map-container">
                    <CommonBmap 
                        onReady={(bmap: any) => onBmapReady(bmap)} 
                        onClick={ (e: any) => onMapClick(e) }
                        mapType={queryMapType}
                        viewport={mapViewport}
                        center={mapCenter}
                    >
                        {renderMarkers()}
                    </CommonBmap>
                </div>
            </div>
            
        </div>
    )
}