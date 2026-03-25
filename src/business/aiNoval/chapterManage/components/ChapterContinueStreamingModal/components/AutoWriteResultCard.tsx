import React from "react";
import { Alert, Button, Card, Space, Tag } from "antd";
import ThinkingResult from "./ThinkingResult";

export default function AutoWriteResultCard(props: {
  autoWriteStatus: string;
  autoWriteElapsed: number;
  deepseekBalance: any;
  autoWriteError: string;
  autoWriteResult: string;
  disabledCopy: boolean;
  disabledRewrite: boolean;
  onCopy: () => void;
  onRewrite: () => void;
}) {
  return (
    <Card
      size="small"
      style={{ marginTop: 16 }}
      title={
        <div className="f-flex-two-side" style={{ alignItems: "center" }}>
          <div>
            <span>自动续写结果&nbsp;</span>
            <Tag>{props.autoWriteStatus}</Tag>
            {props.autoWriteElapsed > 0 ? (
              <Tag color="orange">
                ({(props.autoWriteElapsed / 1000).toFixed(2)}秒)
              </Tag>
            ) : null}
          </div>
          <Space>
            <Tag color="green">Deepseek余额：{props.deepseekBalance}</Tag>
            <Button
              type="primary"
              size="small"
              disabled={props.disabledCopy}
              onClick={props.onCopy}
            >
              复制
            </Button>
            <Button
              danger
              size="small"
              disabled={props.disabledRewrite}
              onClick={props.onRewrite}
            >
              重写
            </Button>
          </Space>
        </div>
      }
    >
      {props.autoWriteError.length > 0 && (
        <Alert message={props.autoWriteError} type="error" />
      )}
      <ThinkingResult thinkingResult={props.autoWriteResult} />
    </Card>
  );
}

