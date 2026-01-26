import { NextApiRequest, NextApiResponse } from "next";
import { ApiResponse } from "@/src/types/ApiResponse";
import _ from 'lodash';
import RoleDefService from "@/src/services/aiNoval/roleDefService";
import RoleInfoService from "@/src/services/aiNoval/roleInfoService";
import FactionDefService from "@/src/services/aiNoval/factionDefService";
import GeoGeographyService from "@/src/services/aiNoval/geoGeographyService";
import WorldviewDefService from "@/src/services/aiNoval/worldViewManageService";
import TimelineEventService from "@/src/services/aiNoval/timelineEventService";
import { EmbedTaskData } from "@/src/types/AiNovelMq";
import { getRabbitMQProducer, getRabbitMQProducerAsync } from "@/src/server/rabbitmq";

const roleDefService = new RoleDefService();
const roleInfoService = new RoleInfoService();
const factionDefService = new FactionDefService();
const geoGeographyService = new GeoGeographyService();
const worldviewDefService = new WorldviewDefService();
const timelineEventService = new TimelineEventService();

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse>
) {
    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed, only POST method is allowed' });
        return;
    }

    const { worldviews, characters, locations, factions, events } = req.body;

    if (!checkArrayData(characters) || !checkArrayData(worldviews) || !checkArrayData(locations) || !checkArrayData(factions) || !checkArrayData(events)) {
        res.status(400).json({ success: false, error: 'Invalid data, characters, worldviews, locations, factions, and events must be arrays of strings or numbers' });
        return;
    }

    try {
        const [
            characterData,
            worldviewData,
            locationData,
            factionData,
            eventData,
        ] = await Promise.all([
            prepareCharacterDocument(characters),
            prepareWorldviewDocument(worldviews),
            prepareGeoDocument(locations),
            prepareFactionDocument(factions),
            prepareEventDocument(events),
        ]);

        console.info('characterData ----------------> ', characterData);
        console.info('worldviewData ----------------> ', worldviewData);
        console.info('locationData ----------------> ', locationData);
        console.info('factionData ----------------> ', factionData);
        console.info('eventData ----------------> ', eventData);

        // const tasks: EmbedTaskData[] = Array.from(
        //     _.flatten([
        //         characterData,
        //         worldviewData,
        //         locationData,
        //         factionData,
        //         eventData,
        //     ])
        // );

        const producer = await getRabbitMQProducerAsync();

        // 全部发到队列，并且统计数量，注意这个队列需要传入type字段，且必须提供document和fingerprint字段
        const pushed = {
            characters: await producer.sendBatchToQueue(
                'ai_novel_embed_tasks', 
                characterData.map((t: any) => JSON.stringify({ ...t, type: 'character' }))
            ),
            worldviews: await producer.sendBatchToQueue(
                'ai_novel_embed_tasks', 
                worldviewData.map((t: any) => JSON.stringify({ ...t, type: 'worldview' }))
            ),
            locations: await producer.sendBatchToQueue(
                'ai_novel_embed_tasks', 
                locationData.map((t: any) => JSON.stringify({ ...t, type: 'location' }))
            ),
            factions: await producer.sendBatchToQueue(
                'ai_novel_embed_tasks', 
                factionData.map((t: any) => JSON.stringify({ ...t, type: 'faction' }))
            ),
            events: await producer.sendBatchToQueue(
                'ai_novel_embed_tasks', 
                eventData.map((t: any) => JSON.stringify({ ...t, type: 'event' }))
            ),
        }

        res.status(200).json({ success: true, message: 'success', data: pushed });
    } catch (error) {
        console.error('prepareEmbedding error ----------------> ', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
        return;
    }
}

function checkArrayData(data: any): boolean {

    if (!_.isArray(data)) {
        return false;
    }

    return data.every((item: any) => {
        return _.isString(item) || _.isNumber(item);
    });

}

async function prepareGeoDocument(codes: string[]) {
    if (codes.length === 0) {
        return [];
    }

    const geoTables = ['geo_star_system', 'geo_star', 'geo_planet', 'geo_satellite', 'geo_geography_unit'];
    const geoColumns = (tableName: string) => {

        let source_table_name = `'${tableName}' source_table_name`;

        return [
            'id',
            'worldview_id',
            'code', 
            'name', 
            source_table_name,
            'embed_document document', 
            'md5(embed_document) fingerprint',
        ]
    }


    let data = await geoGeographyService.getGeoInfoByIds(codes, geoTables, geoColumns);

    return data.map((r: { id: any; worldview_id: any; code: any; name: any; source_table_name: any; document: any; fingerprint: any; }) => ({
        id: r.id,
        worldview_id: r.worldview_id,
        code: r.code,
        title: r.name,
        source_table_name: r.source_table_name,
        document: r.document,
        fingerprint: r.fingerprint,
    }));
}

async function prepareCharacterDocument(characters: number[]) {
    if (characters.length === 0) {
        return [];
    }
    let ret = await roleInfoService.getRoleDocumentByIds(characters);
    return ret;
}

async function prepareWorldviewDocument(worldviews: number[]) {
    if (worldviews.length === 0) {
        return [];
    }
    let ret = await worldviewDefService.getWorldViewDocumentByIds(worldviews);
    return ret.data;
}

async function prepareFactionDocument(factions: number[]) {
    if (factions.length === 0) {
        return [];
    }
    let ret = await factionDefService.getFactionDocumentByIds(factions);
    return ret.data;
}

async function prepareEventDocument(events: number[]) {
    if (events.length === 0) {
        return [];
    }
    let ret = await timelineEventService.getEventDocumentByIds(events);
    return ret.data;
}