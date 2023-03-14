/**
 * 官方网站：https://openweathermap.org/
 */
import axios from 'axios';

// const axios = require('axios');
const API_KEY = '071027ab7bbd2b6ba5a313f407156ba1';

interface Openweather {
    getIconUrl: Function
}

function Openweather(this:any, lon:number, lat:number) {
    let g_weatherData: any = null;

    async function init() {
        try {
            let resp = await axios.get(
                'https://api.openweathermap.org/data/2.5/weather',
                {
                    params: {
                        lat,
                        lon,
                        appid: API_KEY,
                        lang: 'zh_cn',
                        units: 'metric'
                    },
                    timeout: 10 * 1000
                }
            )

            // console.debug(resp);
            g_weatherData = resp.data;

            return g_weatherData;
        } catch(e) {
            console.error(e);
        }
    }

    async function all() {
        if (!g_weatherData) {
            g_weatherData = await init();
        }

        return g_weatherData;
    }

    return {
        all,
        async getWeather() {
            let data = await all();
            if (!data) {
                return null;
            }

            // 这里有一个坑，weather可能是个数组
            let weather;
            if (data.weather instanceof Array) {
                weather = data.weather[0];
            } else {
                weather = data.weather;
            }
            weather.temp = data.main.temp;
            weather.iconUrl = Openweather.getIconUrl(weather.icon);
            return weather;
        }
    }
};

Openweather.getIconUrl = function(id:string) {
    return `http://openweathermap.org/img/w/${id}.png`;
}


export default Openweather;
