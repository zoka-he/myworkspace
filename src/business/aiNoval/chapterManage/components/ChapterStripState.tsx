import { Card, Typography, Tag, Space, Button } from "antd"
import { useEffect, useState } from "react"

interface ChapterStripReport {
    state: 'pending' | 'processing' | 'completed'
    chapterNumber: number
    chapterTitle: string
    version: number
    id?: number
    originalContent?: string
    strippedContent?: string
}

// 章节缩写状态组件Props
interface ChapterStripStateProps extends ChapterStripReport {
    onViewOriginal?: (content: string, chapterInfo: ChapterStripReport) => void
    onViewStripped?: (content: string, chapterInfo: ChapterStripReport) => void
}

// 章节缩写状态组件
function ChapterStripState(props: ChapterStripStateProps) {
    const { state, chapterNumber, chapterTitle, version, originalContent, strippedContent } = props
  
    const [processStartTime, setProcessStartTime] = useState<number>(0)
    const [processEndTime, setProcessEndTime] = useState<number>(0)
  
    useEffect(() => {
      if (state === 'processing') {
        setProcessStartTime(new Date().getTime())
        setProcessEndTime(0)
      }
    }, [state])
  
    useEffect(() => {
      if (state === 'completed') {
        setProcessEndTime(new Date().getTime())
      }
    }, [state])
    
    
  
    const getStatusColor = () => {
      switch (state) {
        case 'pending':
          return 'default'
        case 'processing':
          return 'processing'
        case 'completed':
          return 'success'
        default:
          return 'default'
      }
    }
  
    const getStatusText = () => {
      switch (state) {
        case 'pending':
          return '等待中'
        case 'processing':
          return '执行中'
        case 'completed':
          return '已完成'
        default:
          return '未知状态'
      }
    }
  
    let elapsedTimeString = '0.0s';
    if (processEndTime > 0 && processStartTime > 0) {
        elapsedTimeString = `${((processEndTime - processStartTime) / 1000).toFixed(2)}s`;
    }
  
    return (
      <Card size="small" style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Typography.Text strong>
              {chapterNumber} {chapterTitle} (v{version})
            </Typography.Text>
            <Tag color={getStatusColor()} style={{ marginLeft: 8 }}>
              {getStatusText()}
            </Tag>
            {elapsedTimeString && (
              <Tag color="#ccc" style={{ marginLeft: 8 }}>
                {elapsedTimeString}
              </Tag>
            )}
          </div>
          <Space>
            <Button 
              size="small" 
              disabled={!originalContent}
              onClick={() => props.onViewOriginal?.(originalContent!, {
                chapterNumber,
                chapterTitle,
                version,
                state
              })}
            >
              查看原文
            </Button>
            <Button 
              size="small" 
              disabled={!strippedContent}
              onClick={() => props.onViewStripped?.(strippedContent!, {
                chapterNumber,
                chapterTitle,
                version,
                state
              })}
            >
              查看缩写
            </Button>
          </Space>
        </div>
      </Card>
    )
  }

  export default ChapterStripState
  export { type ChapterStripReport, type ChapterStripStateProps }