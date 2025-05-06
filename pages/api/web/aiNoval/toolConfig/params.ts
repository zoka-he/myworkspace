import { NextApiRequest, NextApiResponse } from 'next'
import ToolsConfigService from '@/src/services/aiNoval/toolsConfigService';
import { ISqlCondMap } from '@/src/types/IMysqlActions';
import _ from 'lodash';

interface ToolConfigParam {
  name: string
  value: string
}

const service = new ToolsConfigService();

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
    console.debug('req query', req.query);

    const page = _.toNumber(req.query.page || 1);
    const limit = _.toNumber(req.query.limit || 100);

    const name = req.query.name || '';

    let queryObject: ISqlCondMap = {};
    if (name instanceof Array) {
        queryObject.cfg_name = { $in: name };
    } else if (name) {
        queryObject.cfg_name = name;
    }

    let ret = await service.query(queryObject, [], ['cfg_name asc'], page, limit);
    res.status(200).json(ret);
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
    try {
        const params = req.body as ToolConfigParam[];
        // const table = 'dify_tools_config';

        for (const param of params) {
            await service.saveConfig(param.name, param.value);

            // Try update first
            // let conn = await service.getBaseApi().execute(
            //     `update ${table} set cfg_value_string=? where cfg_name=?`, 
            //     [param.value || '', param.name]
            // );

            // console.debug('update count', conn);
            
            // // If no rows affected, do insert
            // if (conn[0].affectedRows === 0) {
            //     await service.getBaseApi().execute(
            //         `insert into ${table}(cfg_name,cfg_value_string) values(?,?)`, 
            //         [param.name, param.value || '']
            //     );
            // }
        }

        return res.status(200).json({ message: 'Success' })
    } catch (error) {
        console.error('Failed to update tool config:', error)
        return res.status(500).json({ message: 'Internal server error' })
    }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {

  switch (req.method) {
    case 'GET':
        return await handleGet(req, res);
    case 'POST':
        return await handlePost(req, res);
    default:
        return res.status(405).json({ message: 'Method not allowed' })
  }
}
