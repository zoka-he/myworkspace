import React, { useState } from 'react'
import { Card, Button, Input, Space, Modal, message, Typography, Upload, InputNumber } from 'antd'
import { EditOutlined, CopyOutlined, UploadOutlined, CompressOutlined, TagOutlined, RobotOutlined, FileTextOutlined } from '@ant-design/icons'
import { IChapter } from '@/src/types/IAiNoval'
import * as chapterApi from '../apiCalls'
import styles from './ChapterGeneratePanel.module.scss'
import type { UploadProps } from 'antd'
import ChapterContinueModal from './ChapterContinueModal'
import GenChapterByDetailModal from './GenChapterByDetailModal'
import * as apiCalls from '../apiCalls'

const { TextArea } = Input
const { Text } = Typography

interface ChapterGeneratePanelProps {
  selectedChapter: IChapter | null
  onChapterChange: () => void
}

function ChapterGeneratePanel({ selectedChapter, onChapterChange }: ChapterGeneratePanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSummarizeModalVisible, setIsSummarizeModalVisible] = useState(false)
  const [summarizedContent, setSummarizedContent] = useState('')
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [isNameModalVisible, setIsNameModalVisible] = useState(false)
  const [suggestedName, setSuggestedName] = useState('')
  const [isNaming, setIsNaming] = useState(false)
  const [isContinueModalVisible, setIsContinueModalVisible] = useState(false)
  const [isGenDetailModalVisible, setIsGenDetailModalVisible] = useState(false)

  // 当选中章节改变时，更新内容
  React.useEffect(() => {
    if (selectedChapter?.id) {
      apiCalls.getChapterById(selectedChapter.id).then((res) => {
        setContent(res.content || '')
      })
    } else {
      setContent('');
    }
  }, [selectedChapter])

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

  // 渲染编辑功能
  const renderEditFeature = () => {
    if (!isEditing) return null

    return (
      <div className={styles.editorContainer}>
        <TextArea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="请输入章节内容..."
          autoSize={{ minRows: 10 }}
        />
        <Space className={styles.editorActions}>
          <Button onClick={() => setIsEditing(false)}>取消</Button>
          <Button 
            type="primary" 
            onClick={async () => {
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
            }} 
            loading={isLoading}
          >
            保存
          </Button>
        </Space>
      </div>
    )
  }

  // 渲染AI续写功能
  const renderContinueFeature = () => {
    return (
      <ChapterContinueModal
        selectedChapterId={selectedChapter?.id}
        isVisible={isContinueModalVisible}
        onClose={() => setIsContinueModalVisible(false)}
        onChapterChange={onChapterChange}
      />
    )
  }

  // 渲染AI扩写细纲功能
  const renderGenDetailFeature = () => {
    return (
      <GenChapterByDetailModal
        selectedChapter={selectedChapter}
        open={isGenDetailModalVisible}
        onCancel={() => setIsGenDetailModalVisible(false)}
        onOk={(content) => {
          setContent(content)
          setIsGenDetailModalVisible(false)
          onChapterChange()
        }}
      />
    )
  }

  // 渲染缩写功能
  const renderSummarizeFeature = () => {

    const [stripLength, setStripLength] = useState(300);

    const title = <>
      <Text>章节缩写</Text>
      
    </>

    return (
      <Modal
        title={title}
        open={isSummarizeModalVisible}
        onCancel={() => setIsSummarizeModalVisible(false)}
        width={800}
        footer={[
          <Button 
            key="copy" 
            icon={<CopyOutlined />} 
            onClick={() => {
              navigator.clipboard.writeText(summarizedContent)
                .then(() => message.success('缩写内容已复制到剪贴板'))
                .catch(() => message.error('复制失败'))
            }}
          >
            复制缩写内容
          </Button>,
          <Button key="close" onClick={() => setIsSummarizeModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        <div className={styles.summarizeContent}>
          <Space direction="horizontal" style={{ width: '100%' }}>
            <span>缩写长度</span>
            <InputNumber min={100} max={1000} defaultValue={300} onChange={(value) => setStripLength(value || 300)} />
            <Button
              type="primary"
              onClick={async () => {
                if (!content) return
                try {
                  setIsSummarizing(true)
                  setSummarizedContent('')
                  const text = await chapterApi.stripChapterBlocking(selectedChapter?.id || 0, stripLength)
                  setSummarizedContent(text)
                } catch (error) {
                  console.error('stripChapter error -> ', error)
                  message.error('缩写失败')
                } finally {
                  setIsSummarizing(false)
                }
              }}
              loading={isSummarizing}
              disabled={!content}
            >
              使用LLM缩写
            </Button>
            
          </Space>

          <div className={styles.summarizedText}>
            {summarizedContent || '点击上方按钮开始缩写...'}
          </div>
        </div>
      </Modal>
    )
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
                <Button
                  type="primary"
                  icon={<RobotOutlined />}
                  onClick={() => setIsContinueModalVisible(true)}
                >
                  AI续写
                </Button>
                <Button
                  type="primary"
                  icon={<FileTextOutlined />}
                  onClick={() => setIsGenDetailModalVisible(true)}
                >
                  AI扩写细纲
                </Button>
              </Space>
            )}
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<TagOutlined />}
              onClick={() => {  setSuggestedName(''); setIsNameModalVisible(true); }}
              disabled={!content}
            >
              命名章节
            </Button>
            <Button
              icon={<CompressOutlined />}
              onClick={() => setIsSummarizeModalVisible(true)}
              disabled={!content}
            >
              缩写章节
            </Button>
          </Space>
        }
      >
        {isEditing ? (
          renderEditFeature()
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

      {renderContinueFeature()}
      {renderGenDetailFeature()}
      {renderSummarizeFeature()}

      {/* 命名章节模态框 */}
      <Modal
        title="命名章节"
        open={isNameModalVisible}
        onCancel={() => setIsNameModalVisible(false)}
        width={800}
        footer={[
          <Button 
            key="copy" 
            icon={<CopyOutlined />} 
            onClick={() => {
              navigator.clipboard.writeText(suggestedName)
                .then(() => message.success('章节名已复制到剪贴板'))
                .catch(() => message.error('复制失败'))
            }}
          >
            复制章节名
          </Button>,
          <Button key="close" onClick={() => setIsNameModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        <div className={styles.nameContent}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              type="primary"
              onClick={async () => {
                if (!selectedChapter) return
                try {
                  setIsNaming(true)
                  setSuggestedName('')
                  const text = await chapterApi.nameChapterBlocking(selectedChapter.id || 0)
                  setSuggestedName(text)
                } catch (error) {
                  console.error('nameChapter error -> ', error)
                  message.error('命名失败')
                } finally {
                  setIsNaming(false)
                }
              }}
              loading={isNaming}
              disabled={!content}
            >
              使用LLM命名
            </Button>
            <div className={styles.suggestedName}>
              {isNaming ? '命名中...' : (suggestedName || '点击上方按钮开始命名...')}
            </div>
          </Space>
        </div>
      </Modal>
    </div>
  )
}

export default ChapterGeneratePanel 