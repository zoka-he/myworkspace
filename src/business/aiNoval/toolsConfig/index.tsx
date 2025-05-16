import { Card, Col, Divider, Row } from "antd";
import { WorldViewConfig } from "./WorldViewConfig";
import { CommonConfig } from "./commonConfig";

export default function() {
    return (
        <div>
            <Card title="Dify配置项">
                <Row>
                    <Col span={12}>
                        <Divider orientation="left">
                            通用工具配置
                        </Divider>
                        <CommonConfig />
                    </Col>
                    <Col span={12}>
                        <Divider orientation="left">
                            世界观工具配置
                        </Divider>
                        <WorldViewConfig />
                    </Col>
                </Row>
            </Card>
        </div>
    )
}