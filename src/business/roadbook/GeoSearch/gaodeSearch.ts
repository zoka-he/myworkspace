function getPois(map: any, keyString: string) {
    return new Promise((resolve, reject) => {
        const doOneSearch = (key: string, city?: string, research = true) => {
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
                    resolve(_pois);

                } else if (result.info === 'TIP_CITIES' && !city && research) {
                    console.debug('gaodeSearch 参考 city', city);
                    // 这里拿到的是EditorAMap
                    map.getCity((info: any) => {
                        console.debug('getCity', info);
                        doOneSearch(key, info.citycode, false);
                    })
                } else {
                    console.error('搜索遇到问题', status, result);
                    reject('搜索遇到问题，编码：' + (result?.info || result));
                }
            });
        }
    
        doOneSearch(keyString);
    });
    
}

var geocoder = new AMap.Geocoder();

function getAddr(lng: number, lat: number) {
    return new Promise((resolve, reject) => {
        geocoder.getAddress([lng, lat], function(status: string, result: any) {
            if (status === 'complete' && result.regeocode) {
                var address = result.regeocode;
                console.debug([lng, lat], address);
                resolve(address);
            }else{
                reject('根据经纬度查询地址失败');
            }
        });
    })
}

export default {
    getPois,
    getAddr
}