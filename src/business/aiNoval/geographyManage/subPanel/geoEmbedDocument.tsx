import { Descriptions } from "antd";
import { IGeoUnionData } from "@/src/types/IAiNoval";
import { Button } from "antd";
import { EditOutlined } from "@ant-design/icons";
import SparkMD5 from "spark-md5";

interface IGeoEmbedDocumentProps {
    geoData?: IGeoUnionData | null;
}

export default function GeoEmbedDocument(props: IGeoEmbedDocumentProps) {
    const { geoData } = props;

    function handleUpdateEmbedDocument() {
        console.debug('更新嵌入文档');
    }

    function getFingerprint(geoData?: IGeoUnionData | null) {
        let embedDocument = geoData?.embed_document || '';
        if (embedDocument.length === 0) {
            return '--';
        }   
        let fingerprint = SparkMD5.hash(embedDocument);
        return fingerprint;
    }

    return (
        <div>
            <Descriptions title="嵌入数据" size="small" bordered column={3} labelStyle={{ width: '100px' }}>
                <Descriptions.Item label="条目CODE">
                    {geoData?.code || '--'}
                </Descriptions.Item>
                <Descriptions.Item label="条目指纹">
                    {getFingerprint(geoData)}
                </Descriptions.Item>
                <Descriptions.Item label="操作">
                    <Button type="primary" size="small" icon={<EditOutlined />} onClick={handleUpdateEmbedDocument}>更新嵌入文档</Button>
                </Descriptions.Item>
                <Descriptions.Item label="嵌入原文" span={3}>
                    {geoData?.embed_document || '--'}
                </Descriptions.Item>
            </Descriptions>
        </div>
    )
}