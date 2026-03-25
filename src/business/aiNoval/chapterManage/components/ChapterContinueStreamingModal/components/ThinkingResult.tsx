import React, { useEffect, useState } from "react";
import { Button, Divider, Typography } from "antd";
import {
  CloseCircleOutlined,
  ExpandAltOutlined,
} from "@ant-design/icons";

export default function ThinkingResult(props: { thinkingResult: string }) {
  const [thinkingPart, setThinkingPart] = useState<string>("");
  const [resultPart, setResultPart] = useState<string>("");
  const [showThinking, setShowThinking] = useState<boolean>(false);

  useEffect(() => {
    const regex = /<think>([\s\S]*?)<\/think>/g;
    const match = regex.exec(props.thinkingResult);
    if (match) {
      setThinkingPart(match[1]);
    } else {
      setThinkingPart("");
    }
    setResultPart(props.thinkingResult.replace(regex, ""));
  }, [props.thinkingResult]);

  const retDoms: React.ReactNode[] = [];
  if (thinkingPart.length > 0) {
    if (showThinking) {
      retDoms.push(
        <Button
          key="hide1"
          type="primary"
          size="small"
          icon={<CloseCircleOutlined />}
          onClick={() => setShowThinking(false)}
        >
          隐藏思考过程
        </Button>
      );
      retDoms.push(
        <Typography.Paragraph key="thinking" style={{ whiteSpace: "pre-wrap" }}>
          {thinkingPart}{" "}
        </Typography.Paragraph>
      );
      retDoms.push(
        <Button
          key="hide2"
          type="primary"
          size="small"
          icon={<CloseCircleOutlined />}
          onClick={() => setShowThinking(false)}
        >
          隐藏思考过程
        </Button>
      );
    } else {
      retDoms.push(
        <Button
          key="show"
          type="primary"
          size="small"
          icon={<ExpandAltOutlined />}
          onClick={() => setShowThinking(true)}
        >
          显示思考过程
        </Button>
      );
    }
    retDoms.push(<Divider key="div" />);
  }

  if (resultPart.length > 0) {
    retDoms.push(
      <Typography.Paragraph key="result" style={{ whiteSpace: "pre-wrap" }}>
        {resultPart}
      </Typography.Paragraph>
    );
  } else {
    retDoms.push(
      <div key="empty" style={{ minHeight: "10em" }}>
        暂无生成结果
      </div>
    );
  }

  return <>{retDoms}</>;
}

