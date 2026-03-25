import React from "react";
import { Button, Col, Row } from "antd";
import { CopyOutlined } from "@ant-design/icons";

export default function ModalFooter(props: {
  onStorePrompts: () => void;
  onCopy: () => void;
  onClose: () => void;
}) {
  return (
    <Row gutter={16}>
      <Col span={12}>
        <Button onClick={props.onStorePrompts}>存储提示词集</Button>
      </Col>
      <Col span={12}>
        <Button key="copy" icon={<CopyOutlined />} onClick={props.onCopy}>
          复制续写内容
        </Button>
        <Button key="close" onClick={props.onClose}>
          关闭
        </Button>
      </Col>
    </Row>
  );
}

