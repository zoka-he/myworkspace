import React from "react";
import { Steps, Typography } from "antd";
import type { GenChapterStepStateItem } from "../state/genChapterStepMachine";

const ROUND_STEP_IDS = new Set(["critic1", "critic3", "modifier", "polish"]);

function mapStatus(status: GenChapterStepStateItem["status"]): "wait" | "process" | "finish" | "error" {
  switch (status) {
    case "running":
      return "process";
    case "success":
      return "finish";
    case "error":
      return "error";
    case "skipped":
      return "finish";
    case "pending":
    case "idle":
    default:
      return "wait";
  }
}

export default function GenChapterStepBar(props: {
  steps: GenChapterStepStateItem[];
}) {
  const steps = (props.steps || []) as GenChapterStepStateItem[];

  const currentIndex = Math.max(0, steps.findIndex((s) => s.status === "running"));

  return (
    <div style={{ marginTop: 8, marginBottom: 8 }}>
      <Steps
        direction="horizontal"
        size="small"
        current={currentIndex}
        labelPlacement="vertical"
        items={steps.map((s) => {
          const title = s.title || String(s.id);
          const description =
            ROUND_STEP_IDS.has(String(s.id)) && s.detail ? (
              <Typography.Text type={s.status === "error" ? "danger" : "secondary"}>
                {String(s.detail)}
              </Typography.Text>
            ) : undefined;

          return {
            title,
            status: mapStatus(s.status),
            description,
          };
        })}
      />
    </div>
  );
}

