import * as DayJS from 'dayjs';
import _ from 'lodash';

export default {
    drivingType(dbVal: string) {
        let tbl: { [key: string]: string } = {
            car: '驾车',
            rail: '高铁',
            fly: '飞机',
        };

        return tbl[dbVal] || '驾车';
    },
    type(dbVal: string) {
        let tbl: { [key: string]: string } = {
            meal: '用餐',
            position: '途经',
            hotel: '住宿',
            sights: '景点',
        };

        return tbl[dbVal] || '途经';
    },
    stayTime(dbVal: string | Date) {
        // @ts-ignore
        let t0 = DayJS().startOf('day');
        // @ts-ignore
        let t1 = DayJS(dbVal);
        let dura = DayJS.duration(t1.diff(t0)).asSeconds();
        if (_.isNaN(dura)) {
            return '0m';
        }
        let s_HH = Math.floor(dura / 3600);
        let s_mm = Math.floor((dura % 3600) / 60);
        return `${s_HH}h${s_mm}m`;
    }
}