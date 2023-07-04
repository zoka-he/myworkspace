import { Select, message } from "antd";
import _ from "lodash";
import { useState } from "react";

interface IGeoSearchProps {
    map?: any
    onAddress?: Function
}

/**
 * 地理位置检索控件
 * @param props 
 * @returns 
 */
export default function GeoSearch(props: IGeoSearchProps) {
    let [compOpts, setCompOpts] = useState([]);
    let [pois, setPois] = useState([]);

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

        console.debug('搜索', s);

        var local = new BMapGL.LocalSearch(map, sOpts);
        local.search(s);
    }, 500);

    /**
     * 下拉列表选中
     * @param val 
     * @returns 
     */
    function onSelect(val: any) {
        if (!props.map) {
            console.debug('map is not defined!');
            return;
        }

        let map = props.map;
        if (typeof map === 'function') {
            map = map();
        }

        // console.debug('select poi', val, pois[_.toNumber(val)]);
        let poi: any = pois[_.toNumber(val)];
        if (poi && typeof props.onAddress === 'function') {
            props.onAddress(poi.point);
        }
    }

    return <Select style={{ width: '450px' }}
                    options={compOpts} filterOption={false} 
                    showSearch onSearch={onSearch} onSelect={onSelect}></Select>
}
