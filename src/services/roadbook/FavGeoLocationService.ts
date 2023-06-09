import service from '@/src/utils/mysql/service';

class FavGeoService extends service {

    constructor() {
        super('t_fav_geo_location');
        this.setValidColumns([
            'ID',
            'label',
            'lng',
            'lat',
        ]);
    }

}

export default FavGeoService;
