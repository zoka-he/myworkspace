import React from "react";
import { Modal, Button, Typography } from "antd";

export interface ContentViewModalProps {
  isVisible: boolean;
  onClose: () => void;
  content: string;
  chapterInfo: {
    chapterNumber: number;
    chapterTitle: string;
    version: number;
  } | null;
  type: "original" | "stripped";
}

export default function ContentViewModal({
  isVisible,
  onClose,
  content,
  chapterInfo,
  type,
}: ContentViewModalProps) {
  const modalTitle = chapterInfo
    ? `${chapterInfo.chapterNumber} ${chapterInfo.chapterTitle} (v${chapterInfo.version}) - ${
        type === "original" ? "原文" : "缩写"
      }`
    : "";

  return (
    <Modal
      title={modalTitle}
      open={isVisible}
      onCancel={onClose}
      width={"60vw"}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
    >
      <div
        style={{
          maxHeight: "60vh",
          overflow: "auto",
          padding: "16px",
          backgroundColor: "#fafafa",
          borderRadius: "4px",
        }}
      >
        <Typography.Paragraph style={{ whiteSpace: "pre-wrap" }}>
          {content}
        </Typography.Paragraph>
      </div>
    </Modal>
  );
}

