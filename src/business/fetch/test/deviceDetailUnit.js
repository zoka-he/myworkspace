function matchDeviceDetail(args) {
    let fetchConfig = args[0];
    let fetchUrl = fetchConfig.url;
    let fetchData = fetchConfig.data;

    if (!/kibana\/elasticsearch\/_msearch/.test(fetchUrl)) {
        console.debug('url未命中', fetchUrl);
        return false;
    }

    if (!JSON.stringify(/index:\s?\["bb_i_start\*]/.test(fetchData))) {
        console.debug('data未命中', fetchData);
        return false;
    }

    return true;
}

function deviceDetailResponse(args) {
    return {
        status: 200,
        message: 'OK',
        data: {
            responses: [
                {
                    hits: {
                        hits: [
                            {
                                _source: {
                                    udid: '123456',
                                    dt_msg_time: 'YYYY-MM-DD HH:mm:ss',
                                    app_name: '应用A',
                                    app_version: '版本A',
                                    client_ip: '127:127:127:127',
                                    location: '某省',
                                    city: '某市',
                                    wifi_mac: '12:34:56:78:9a:bc',
                                    model: 'mars'
                                }
                            },
                            {
                                _source: {
                                    udid: '123456',
                                    dt_msg_time: 'YYYY-MM-DD HH:mm:ss',
                                    app_name: '应用B',
                                    app_version: '版本B',
                                    client_ip: '1:1:1:1',
                                    location: '某省',
                                    city: '某市',
                                    wifi_mac: '01:01:01:01:01:01',
                                    model: 'mars'
                                }
                            }
                        ]
                    }
                }
            ]
        }
    }
}

export default [
    {
        name: '测试设备详情列表',
        match: matchDeviceDetail,
        response: deviceDetailResponse
    }
];