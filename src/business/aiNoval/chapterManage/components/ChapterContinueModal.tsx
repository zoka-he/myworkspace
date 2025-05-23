import React, { useState } from 'react'
import { Modal, Button, Space, message } from 'antd'
import { CopyOutlined, RobotOutlined } from '@ant-design/icons'
import { IChapter } from '@/src/types/IAiNoval'
import * as chapterApi from '../apiCalls'
import styles from './ChapterGeneratePanel.module.scss'

interface ChapterContinueModalProps {
  selectedChapter: IChapter | null
  isVisible: boolean
  onClose: () => void
  onChapterChange: () => void
}

function ChapterContinueModal({ selectedChapter, isVisible, onClose, onChapterChange }: ChapterContinueModalProps) {
  const [continuedContent, setContinuedContent] = useState('')
  const [isContinuing, setIsContinuing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // 处理AI续写
  const handleContinue = async () => {
    if (!selectedChapter) return

    try {
      setIsContinuing(true)
      setContinuedContent('')

      const text = await chapterApi.continueChapterBlocking(selectedChapter.id || 0)

      setContinuedContent(text)

    } catch (error) {
      console.error('continueChapter error -> ', error)
      message.error('续写失败')
    } finally {
      setIsContinuing(false)
    }
  }

  // 复制续写内容
  const handleCopyContinued = () => {
    navigator.clipboard.writeText(continuedContent)
      .then(() => message.success('续写内容已复制到剪贴板'))
      .catch(() => message.error('复制失败'))
  }

  // 应用续写内容
  const handleApplyContinued = async () => {
    if (!selectedChapter || !continuedContent) return

    try {
      setIsLoading(true)
      await chapterApi.updateChapter({
        id: selectedChapter.id,
        content: selectedChapter.content + '\n\n' + continuedContent
      })
      message.success('续写内容已添加')
      onClose()
      onChapterChange()
    } catch (error) {
      message.error('添加续写内容失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      title="AI续写"
      open={isVisible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="copy" icon={<CopyOutlined />} onClick={handleCopyContinued}>
          复制续写内容
        </Button>,
        <Button 
          key="apply" 
          type="primary" 
          onClick={handleApplyContinued}
          loading={isLoading}
          disabled={!continuedContent}
        >
          应用续写
        </Button>,
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
    >
      <div className={styles.continueContent}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            type="primary"
            icon={<RobotOutlined />}
            onClick={handleContinue}
            loading={isContinuing}
            disabled={!selectedChapter?.content}
          >
            使用AI续写
          </Button>
          <div className={styles.continuedText}>
            {isContinuing ? '续写中...' : (continuedContent || '点击上方按钮开始续写...')}
          </div>
        </Space>
      </div>
    </Modal>
  )
}

export default ChapterContinueModal 