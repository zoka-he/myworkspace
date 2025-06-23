import React, { useEffect, useState } from 'react'
import { Modal, Card, Input, Space, Button, message, Row, Col, Divider, Alert, Typography } from 'antd'
import { CopyOutlined, SaveOutlined, RobotOutlined, UserOutlined, SettingOutlined } from '@ant-design/icons'
import fetch from '@/src/fetch'

const { TextArea } = Input
const { Text, Title } = Typography

interface GenRolePanelProps {
  open?: boolean
  onCancel?: () => void
  onOk?: (chapterPrompt: string, roleSuggestions: string) => void
  worldviewId?: number | null
  title?: string
  width?: number | string,
  rootPrompt?: string | (() => string)
}

// 章节提示词范式提示组件
function ChapterPromptTemplate() {
  const templateText = `【章节背景设定】
   - 时间：具体的时间点或时间段
   - 地点：具体的场景或环境
   - 氛围：章节的整体情绪和氛围

【主要事件描述】
   - 核心冲突：章节的主要矛盾或冲突
   - 事件发展：事件的具体过程和转折点
   - 结果影响：事件对后续发展的影响

【角色参与情况】
   - 主要角色：章节中的核心人物
   - 角色动机：每个角色的行动原因
   - 角色互动：角色之间的关系和互动

【世界观元素】 # 世界正在发生什么？（此句删除）
   - 设定细节：相关的世界观设定
   - 规则约束：影响情节的规则或限制
   - 背景信息：相关的历史或背景故事`

  const copyTemplate = () => {
    navigator.clipboard.writeText(templateText)
    message.success('范式已复制到剪贴板')
  }

  return (
    <Card 
      size="small" 
      title={
        <Space>
          <Text strong>章节提示词范式</Text>
          <Button size="small" icon={<CopyOutlined />} onClick={copyTemplate}>
            复制范式
          </Button>
        </Space>
      }
    >
      <Text style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.6' }}>
        {templateText}
      </Text>
    </Card>
  )
}

// 生成结果展示组件
function GenerationResult({ title, result, onCopy, onOpenRoleConfig }: {
  title: string 
  result: string
  onCopy: () => void
  onOpenRoleConfig?: () => void
}) {
  if (!result) return null

  return (
    <Card 
      size="small" 
      title={
        <div className="f-flex-two-side">
          <Space>
            <Text strong>{title}</Text>
          </Space>
          <Space>
            <Button size="small" icon={<CopyOutlined />} onClick={onCopy}>
              复制
            </Button>
            {onOpenRoleConfig && (
              <Button size="small" type="primary" icon={<UserOutlined />} onClick={onOpenRoleConfig}>
                打开人物配置页
              </Button>
            )}
          </Space>
        </div>
      }
    >
      <TextArea
        value={result}
        readOnly
        autoSize={{ minRows: 8 }}
        style={{ fontFamily: 'monospace', fontSize: '13px' }}
      />
    </Card>
  )
}

/**
 * 生成角色人设面板
 * @param onOk 
 * @param worldviewId 
 * @param props 
 * @returns 
 */
function GenRolePanel({ onOk, worldviewId, ...props }: GenRolePanelProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationResult, setGenerationResult] = useState<any>({})
  const [savedChapterPrompt, setSavedChapterPrompt] = useState('')
  
  // 表单状态
  const [chapterPrompt, setChapterPrompt] = useState('')
  const [namingStyle, setNamingStyle] = useState('传统中文名')
  const [extraRequirements, setExtraRequirements] = useState('')

  useEffect(() => {
    console.log('props', props)
    console.log('props.rootPrompt', props.rootPrompt)
    if (props.open) {
        if (typeof props.rootPrompt === 'function') {
            console.log('props.rootPrompt is a function')
            console.log('props.rootPrompt() ->', props.rootPrompt())
            setChapterPrompt(props.rootPrompt())

        } else {
            setChapterPrompt(props.rootPrompt || '')
        }
    } else {
        setChapterPrompt('')
    }
  }, [props.open])

  // 生成角色建议
  const handleGenerateRoleSuggestions = async () => {
    try {
      if (!chapterPrompt?.trim()) {
        message.error('请输入章节提示词')
        return
      }

      if (!namingStyle?.trim()) {
        message.error('请选择命名风格')
        return
      }

      if (!extraRequirements?.trim()) {
        message.error('请输入额外的角色要求或特殊设定，如果没有，请输入“无”')
        return
      }

      if (!worldviewId) {
        message.error('缺少世界观ID，请检查程序')
        return
      }

      setIsGenerating(true)
      message.info('正在生成角色建议...')

      const response = await fetch.post(
        '/api/web/aiNoval/role/genRole', 
            {
                chapter_prompt: chapterPrompt,
                name_style: namingStyle,
                extra_prompt: extraRequirements,
                worldview_id: worldviewId
            },
            {
                params: {
                    worldviewId
                },
                timeout: 1000 * 60 * 10
            }
        )

      const result = response?.data?.outputs || {};

      setGenerationResult(result)
      message.success('角色建议生成完成')
    } catch (error) {
      message.error('生成失败，请检查输入内容')
    } finally {
      setIsGenerating(false)
    }
  }

  // 保存章节提示词
  const handleSaveChapterPrompt = async () => {
    try {
      if (!chapterPrompt?.trim()) {
        message.error('请输入章节提示词')
        return
      }

      setSavedChapterPrompt(chapterPrompt)
      message.success('章节提示词已保存')
    } catch (error) {
      message.error('保存失败，请检查输入内容')
    }
  }

  // 复制生成结果
  const handleCopyResult = () => {
    if (!generationResult) {
      message.warning('没有可复制的内容')
      return
    }
    navigator.clipboard.writeText(generationResult)
    message.success('角色建议已复制到剪贴板')
  }

  // 打开人物配置页
  const handleOpenRoleConfig = () => {
    // TODO: 实现跳转到人物配置页面的逻辑
    message.info('即将跳转到人物配置页面')

    window.open('/novel/roleManage')
  }


  return (
    <Modal
      title={
        <Space>
          <RobotOutlined />
          <span>生成角色人设建议</span>
        </Space>
      }
      width="80vw"
      {...props}
      footer={null}
    >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* 第一行：提示词输入 */}
        <Row gutter={16}>
            <Alert
              style={{ width: '100%' }}
              message="使用说明"
              description="1. 首先输入章节提示词，可以参考左侧的范式模板；2. 选择或输入命名风格；3. 如有特殊要求，请在额外要求中说明；4. 点击生成按钮获取AI建议的角色清单；5. 可以保存章节提示词供后续使用"
              type="info"
              showIcon
            />
        </Row>

        {/* 第二行：提示词输入 */}
        <Row gutter={16}>
            <Col span={12}>
                <ChapterPromptTemplate />
            </Col>
            <Col span={12}>
                <Card size="small" title="章节提示词">
                    <TextArea
                        value={chapterPrompt}
                        onChange={(e) => setChapterPrompt(e.target.value)}
                        placeholder="请根据上方范式输入您的章节提示词..."
                        autoSize={{ minRows: 18 }}
                        showCount
                        maxLength={2000}
                    />
                </Card>
            </Col>
        </Row>
      <Row gutter={16}>
        {/* 左侧：输入区域 */}
        <Col span={12}>
            {/* 命名风格 */}
            <Card size="small" title="命名风格">
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Input
                    value={namingStyle}
                    onChange={(e) => setNamingStyle(e.target.value)}
                    placeholder="例如：传统中文名、现代中文名、英文名、日式名等"
                    showCount
                    maxLength={500}
                />
                <Space wrap>
                    <Button onClick={() => setNamingStyle('西罗马风格')}>西罗马风格</Button>
                    <Button onClick={() => setNamingStyle('东罗马风格')}>东罗马风格</Button>
                    <Button onClick={() => setNamingStyle('唐朝风格')}>唐朝风格</Button>
                    <Button onClick={() => setNamingStyle('二次元风格')}>二次元风格</Button>
                    <Button onClick={() => setNamingStyle('星战风格')}>星战风格</Button>
                    <Button onClick={() => setNamingStyle('中世纪风格')}>中世纪风格</Button>
                    <Button onClick={() => setNamingStyle('现代风格')}>现代风格</Button>
                    <Button onClick={() => setNamingStyle('未来风格')}>未来风格</Button>
                </Space>
              </Space>
            </Card>
        </Col>

        <Col span={12}>
            {/* 额外要求 */}
            <Card size="small" title="额外要求">
              <TextArea
                value={extraRequirements}
                onChange={(e) => setExtraRequirements(e.target.value)}
                placeholder="请输入额外的角色要求或特殊设定..."
                autoSize={{ minRows: 5 }}
                showCount
                maxLength={500}
              />
            </Card>

           
        </Col>

        
        
        </Row>
        <Row gutter={16}>
            <Card size="small" title="操作" style={{width: '100%'}}>
                <Space wrap align="center" style={{width: '100%', justifyContent: 'center'}}>
                    <Button 
                        icon={<SaveOutlined />} 
                        onClick={handleSaveChapterPrompt}
                    >
                        保存章节提示词
                    </Button>
                    <Button 
                        type="primary" 
                        icon={<RobotOutlined />} 
                        loading={isGenerating}
                        onClick={handleGenerateRoleSuggestions}
                    >
                        生成人物建议清单
                    </Button>
                </Space>
            </Card>
        </Row>
        <Divider>输出</Divider>

        {/* 右侧：结果展示区域 */}
        <Col span={24}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {/* 生成结果 */}
            <GenerationResult
              title="关联的地理位置"
              result={generationResult?.related_geo}
              onCopy={handleCopyResult}
            />
            <GenerationResult
              title="关联的阵营"
              result={generationResult?.related_faction}
              onCopy={handleCopyResult}
            />
            
            <GenerationResult
              title="生成的角色建议"
              result={generationResult?.related_roles}
              onCopy={handleCopyResult}
              onOpenRoleConfig={handleOpenRoleConfig}
            />

          </Space>
        </Col>
      </Space>
    </Modal>
  )
}

export default GenRolePanel
