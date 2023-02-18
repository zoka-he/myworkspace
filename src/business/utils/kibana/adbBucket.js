import auth from './auth';
import moment from 'moment';
import fetch from '../../fetch';
import kibana from "../../config/kibana";
import authUtils from "./auth";
import {message} from "antd";
import _ from 'lodash';

import testData from './bucket_data.test.json';

class AdbBucket {

    constructor() {
        this.t0 = moment().clone().startOf('day');
        this.t1 = moment().clone().endOf('day');
        this.agentId = null;
    }

    setTimeRange(t0, t1) {
        this.t0 = t0;
        this.t1 = t1;
    }

    setAgentId(agentId) {
        this.agentId = agentId;
    }

    getReqPayload() {
        let body_json = [
            {
                index: ['bb_i_env*'],
                ignore_unavailable: true,
                preference: new Date().getTime()
            },
            {
                size: 0,
                _source: { excludes: [] },
                aggs: {
                    2: {
                        terms: {
                            field: 'client_ip',
                            size: 50,
                            order: {_count: 'desc'}

                        },

                        aggs: {
                            3: {
                                terms: {
                                    field: 'app_name',
                                    size: 10,
                                    order: { _count: 'desc' }
                                }
                            }
                        }
                    }
                },
                stored_fields: ['*'],
                script_fields: {},
                docvalue_fields: [
                    'dt_msg_time',
                    'dt_server_time'
                ],
                query: {
                    bool: {
                        must: [
                            {
                                match_all: {}
                            },
                            {
                                match_phrase: {
                                    sys_conf_type: {
                                        query: 'tcp_adb'
                                    }
                                }
                            },
                            {
                                range: {
                                    dt_msg_time: {
                                        gte: this.t0,
                                        lte: this.t1,
                                        format: 'epoch_millis'
                                    }
                                }
                            }
                        ],
                        filter: [],
                        should: [],
                        must_not: []
                    }
                }
            }
        ];

        return body_json.map(item => JSON.stringify(item) + '\r\n').join('');
    }

    getUdidReqPayload(client_ip, app_name) {
        let body_json = [
            {
                index: ['bb_i_env*'],
                ignore_unavailable: true,
                preference: new Date().getTime()
            },
            {
                size: 0,
                _source: { excludes: [] },
                aggs: {
                    4: {
                        terms: {
                            field: 'udid',
                            size: 50,
                            order: {_count: 'desc'}

                        },

                    }
                },
                stored_fields: ['*'],
                script_fields: {},
                docvalue_fields: [
                    'dt_msg_time',
                    'dt_server_time'
                ],
                query: {
                    bool: {
                        must: [
                            {
                                match_all: {}
                            },
                            {
                                match_phrase: {
                                    sys_conf_type: {
                                        query: 'tcp_adb'
                                    }
                                }
                            },
                            {
                                match_phrase: {
                                    client_ip: {
                                        query: client_ip
                                    }
                                }
                            },
                            {
                                match_phrase: {
                                    app_name: {
                                        query: app_name
                                    }
                                }
                            },
                            {
                                range: {
                                    dt_msg_time: {
                                        gte: this.t0,
                                        lte: this.t1,
                                        format: 'epoch_millis'
                                    }
                                }
                            }
                        ],
                        filter: [],
                        should: [],
                        must_not: []
                    }
                }
            }
        ];

        return body_json.map(item => JSON.stringify(item) + '\r\n').join('');
    }

    createAggUnpacker(aggId, colName, subProcessor) {
        return function (data) {
            if (!data[aggId]) {
                return [];
            }

            let { buckets } = data[aggId]
            if (!(buckets instanceof Array)) {
                return [];
            }

            let ret = [];
            buckets.forEach(item => {
                let obj = {
                    [colName]: item.key,
                    [`${colName}_count`]: item.doc_count
                };

                let subData = [];
                if (subProcessor) {
                    subData = subProcessor(item);
                }

                if (subData.length) {
                    subData.forEach(item => {
                        ret.push(Object.assign({}, obj, item));
                    });
                } else {
                    ret.push(obj);
                }

            });

            return ret;
        }
    }

    transformBucketData(aggsData) {

        let processor = this.createAggUnpacker(
            '2',
            'client_ip',
            this.createAggUnpacker(
                '3',
                'app_name'
            )
        );
        return processor(aggsData);
    }

    async getBucket() {
        let headers = {
            'kbn-version': kibana.kbnVersion,
            'content-type': 'application/x-ndjson',
            'Origin': 'http://11.168.240.9:8103',
            'Referer': 'http://11.168.240.9:8103/SDSJCPT/everisk/api/v4/kibana/app/kibana',
            'Host': '11.168.240.9:8103',
            ...authUtils.getHeaders()
        };

        let url = kibana.baseUrl + '/elasticsearch/_msearch';
        let body = this.getReqPayload();

        let resp = await fetch({
            url,
            data: body,
            headers,
            timeout: 30 * 1000,
            method: 'post'
        });
        resp = fetch.parseJsonResult(resp);

        // let resp = testData;
        console.debug(resp);


        let bucketData = resp?.data?.responses[0]?.aggregations;
        console.debug(bucketData);

        if (!bucketData) {
            message.warn('未返回数据！');
        }

        return this.transformBucketData(bucketData);
    }

    transformUdidBucketData(aggsData) {
        let processor = this.createAggUnpacker(
            '4',
            'udid',
        );
        return processor(aggsData);
    }

    async getUdidBucket(client_ip, app_name) {
        let headers = {
            'kbn-version': kibana.kbnVersion,
            'content-type': 'application/x-ndjson',
            'Origin': 'http://11.168.240.9:8103',
            'Referer': 'http://11.168.240.9:8103/SDSJCPT/everisk/api/v4/kibana/app/kibana',
            'Host': '11.168.240.9:8103',
            ...authUtils.getHeaders()
        };

        let url = kibana.baseUrl + '/elasticsearch/_msearch';
        let body = this.getUdidReqPayload(client_ip, app_name);

        let resp = await fetch({
            url,
            data: body,
            headers,
            timeout: 30 * 1000,
            method: 'post'
        });
        resp = fetch.parseJsonResult(resp);

        // let resp = testData;
        console.debug(resp);


        let bucketData = resp?.data?.responses[0]?.aggregations;
        console.debug(bucketData);

        if (!bucketData) {
            message.warn('未返回数据！');
        }

        return this.transformUdidBucketData(bucketData);
    }

}

export default AdbBucket;