import React, { useState } from 'react'
import { Card, Space, Typography, Button, InputNumber, message } from 'antd'
import { CopyOutlined, CompressOutlined, RobotOutlined } from '@ant-design/icons'
import { useChapterContext } from '../chapterContext'
import { useWorldViewContext } from '../WorldViewContext'
import * as chapterApi from '../apiCalls'
import styles from './ChapterGeneratePanel.module.scss'

const { Text } = Typography

function ChapterSummaryValidatePanel() {
  const { state: chapterContext, forceRefreshChapter } = useChapterContext()
  const { worldViewData } = useWorldViewContext()

  const [stripLength, setStripLength] = useState<number>(300)
  const [summarizing, setSummarizing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  const hasContent = !!chapterContext?.content
  const hasWorldView = !!(chapterContext?.worldview_id || worldViewData?.id)

  const handleSummarize = async () => {
    if (!chapterContext?.id) {
      message.warning('请先选择章节')
      return
    }
    if (!hasContent) {
      message.warning('当前章节暂无正文内容，无法缩写')
      return
    }
    try {
      setSummarizing(true)
      await chapterApi.summarizeChapterAndSave(chapterContext.id, stripLength)
      await forceRefreshChapter()
      message.success('缩写已生成并保存到章节摘要')
    } catch (error) {
      console.error('summarizeChapterAndSave error -> ', error)
      message.error('缩写失败，请稍后重试')
    } finally {
      setSummarizing(false)
    }
  }

  const handleAnalyze = async () => {
    if (!chapterContext?.id) {
      message.warning('请先选择章节')
      return
    }
    if (!hasContent) {
      message.warning('当前章节暂无正文内容，无法分析')
      return
    }
    if (!hasWorldView) {
      message.warning('当前章节未关联世界观，无法分析偏离程度')
      return
    }
    try {
      setAnalyzing(true)
      await chapterApi.analyzeChapterWorldviewDeviation(chapterContext.id)
      await forceRefreshChapter()
      message.success('分析已完成并保存到章节影响字段')
    } catch (error) {
      console.error('analyzeChapterWorldviewDeviation error -> ', error)
      message.error('分析失败，请稍后重试')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleCopy = (text: string) => {
    if (!text) {
      message.warning('暂无可复制内容')
      return
    }
    navigator.clipboard
      .writeText(text)
      .then(() => message.success('内容已复制到剪贴板'))
      .catch(err => {
        console.error('copy error -> ', err)
        message.error('复制失败')
      })
  }

  if (!chapterContext?.id) {
    return (
      <div className={styles.emptyState}>
        <Text>请先在左侧选择章节</Text>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card
          title={
            <Space>
              <CompressOutlined />
              <Text strong>缩写章节</Text>
            </Space>
          }
          extra={
            <Space>
              <Text>目标长度：</Text>
              <InputNumber
                min={100}
                max={1000}
                value={stripLength}
                onChange={value => setStripLength(value || 300)}
              />
              <Button
                type="primary"
                onClick={handleSummarize}
                loading={summarizing}
                disabled={!hasContent}
              >
                使用 LLM 缩写并保存
              </Button>
              <Button
                icon={<CopyOutlined />}
                onClick={() => handleCopy(chapterContext?.summary ?? '')}
              >
                复制摘要
              </Button>
            </Space>
          }
        >
          <div className={styles.summarizedText}>
            {chapterContext?.summary || '点击右上角按钮开始缩写，生成结果会自动写入章节摘要（summary）。'}
          </div>
        </Card>

        <Card
          title={
            <Space>
              <RobotOutlined />
              <Text strong>分析世界观偏离程度与影响</Text>
            </Space>
          }
          extra={
            <Space>
              <Button
                type="primary"
                onClick={handleAnalyze}
                loading={analyzing}
                disabled={!hasContent || !hasWorldView}
              >
                分析并保存
              </Button>
              <Button
                icon={<CopyOutlined />}
                onClick={() => handleCopy(chapterContext?.effects ?? '')}
              >
                复制分析结果
              </Button>
            </Space>
          }
        >
          <div className={styles.diagnosisContent}>
            {chapterContext?.effects ||
              '点击右上角按钮开始分析，生成结果会自动写入章节影响字段（effects）。'}
          </div>
        </Card>
      </Space>
    </div>
  )
}

export default ChapterSummaryValidatePanel

