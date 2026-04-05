import type { NextApiRequest, NextApiResponse } from "next";
import _ from "lodash";
import RoleRelationTypeService from "@/src/services/aiNoval/roleRelationTypeService";

const service = new RoleRelationTypeService();

async function research(req: NextApiRequest, res: NextApiResponse) {
    let page = _.toNumber(req.query.page || 1);
    let limit = _.toNumber(req.query.limit || 500);

    let ret = await service.query({}, [], ["id asc"], page, limit);
    res.status(200).json(ret);
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    let processerFn: Function | undefined = undefined;
    switch (req.method) {
        case "GET":
            processerFn = research;
            break;
    }

    if (!processerFn) {
        res.status(500).json({ message: "不支持的操作!" });
        return;
    }

    try {
        processerFn(req, res);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
        return;
    }
}
