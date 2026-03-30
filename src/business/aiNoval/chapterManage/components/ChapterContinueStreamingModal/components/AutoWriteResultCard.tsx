import React from "react";
import { Alert, Button, Card, Space, Tabs, Tag, Typography } from "antd";
import ThinkingResult from "./ThinkingResult";
import { useTheme } from "@/src/utils/hooks/useTheme";

export default function AutoWriteResultCard(props: {
  autoWriteStatus: string;
  autoWriteElapsed: number;
  deepseekBalance: any;
  autoWriteError: string;
  draftContent: string;
  initialDraftContent: string;
  polishRounds: Array<{
    round: number;
    inputDraft: string;
    critic1: { pass: boolean; reason: string; raw: string };
    critic3: { pass: boolean; reason: string; advice: string; raw: string };
    modifier: { tunedDraft: string; skipped: boolean };
    polish: { draft: string };
  }>;
  disabledCopy: boolean;
  disabledRewrite: boolean;
  onCopy: (text?: string) => void;
  onRewrite: () => void;
}) {
  const { currentTheme } = useTheme();

  const colorStyle = {
    background: currentTheme === "light" ? "#fafafa" : "#333",
    border: currentTheme === "light" ? "1px solid #f0f0f0" : "1px solid #555",
  };

  const renderBlock = (title: string, content: string, isDraft?: boolean) => (
    <div
      style={{
        marginBottom: 12,
        padding: 12,
        borderRadius: 8,
        ...colorStyle,
      }}
    >
      <Typography.Text strong>{title}</Typography.Text>
      <div style={{ marginTop: 8 }}>
        {isDraft ? (
          <ThinkingResult thinkingResult={content} />
        ) : (
          <Typography.Paragraph style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
            {content || "（无）"}
          </Typography.Paragraph>
        )}
      </div>
    </div>
  );

  const renderTabContent = (content: string, subtitle?: string) => (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          padding: "8px 10px",
          borderRadius: 6,
          ...colorStyle,
        }}
      >
        <Typography.Text type="secondary">{subtitle || "稿件内容"}</Typography.Text>
        <Button
          type="primary"
          size="small"
          disabled={props.disabledCopy || !content?.trim()}
          onClick={() => props.onCopy(content)}
        >
          复制本页稿件
        </Button>
      </div>
      {renderBlock(subtitle || "稿件内容", content, true)}
    </div>
  );

  const items = [
    {
      key: "initial",
      label: "初稿",
      children: renderTabContent(
        props.initialDraftContent || props.draftContent,
        "初稿（含理解检查）"
      ),
    },
    ...props.polishRounds.map((r) => ({
      key: `round-${r.round}`,
      label: `润色${r.round}轮`,
      children: (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
              padding: "8px 10px",
              borderRadius: 6,
              ...colorStyle,
            }}
          >
            <Typography.Text type="secondary">{`润色第 ${r.round} 轮`}</Typography.Text>
            <Button
              type="primary"
              size="small"
              disabled={props.disabledCopy || !r.polish.draft?.trim()}
              onClick={() => props.onCopy(r.polish.draft || "")}
            >
              复制本页稿件
            </Button>
          </div>
          {renderBlock(
            "1号审稿",
            `${r.critic1.pass ? "PASS" : "FAIL"}${r.critic1.reason ? `：${r.critic1.reason}` : ""}`
          )}
          {renderBlock(
            "3号审稿",
            `${r.critic3.pass ? "PASS" : "FAIL"}${r.critic3.reason ? `：${r.critic3.reason}` : ""}`
          )}
          {renderBlock("3号建议", r.critic3.advice || "（无）")}
          {renderBlock("修改员输出", r.modifier.tunedDraft || "（无）", true)}
          {renderBlock("润色稿", r.polish.draft || "", true)}
        </div>
      ),
    })),
  ];

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
      <Tabs items={items} />
    </Card>
  );
}

