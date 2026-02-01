import { Descriptions } from "antd";
import { IFactionDefData } from "@/src/types/IAiNoval";
import { Button } from "antd";
import { EditOutlined } from "@ant-design/icons";
import SparkMD5 from "spark-md5";
import { useFactionEmbedDocuments, useLoadFactionEmbedDocuments } from "../FactionManageContext";
import { prepareTextEmbedding } from '@/src/api/aiNovel';
import { useMemo } from "react";

interface IFactionEmbedPanelProps {
    factionData?: IFactionDefData | null;
    style?: React.CSSProperties;
}

export default function FactionEmbedPanel(props: IFactionEmbedPanelProps) {
    const { factionData, style } = props;

    const [factionEmbedDocuments] = useFactionEmbedDocuments();

    const document = useMemo(() => {
        if (!factionData || !factionData.id || !factionEmbedDocuments?.length) {
            return null;
        }
        if (factionEmbedDocuments.find(item => item.id === String(factionData.id))) {
            return factionEmbedDocuments.find(item => item.id === String(factionData.id));
        }
        return null;
    }, [factionData, factionEmbedDocuments]);

    async function handleUpdateEmbedDocument() {
        if (!factionData || !factionData.id) {
            return;
        }

        let res = await prepareTextEmbedding({ 
            characters: [],
            worldviews: [],
            locations: [],
            factions: [factionData.id],
            events: [],
        });
    }

    function getFingerprint(factionData?: IFactionDefData | null) {
        if (!factionData) return '--';
        // 使用 embed_document 生成指纹，类似 geo 的 embed_document
        const embedDocument = `${factionData.embed_document || ''}`.trim();
        if (embedDocument.length === 0) {
            return '--';
        }   
        let fingerprint = SparkMD5.hash(embedDocument);
        return fingerprint;
    }

    function getEmbedDocument(factionData?: IFactionDefData | null) {
        if (!factionData) return '--';
        // 组合 embed_document 作为嵌入文档
        const embedDocument = `${factionData.embed_document || ''}`.trim();
        return embedDocument || '--';
    }

    return (
        <div style={style}>
            <Descriptions title="嵌入数据" size="small" bordered column={2} labelStyle={{ width: '100px' }}>
                <Descriptions.Item label="条目ID">
                    {factionData?.id || '--'}
                </Descriptions.Item>
                <Descriptions.Item label="操作">
                    <Button type="primary" size="small" 
                        icon={<EditOutlined />} 
                        onClick={handleUpdateEmbedDocument}
                        disabled={!factionData?.id || (!factionData?.name && !factionData?.description)}
                    >更新嵌入文档</Button>
                </Descriptions.Item>
                <Descriptions.Item label="条目指纹(本地)">
                    {getFingerprint(factionData)}
                </Descriptions.Item>
                <Descriptions.Item label="条目指纹(chroma)" span={2}>
                    {document?.metadata?.fingerprint || '--'}
                </Descriptions.Item>
                <Descriptions.Item label="嵌入原文" span={2}>
                    {getEmbedDocument(factionData)}
                </Descriptions.Item>
            </Descriptions>
        </div>
    )
}
