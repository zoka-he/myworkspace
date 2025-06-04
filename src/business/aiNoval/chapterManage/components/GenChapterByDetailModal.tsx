import { useEffect, useState } from 'react'
import { Modal, Steps, Button, Card, Input, Space, message, Row, Col, Divider, Alert, Typography } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import type { ModalProps } from 'antd'
import type { IChapter } from '@/src/types/IAiNoval'
import { getChapterById, genParagraphs, combineParagraphs, getWriteWithChatUrl } from '../apiCalls'
import _ from 'lodash'

const { TextArea } = Input

interface GenChapterByDetailModalProps extends Omit<ModalProps, 'onOk'> {
  onOk?: (content: string) => void
  selectedChapter: IChapter | null
}

// 编辑器组件
function JsonEditor({ 
  title, 
  value, 
  onChange, 
  onValidate 
}: { 
  title: string
  value: string
  onChange: (value: string) => void
  onValidate: (value: string) => void
}) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    message.success('复制成功')
  }

  const removeJsonFlag = () => {
    onChange(value.replace('```json', '').replace('```', ''))
  }

  const titleJsx = (  
    <div className="f-flex-two-side">
      <Space>
        <span>{title}</span>
      </Space>
      <Space>
        <Button size="small" onClick={removeJsonFlag}>去除JSON标识</Button>
        <Button size="small" onClick={() => onValidate(value)}>校验JSON</Button>
        <Button size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(value)}>
          复制
        </Button>
      </Space>
    </div>
  )

  return (
    <Card size="small" title={titleJsx}>
      <TextArea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoSize={{ minRows: 20 }}
      />
    </Card>
  )
}

// 正文内容编辑器
function ContentEditor({
  value,
  onChange
}: {
  value: string
  onChange: (value: string) => void
}) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    message.success('复制成功')
  }

  const titleJsx = (  
    <div className="f-flex-two-side">
      <Space>
        <span>正文内容</span>
      </Space>
      <Space>
        <Button size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(value)}>
          复制
        </Button>
      </Space>
    </div>
  ) 

  return (
    <Card size="small" title={titleJsx}>
      <TextArea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoSize={{ minRows: 20 }}
      />
    </Card>
  )
}

function RefinementEditor({
  paragraph,
  onParagraphChange,
  prompt,
  onPromptChange,
  worldviewId
}: {
  paragraph: string
  onParagraphChange: (value: string) => void
  prompt: string
  onPromptChange: (value: string) => void
  worldviewId?: number | null
}) {
  const [writeWithChatUrl, setWriteWithChatUrl] = useState('')
  useEffect(() => {
    if (worldviewId) {
      getWriteWithChatUrl(worldviewId).then(url => {
        setWriteWithChatUrl(url)
      })
    } else {
      setWriteWithChatUrl('')
    }
  }, [worldviewId])
  
  function fullPrompt() {
    return `请根据以下提示词优化段落：\n\n${prompt}\n\n待优化段落：\n${paragraph}`
  }
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullPrompt())
    message.success('复制成功')
  }

  const openRefinementDialog = () => {
    window.open(writeWithChatUrl, '_blank')
  }

  return (
    <Card size="small" title="精修提示词">
      <Row>
        <div>待修段落：</div>
        <Input.TextArea
          placeholder="待修段落"
          value={paragraph}
          onChange={(e) => onParagraphChange(e.target.value)}
          autoSize={{ minRows: 4 }}
        />

        <div style={{ marginTop: '10px' }}>修正提示词：</div>
        <Input.TextArea
          placeholder="修正提示词"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          autoSize={{ minRows: 4 }}
        />
      </Row>

      <div style={{ marginTop: '10px' }}>  
        <Card size="small" title={
          <div className="f-flex-two-side">
            <Space>
              <span>精修提示词</span>
              <Button size="small" icon={<CopyOutlined />} onClick={copyToClipboard}>
                复制
              </Button>
            </Space>
            <Space>
              <Button size="small" type="primary" onClick={openRefinementDialog} disabled={!writeWithChatUrl}>打开精修对话</Button>
            </Space>
          </div>
        }>
          <Typography.Text style={{ whiteSpace: 'pre-wrap' }}>
            {fullPrompt()}
          </Typography.Text>
        </Card>
        
      </div>
    </Card>
  )
}

// 主窗体
function GenChapterByDetailModal({ onOk, ...props }: GenChapterByDetailModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [outlineJson, setOutlineJson] = useState('')
  const [segmentsJson, setSegmentsJson] = useState('')
  const [content, setContent] = useState('')
  const [refineParagraph, setRefineParagraph] = useState('')
  const [refinePrompt, setRefinePrompt] = useState('')
  const [worldviewId, setWorldviewId] = useState<number | null>(null)

  const [isWorking, setIsWorking] = useState(false)

  useEffect(() => {
    if (props.open) {
      setCurrentStep(0)
      loadChapterData();
    }
  }, [props.open])

  // 加载章节数据
  const loadChapterData = async () => {
    const res = await getChapterById(props.selectedChapter?.id!)
    setOutlineJson(res.skeleton_prompt || '')
    setSegmentsJson('') // 分段不存储
    setContent(res.content || '')
    setWorldviewId(res.worldview_id || null)
    setRefineParagraph('')
    setRefinePrompt('')  
  }

  const steps = [
    { title: '生成分段', description: 'Step 1' },
    { title: '融合分段', description: 'Step 2' },
    { title: '局部优化', description: 'Step 3' },
  ]

  const handleJsonValidation = (json: string) => {
    try {
      JSON.parse(json)
      message.success('JSON格式正确')
    } catch (e) {
      message.error('JSON格式错误')
    }
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  // 细纲JSON编辑器
  const detailJsonEditor = (
    <JsonEditor
      title="细纲JSON"
      value={outlineJson}
      onChange={setOutlineJson}
      onValidate={handleJsonValidation}
    />
  )

  // 分段JSON编辑器
  const segmentsJsonEditor = (
    <JsonEditor
      title="分段JSON"
      value={segmentsJson}
      onChange={setSegmentsJson}
      onValidate={handleJsonValidation}
    />
  )

  // 正文内容编辑器
  const contentEditor = (
    <ContentEditor
      value={content}
      onChange={setContent}
    />
  )

  // 精修提示词编辑器
  const refinementEditor = (
    <RefinementEditor
      paragraph={refineParagraph}
      onParagraphChange={setRefineParagraph}
      prompt={refinePrompt}
      onPromptChange={setRefinePrompt}
      worldviewId={worldviewId}
    />
  )

  // 生成分段
  const handleGenParagraphs = async () => {
    if (!worldviewId) {
      message.error('章节缺少世界观，请检查！')
      return
    }

    let skeleton = outlineJson;

    // 去除JSON标识
    if (skeleton.startsWith('```json')) {
      skeleton = skeleton.replace('```json', '')
    }

    if (skeleton.endsWith('```')) {
      skeleton = skeleton.replace('```', '')
    }

    try {
      JSON.parse(skeleton)
    } catch (e) {
      message.error('细纲JSON格式错误')
      return
    }

    try {
      setIsWorking(true)
      message.info('生成中...')

      const res = await genParagraphs(
        worldviewId!, 
        skeleton,
      )

      setSegmentsJson(res)
      message.success('生成成功')
    } catch (e) {
      message.error('生成失败，请检查！')
    } finally {
      setIsWorking(false)
    }
  }

  const handleCombineParagraphs = async () => {
    let paragraphs = segmentsJson;
    if (paragraphs.startsWith('```json')) {
      paragraphs = paragraphs.replace('```json', '')
    }

    if (paragraphs.endsWith('```')) {
      paragraphs = paragraphs.replace('```', '')
    }

    try {
      setIsWorking(true)
      message.info('融合中...')

      const res = await combineParagraphs(paragraphs)
      setContent(res)
      message.success('融合成功')
    } catch (e) {
      message.error('融合失败，请检查！')
    } finally {
      setIsWorking(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Row gutter={16}>
            <Col span={12}>
              {detailJsonEditor}
            </Col>
            <Col span={12}>
              {segmentsJsonEditor}
            </Col>
          </Row>
        )
      case 1:
        return (
          <Row gutter={16}>
            <Col span={12}>
              {segmentsJsonEditor}
            </Col>
            <Col span={12}>
              {contentEditor}
            </Col>
          </Row>
        )
      case 2:
        return (
          <Row gutter={16}>
            <Col span={12}>
              {contentEditor}
            </Col>
            <Col span={12}>
              {refinementEditor}
            </Col>
          </Row>
        )
      default:
        return null
    }
  }

  return (
    <Modal
      title="按细纲生成章节正文"
      width={'80vw'}
      {...props}
      footer={<div className="f-flex-two-side">
        <Button onClick={handlePrev} disabled={currentStep === 0}>
          上一步
        </Button>
        <Button type="primary" onClick={handleNext} disabled={currentStep === steps.length - 1}>
          下一步
        </Button>
      </div>}
    >
      <div className="space-y-4">
        <div className="f-flex-two-side">
          <Button onClick={handlePrev} disabled={currentStep === 0}>
            上一步
          </Button>
          <Steps
            style={{ margin: '0 10px' }}
            current={currentStep}
            items={steps}
            className="mb-8"
          />
          <Button type="primary" onClick={handleNext} disabled={currentStep === steps.length - 1}>
            下一步
          </Button>
        </div>

        <Divider />

        <div style={{ textAlign: 'center' }}>
          <Space align="center">
            <Button disabled={currentStep !== 0} onClick={handleGenParagraphs}>生成分段</Button>
            <Button disabled={currentStep !== 1} onClick={handleCombineParagraphs}>融合分段</Button>
            <Button disabled={currentStep !== 2}>复制选区</Button>
          </Space>
        </div>

        <div style={{ textAlign: 'center', margin: '10px auto 0', width: '20%' }}>
          {
            isWorking ? (
              <Alert message="生成中..." type="warning" />
            ) : (
              <Alert message="空闲" type="success" />
            )
          }
        </div>

        <Divider />

        {renderStepContent()}

        
      </div>
    </Modal>
  )
}

export default GenChapterByDetailModal
