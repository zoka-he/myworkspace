import { Select, Space, message } from "antd";
import _, { reject } from "lodash";
import { useEffect, useState } from "react";

interface IGeoSearchProps {
    map?: any
    amap?: any
    bmap?: any
    onAddress?: Function
    mapType: string
}

/**
 * 地理位置检索控件
 * @param props 
 * @returns 
 */
export default function GeoSearch(props: IGeoSearchProps) {
    let [compOpts, setCompOpts] = useState([]);
    let [pois, setPois] = useState([]);
    let [poiSrc, setPoiSrc] = useState<string>('baidu');

    /**
     * 查询地理位置
     */
    const onSearch = _.debounce(function(s: string) {
        if (!s) {
            return;
        }

        if (!props.map) {
            console.debug('map is not defined!');
            return;
        }

        let map = props.map;
        if (typeof map === 'function') {
            map = map();
        }

        console.debug('搜索', `[${poiSrc}]`, s);

        if (poiSrc === 'baidu') {
            var sOpts = {
                onSearchComplete: function(results: any){
                    // 判断状态是否正确
                    // @ts-ignore
                    if (local.getStatus() == BMAP_STATUS_SUCCESS){
                        console.debug('poi result ====>>>>>', results);

                        // poi的地名数据包括title和addr，title是常用地名，addr是街区号
                        let _pois = results._pois;
                        let poiOpts = _pois.map((poi: any, index: number) => {
                            return {
                                label: poi.title,
                                value: index
                            }
                        });
                        
                        setCompOpts(poiOpts);
                        setPois(_pois);
                    } else {
                        message.error('地理搜索失败', local.getStatus());
                    }
                }
            };

            var local = new BMapGL.LocalSearch(props.bmap.getMap(), sOpts);
            local.search(s);
        } else if (poiSrc === 'gaode') {

            if (!props.map) {
                console.debug('map is not defined!');
                return;
            }
    
            let map = props.map;
            if (typeof map === 'function') {
                map = map();
            }

            function doOneSearch(key: string, city?: string, research = true) {
                let _city = city;
                if (!_city) {
                    _city = '全国';
                }

                let placeSearch = new AMap.PlaceSearch({ city: _city });
                
                placeSearch.search(key, function (status:any, result:any) {
                    // 查询成功时，result即对应匹配的POI信息
                    console.log('poi result ====>>>>>', result)
                    
                    if (result.info === 'OK') {
    
                        let _pois = result?.poiList?.pois || [];
                        let poiOpts = _pois.map((poi: any, index: number) => {
                            return {
                                label: poi.name,
                                value: index
                            }
                        });
                        
                        setCompOpts(poiOpts);
                        setPois(_pois);
                    } else if (result.info === 'TIP_CITIES' && !city && research) {
                        console.debug('geosearch 参考 map', props.amap, city);
                        // 这里拿到的是EditorAMap
                        props.amap.getMap().getCity((info: any) => {
                            console.debug('getCity', info);
                            doOneSearch(key, info.citycode, false);
                        })
                    } else {
                        console.error('搜索遇到问题', status, result);
                        message.error('搜索遇到问题，编码：' + (result?.info || result));
                    }
                });
            }

            doOneSearch(s);
        }
    }, 800);


    function baiduPt2gaodePt(srcPt: any) {
        return new Promise(resolve => {
            AMap.convertFrom(
                [srcPt.lng, srcPt.lat], 
                'baidu', 
                function (status: any, result: any) {
                    if (result.info === 'ok') {
                        var resLnglat = result.locations[0];
                        resolve(resLnglat);
                    } else {
                        message.error('出现错误，请查看F12');
                        throw new Error(result);
                    }
                }
            );
        })
    }

    function gaodePt2baiduPt(srcPt: any) {
        return new Promise(resolve => {
            function translateCallback(data: any) {
                if(data.status === 0) {
                    let dstPt = data.points[0];
                    resolve(dstPt);
                } else {
                    console.error(data);
                    reject(new Error('转换出错，请查看F12日志'));
                }
            }
    
            let convertor = new BMapGL.Convertor();
            let pointArr = [];
            pointArr.push(new BMapGL.Point(srcPt.lng, srcPt.lat));
            convertor.translate(pointArr, 3, 5, translateCallback); // 高德地图用的是国测局数据，对应3
        })
    }

    async function convertPoint(srcPt: any) {
        if (props.mapType === poiSrc) { // 同源，不用转换
            return srcPt;
        }

        console.debug('srcPt', srcPt);

        let dstPt;
        if (poiSrc === 'baidu' && props.mapType === 'gaode') {
            dstPt = await baiduPt2gaodePt(srcPt);
        } else if (poiSrc === 'gaode' && props.mapType === 'baidu') {
            dstPt = await gaodePt2baiduPt(srcPt);
        } else {
            throw new Error(`不支持的搜索方式：${poiSrc} -> ${props.mapType}`);
        }

        console.debug('dstPt', dstPt);

        return dstPt;
    }

    /**
     * 下拉列表选中
     * @param val 
     * @returns 
     */
    async function onSelect(val: any) {
        // console.debug('select poi', val, pois[_.toNumber(val)]);
        let poi: any = pois[_.toNumber(val)];
        console.debug('select poi', poi);

        if (poi && typeof props.onAddress === 'function') {
            let srcPt;
            if (poiSrc === 'baidu') {
                srcPt = poi.point;
            } else if (poiSrc === 'gaode') {
                srcPt = poi.location;
            }
            
            let dstPt = await convertPoint(srcPt);
            props.onAddress(dstPt);
        }
    }

    // 跟随地图类型变更搜索源
    // useEffect(() => {
    //     setPoiSrc(props.mapType);
    // }, [props.mapType]);

    return (
        <Space.Compact>
            <Select value={poiSrc} onChange={setPoiSrc}>
                <Select.Option value="baidu">百度</Select.Option>
                <Select.Option value="gaode">高德</Select.Option>
            </Select>
            <Select style={{ width: '450px' }}
                options={compOpts} filterOption={false} 
                showSearch onSearch={onSearch} onSelect={onSelect}></Select>
        </Space.Compact>
    )
}
