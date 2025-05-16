import React, { useState } from 'react'
import { Card, Button, Input, Space, Modal, message, Typography, Upload } from 'antd'
import { EditOutlined, CopyOutlined, RobotOutlined, UploadOutlined, CompressOutlined } from '@ant-design/icons'
import { IChapter } from '@/src/types/IAiNoval'
import * as chapterApi from '../apiCalls'
import styles from './ChapterGeneratePanel.module.scss'
import type { UploadProps } from 'antd'

const { TextArea } = Input
const { Text } = Typography

interface ChapterGeneratePanelProps {
  selectedChapter: IChapter | null
  onChapterChange: () => void
}

function ChapterGeneratePanel({ selectedChapter, onChapterChange }: ChapterGeneratePanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState('')
  const [isDiagnosisModalVisible, setIsDiagnosisModalVisible] = useState(false)
  const [diagnosisResult, setDiagnosisResult] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSummarizeModalVisible, setIsSummarizeModalVisible] = useState(false)
  const [summarizedContent, setSummarizedContent] = useState('')
  const [isSummarizing, setIsSummarizing] = useState(false)

  // 当选中章节改变时，更新内容
  React.useEffect(() => {
    if (selectedChapter) {
      setContent(selectedChapter.content || '')
    }
  }, [selectedChapter])

  // 保存章节内容
  const handleSaveContent = async () => {
    if (!selectedChapter) return

    try {
      setIsLoading(true)
      await chapterApi.updateChapter({
        id: selectedChapter.id,
        content
      })
      message.success('内容已保存')
      setIsEditing(false)
      onChapterChange()
    } catch (error) {
      message.error('保存失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 复制内容到剪贴板
  const handleCopyContent = () => {
    navigator.clipboard.writeText(content)
      .then(() => message.success('内容已复制到剪贴板'))
      .catch(() => message.error('复制失败'))
  }

  // 打开诊断模态框
  const handleOpenDiagnosis = () => {
    setIsDiagnosisModalVisible(true)
    // TODO: 这里可以添加调用LLM进行诊断的逻辑
    setDiagnosisResult('章节诊断功能开发中...')
  }

  // 复制诊断结果
  const handleCopyDiagnosis = () => {
    navigator.clipboard.writeText(diagnosisResult)
      .catch(() => message.error('复制失败'))
  }

  // 处理文件导入
  const handleFileImport: UploadProps['customRequest'] = async ({ file }) => {
    try {
      const text = await (file as File).text()
      setContent(text)
      setIsEditing(true)
      message.success('文件导入成功')
    } catch (error) {
      message.error('文件导入失败')
    }
  }

  // 处理章节缩写
  const handleSummarize = async () => {
    if (!content) return

    try {
      setIsSummarizing(true)
      setSummarizedContent('')

      const text = await chapterApi.stripChapterBlocking(selectedChapter?.id || 0, 300)

      setSummarizedContent(text);

    } catch (error) {
      console.error('stripChapter error -> ', error)
      message.error('缩写失败')
    } finally {
      setIsSummarizing(false)
    }
  }

  // 复制缩写内容
  const handleCopySummarized = () => {
    navigator.clipboard.writeText(summarizedContent)
      .then(() => message.success('缩写内容已复制到剪贴板'))
      .catch(() => message.error('复制失败'))
  }

  if (!selectedChapter) {
    return (
      <div className={styles.emptyState}>
        <Text type="secondary">请先选择一个章节</Text>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Card
        title={
          <Space>
            <Text>章节内容</Text>
            {!isEditing && (
              <Space>
                <Upload
                  accept=".txt,.md"
                  showUploadList={false}
                  customRequest={handleFileImport}
                >
                  <Button icon={<UploadOutlined />}>
                    导入文件
                  </Button>
                </Upload>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => setIsEditing(true)}
                >
                  编辑内容
                </Button>
              </Space>
            )}
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<CompressOutlined />}
              onClick={() => setIsSummarizeModalVisible(true)}
              disabled={!content}
            >
              缩写章节
            </Button>
            <Button
              icon={<CopyOutlined />}
              onClick={handleCopyContent}
              disabled={!content}
            >
              复制内容
            </Button>
            <Button
              type="primary"
              icon={<RobotOutlined />}
              onClick={handleOpenDiagnosis}
              disabled={!content}
            >
              LLM诊断
            </Button>
          </Space>
        }
      >
        {isEditing ? (
          <div className={styles.editorContainer}>
            <TextArea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="请输入章节内容..."
              autoSize={{ minRows: 10 }}
            />
            <Space className={styles.editorActions}>
              <Button onClick={() => setIsEditing(false)}>取消</Button>
              <Button type="primary" onClick={handleSaveContent} loading={isLoading}>
                保存
              </Button>
            </Space>
          </div>
        ) : (
          <div className={styles.contentDisplay}>
            {content ? (
              content
            ) : (
              <div className={styles.uploadDrag}>
                <Upload.Dragger
                  accept=".txt,.md"
                  showUploadList={false}
                  customRequest={handleFileImport}
                >
                  <p className="ant-upload-drag-icon">
                    <UploadOutlined />
                  </p>
                  <p className="ant-upload-text">点击或拖拽文件到此区域导入</p>
                  <p className="ant-upload-hint">
                    支持 .txt 或 .md 格式的文件
                  </p>
                </Upload.Dragger>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* LLM诊断模态框 */}
      <Modal
        title="章节诊断"
        open={isDiagnosisModalVisible}
        onCancel={() => setIsDiagnosisModalVisible(false)}
        width={800}
        footer={[
          <Button key="copy" icon={<CopyOutlined />} onClick={handleCopyDiagnosis}>
            复制诊断结果
          </Button>,
          <Button key="close" onClick={() => setIsDiagnosisModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        <div className={styles.diagnosisContent}>
          {diagnosisResult}
        </div>
      </Modal>

      {/* 缩写章节模态框 */}
      <Modal
        title="章节缩写"
        open={isSummarizeModalVisible}
        onCancel={() => setIsSummarizeModalVisible(false)}
        width={800}
        footer={[
          <Button key="copy" icon={<CopyOutlined />} onClick={handleCopySummarized}>
            复制缩写内容
          </Button>,
          <Button key="close" onClick={() => setIsSummarizeModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        <div className={styles.summarizeContent}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              type="primary"
              icon={<RobotOutlined />}
              onClick={handleSummarize}
              loading={isSummarizing}
              disabled={!content}
            >
              使用LLM缩写
            </Button>
            <div className={styles.summarizedText}>
              {summarizedContent || '点击上方按钮开始缩写...'}
            </div>
          </Space>
        </div>
      </Modal>
    </div>
  )
}

export default ChapterGeneratePanel 