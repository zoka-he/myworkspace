import { Descriptions } from "antd";
import { IGeoUnionData } from "@/src/types/IAiNoval";
import { Button } from "antd";
import { EditOutlined } from "@ant-design/icons";
import SparkMD5 from "spark-md5";
import { useGeoEmbedDocuments, useLoadGeoEmbedDocuments } from "../GeoDataProvider";
import { prepareTextEmbedding } from '@/src/api/aiNovel';

interface IGeoEmbedDocumentProps {
    geoData?: IGeoUnionData | null;
}

export default function GeoEmbedDocument(props: IGeoEmbedDocumentProps) {
    const { geoData } = props;

    const [geoEmbedDocuments] = useGeoEmbedDocuments();

    async function handleUpdateEmbedDocument() {
        if (!geoData || !geoData.code) {
            return;
        }

        let res = await prepareTextEmbedding({ 
            characters: [],
            worldviews: [],
            locations: [geoData.code],
            factions: [],
            events: [],
        });
    }

    function getFingerprint(geoData?: IGeoUnionData | null) {
        let embedDocument = geoData?.embed_document || '';
        if (embedDocument?.length === 0) {
            return '--';
        }   
        let fingerprint = SparkMD5.hash(embedDocument);
        return fingerprint;
    }

    function getChromaFingerprint(geoData?: IGeoUnionData | null) {
        if (!geoEmbedDocuments?.length) {
            return '--';
        }
        return geoEmbedDocuments.find(item => item?.metadata?.code === geoData?.code)?.metadata?.fingerprint;
    }

    return (
        <div>
            <Descriptions title="嵌入数据" size="small" bordered column={2} labelStyle={{ width: '100px' }}>
                <Descriptions.Item label="条目CODE">
                    {geoData?.code || '--'}
                </Descriptions.Item>
                <Descriptions.Item label="操作">
                    <Button type="primary" size="small" 
                        icon={<EditOutlined />} 
                        onClick={handleUpdateEmbedDocument}
                        disabled={!geoData?.embed_document}
                    >更新嵌入文档</Button>
                </Descriptions.Item>
                <Descriptions.Item label="条目指纹(本地)">
                    {getFingerprint(geoData)}
                </Descriptions.Item>
                <Descriptions.Item label="条目指纹(chroma)" span={2}>
                    {getChromaFingerprint(geoData)}
                </Descriptions.Item>
                <Descriptions.Item label="嵌入原文" span={2}>
                    {geoData?.embed_document || '--'}
                </Descriptions.Item>
            </Descriptions>
        </div>
    )
}