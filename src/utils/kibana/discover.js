import fetch from '../../fetch';
import authUtils from './auth';
import kibana from "../../config/kibana";

let udids = [];

class KibanaUtil {

  constructor() {
    this.t_start = new Date().getTime();
    this.t_end = new Date().getTime();
    this.udids = [];
    this.phones = [];
    this.limit = 500;
  }

  setTargetUdids(udids) {
    if (udids instanceof Array) {
      this.udids = udids;
    } else {
      this.udids = [udids];
    }
  }

  setTargetPhones(phones) {
    this.phones = phones;
  }

  setTimeRange(t_start, t_end) {
    this.t_start = t_start;
    this.t_end = t_end;
  }

  setLimit(limit) {
    this.limit = limit;
  }

  async requestKibana(table, query) {
    let headers = {
      'kbn-version': kibana.kbnVersion,
      'content-type': 'application/x-ndjson',
      'Origin': 'http://11.168.240.9:8103',
      'Referer': 'http://11.168.240.9:8103/SDSJCPT/everisk/api/v4/kibana/app/kibana',
      'Host': '11.168.240.9:8103',
      ...authUtils.getHeaders()
    };

    let url = kibana.baseUrl + '/elasticsearch/_msearch';
    let body_ndjson = [
      {
        index: [table],
        ignore_unavaliable: true,
        preference: new Date().getTime()
      },
      {
        version: true,
        size: this.limit,
        sort: [
          {
            dt_msg_time: {
              order: 'desc',
              unmapped_type: 'boolean'
            }
          }
        ],
        _source: {
          excludes: []
        },
        aggs: {
          2: {
            date_histogram: {
              field: 'dt_msg_time',
              interval: '12h',
              time_zone: 'Asia/Shanghai',
              min_doc_count: 1
            }
          }
        },
        stored_fields: ['*'],
        script_fields: {},
        docvalue_fields: [
            'dt_msg_time',
            'dt_server_time'
        ],
        query,
        highlight: {
          pre_tags: [
            '@kibana-highlighted-field@'
          ],
          post_tags: [
            '@/kibana-highlighted-field@'
          ],
          fields: {
            '*': {}
          },
          fragment_size: 2**31 - 1
        }
      }
    ];

    let body = body_ndjson.map(item => JSON.stringify(item) + '\r\n').join('');

    let resp = await fetch({
      url,
      data: body,
      headers,
      timeout: 30 * 1000,
      method: 'post'
    });

    console.debug('requestKibana after fetch', resp);

    return resp;
  }

  async getUdidStartData() {
    if (!this.udids?.length) {
      throw new Error('未提供设备udid');
    }

    let conditions = this.udids.filter(item => !!item).map(udid => {
      return {
        match_phrase: { udid }
      }
    });

    if (!conditions.length) {
      throw new Error('至少提供 设备udid、外网IP、wifi-mac 的其中之一！');
    }

    let tableName = 'bb_i_start*';
    let query = {
      bool: {
        must: [
          { match_all: {} },
          {
            bool: {
              should: conditions, // 在这里放置条件
              minimum_should_match: 1
            }
          },
          {
            range: {
              dt_msg_time: {
                gte: this.t_start,
                lte: this.t_end,
                format: 'epoch_millis'
              }
            }
          }
        ],
        filter: [],
        should: [],
        must_not: []
      }
    };
    let resp = await this.requestKibana(tableName, query);
    console.debug('getUdidStartData after requestKibana', resp);

    // 提取设备数据
    let hits = (resp?.data?.responses[0]?.hits?.hits) || [];
    console.debug(hits);

    let ret = hits.map(item => {
      let srcData = (item?._source) || [];
      return srcData;
    });
    console.debug(ret);

    return ret;
  }

  /**
   * 获取用户信息
   * @returns {Promise<unknown[]>}
   */
  async getUserData(queryType = 'udid', queryString) {


    let tableName = 'bb_i_user_data*';

    let query;

    // 根据udid查询
    if (queryType === 'udid') {
      if (!this.udids?.length) {
        throw new Error('未提供设备udid');
      }

      let query_udids = this.udids.map(item => {
        return {
          match_phrase: {
            udid: item
          }
        }
      })


      query = {
        bool: {
          must: [
            {
              match_all: {}
            },
            {
              bool: {
                should: query_udids, // 在这里放置条件
                minimum_should_match: 1
              }
            },
            {
              range: {
                dt_msg_time: {
                  gte: this.t_start,
                  lte: this.t_end,
                  format: 'epoch_millis'
                }
              }
            }
          ],
          filter: [],
          should: [],
          must_not: []
        }
      };
    } else if (queryType === 'phone' || queryType === 'id_card') {
      if (queryType === 'phone' && !queryString) {
        throw new Error('未提供手机号！');
      }

      if (queryType === 'id_card' && !queryString) {
        throw new Error('未提供身份信息！');
      }

      query = {
        bool: {
          must: [
            {
              query_string: {
                query: queryString,
                analyze_wildcard: true,
                default_field: '*'
              }
            },
            {
              range: {
                dt_msg_time: {
                  gte: this.t_start,
                  lte: this.t_end,
                  format: 'epoch_millis'
                }
              }
            }
          ],
          filter: [],
          should: [],
          must_not: []
        }
      };
    }

    let resp = await this.requestKibana(tableName, query);
    resp = fetch.parseJsonResult(resp);
    console.debug('getUdidStartData after requestKibana', resp);

    // 提取设备数据
    let hits = (resp?.data?.responses[0]?.hits.hits) || [];
    console.debug('userdata hits', hits);

    // 预处理数据
    let ret = hits.map(item => {
      return (item?._source) || {};
    });
    if (queryType === 'udid') {
      ret = ret.filter(item => {
        return !!(item.id_card || item.phone);
      });
    } else if (queryType === 'phone') {
      ret = ret.filter(item => {
        return item.phone === queryString;
      });
    } else if (queryType === 'id_card') {
      ret = ret.filter(item => {
        return item.id_card === queryString;
      });
    }
    console.debug('get userdata', this.udids, ret);

    return ret;
  }

  async getEnvData() {

  }

  async getRiskData() {

  }

  async queryByKql(tableName, kql) {

    if (!kql) {
      throw new Error('未提供kql');
    }


    let query = {
      bool: {
        must: [
          {
            query_string: {
              query: kql, // 在这里放置条件
            }
          },
          {
            range: {
              dt_msg_time: {
                gte: this.t_start,
                lte: this.t_end,
                format: 'epoch_millis'
              }
            }
          }
        ],
        filter: [],
        should: [],
        must_not: []
      }
    };


    let resp = await this.requestKibana(tableName, query);
    resp = fetch.parseJsonResult(resp);
    console.debug('getUdidStartData after requestKibana', resp);

    // 提取设备数据
    let hits = (resp?.data?.responses[0]?.hits.hits) || [];
    console.debug('userdata hits', hits);

    // 预处理数据
    let ret = hits.map(item => {
      return (item?._source) || {};
    });

    return ret;
  }

}

export default KibanaUtil;
