import { Button, Descriptions, Input, Radio, Select, Space, Table, message } from "antd";
import { useEffect, useRef, useState } from "react";
import CommonBmap from "../../commonBmap";
import fetch from '@/src/fetch';
import uuid from "@/src/utils/common/uuid";
import { PlusCircleOutlined } from '@ant-design/icons';
import PosForm from "./PosForm";
import FavPosItem from "./FavPosItem";
import GeoSearch from "../../roadBookEditor/dayEditor/GeoSearch";
import { useNavigate } from "react-router-dom";


export default function() {
    let amap = useRef();
    let bmap = useRef();
    let [queryName, setQueryName] = useState('');
    let [queryMapType, setQueryMapType] = useState('gaode');
    let [queryPreferMonth, setQueryPreferMonth] = useState<null | number>(null);
    let [spinning, setSpinning] = useState(false);
    let [listData, setListData] = useState<any[]>([]);
    let [filteredData, setFilteredData] = useState<any[]>([]);
    let [mapViewport, setMapViewport] = useState<any>(null);
    let [mapCenter, setMapCenter] = useState<any>(null);
    let [targetMk, setTargetMk] = useState<any>(null);
    let [posFormHelper] = PosForm.usePosForm();

    let navigate = useNavigate();

    useEffect(() => {
        onQuery();
    }, [])

    useEffect(() => {
        let list2 = listData.filter(item => {
            if (queryName) {
                if (typeof item.label !== 'string') {
                    console.debug('label为空', '拦截', item.label)
                    return false;
                }

                if (item.label.indexOf(queryName) === -1) {
                    console.debug('名称筛选', queryName, '拦截', item.label)
                    return false;
                }
            }

            if (queryPreferMonth) {
                if (item.prefer_month instanceof Array && item.prefer_month.length) {
                    if (!item.prefer_month.includes(queryPreferMonth)) {
                        console.debug('适宜季节', queryPreferMonth, '拦截', item.label);
                        return false;
                    }
                }
            }

            return true;
        })
        setFilteredData(list2);
    }, [listData, queryName, queryPreferMonth]);

    function onBmapReady(_bmap: any, _amap: any) {
        console.debug('onMapReady', _bmap, _amap);

        amap.current = _amap;
        bmap.current = _bmap;
    }

    async function onQuery() {
        try {
            setSpinning(true);

            let {data} = await fetch.get('/api/roadPlan/favGeoLocation/list');
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

    function onEditPos(item: any) {
        posFormHelper.showAndEdit(item);
        setTargetLnglat(item);
        setMapCenter({
            lng: item.lng,
            lat: item.lat,
        });
    }

    function renderFavPos(cell: any, row: any) {
        return (
            <FavPosItem
                data={row}
                onEditPos={onEditPos}
                onPosAimClick={onPosAimClick}
            />
        )
    }

    function renderMarkers() {
        let markers: JSX.Element[] = [];

        if (posFormHelper.open && targetMk) {
            markers.push(<CommonBmap.Marker {...targetMk} key={uuid()}/>);
        }
        
        listData.forEach(item => {
            let onItemMarkerClick = () => {
                onEditPos(item);
            }

            let mk = (
                <CommonBmap.Marker 
                    lng={item.lng} lat={item.lat} 
                    label={item.label} 
                    key={uuid()}
                    config={{ icon: "/mapicons/star.png" }}
                    onClick={onItemMarkerClick}
                />
            );
            markers.push(mk);
        })

        return markers;
    }

    async function setTargetLnglat(pos: any) {
        if (!pos?.lng || !pos?.lat) {
            setTargetMk(null);
            return;
        }

        // alert('显示位置' + JSON.stringify(data));
        const svg_searchAddr = await fetch.get('/mapicons/Target.svg');
        setTargetMk({
            lng: pos.lng,
            lat: pos.lat,
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

    function onMapClick(e: any) {
        setTargetLnglat(e);
        posFormHelper.setLnglat(e.lng, e.lat);
    }

    function onAddPos() {
        setTargetLnglat(null);
        posFormHelper.show();
    }

    function onGeoSearchAddress(pt: any) {
        console.debug('onGeoSearchAddress', pt);
        setMapCenter({
            lng: pt.lng,
            lat: pt.lat,
            zoom: 19
        });
    }

    async function updateWeather() {

    }

    let listTitle = (
        <div className="f-flex-two-side f-fit-width">
            <Space>
                <strong>收藏夹</strong>
                <Select size="small" style={{ width: 200 }}></Select>
            </Space>
            <Button icon={<PlusCircleOutlined/>} size="small" type="link" onClick={onAddPos}>添加</Button>
        </div>
    )

    let tableHeight = posFormHelper.open ? 'calc(100vh - 645px)' : 'calc(100vh - 280px)';
    let posFormHeight = '365px';

    return (
        <div className="m-wishboard-favposmanage">
            <Space>
                <label>名称：</label>
                <Input value={queryName} allowClear onInput={(e) => setQueryName((e.target as HTMLInputElement).value)}></Input>
                <label>适宜季节：</label>
                <Select style={{ width: 100 }} allowClear
                        value={queryPreferMonth} 
                        onChange={(e) => setQueryPreferMonth(e)}
                >
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
                    <PosForm form={posFormHelper} height={posFormHeight} mapType={queryMapType}
                        onFinish={onQuery}
                    />

                    <Table dataSource={filteredData} size={'small'} scroll={{ y: tableHeight }}>
                        <Table.Column title={listTitle} dataIndex="label" key="label" render={renderFavPos}/>
                        {/* <Table.Column title="操作" render={(cell, row) => renderTableAction(row)} key="action" width={160} fixed="right"/> */}
                    </Table>
                </div>

                <div className="m-map-container">
                    <CommonBmap 
                        onReady={onBmapReady} 
                        onClick={onMapClick}
                        mapType={queryMapType}
                        viewport={mapViewport}
                        center={mapCenter}
                    >
                        {renderMarkers()}
                    </CommonBmap>

                    <div className="m-map-tools">
                        <GeoSearch 
                            mapType={queryMapType} 
                            amap={{
                                getMap: () => amap?.current
                            }}
                            bmap={{
                                getMap: () => bmap?.current
                            }}
                            onAddress={(pt: any) => onGeoSearchAddress(pt)}
                        />
                    </div>
                </div>
            </div>
            
        </div>
    )
}