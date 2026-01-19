import copyToClip from "@/src/utils/common/copy"
import { message, Modal, Button, Tag, Card, Typography } from "antd"
// import { useState } from "react"
import { CheckOutlined, CopyOutlined } from "@ant-design/icons"

// 注意事项快速复制 Modal
interface AttentionRefModalProps {
    isVisible: boolean
    onClose: () => void
    content: string,
    onApply: (str: string) => void
}

export default function AttentionRefModal({ isVisible, onClose, onApply }: AttentionRefModalProps) {
    const hasApply = typeof onApply === 'function';
  
    const refList = [
      {
        title: 'Gemini3优化',
        color: 'green',
        content: '- 使用细腻流畅的行文风格，但不要堆砌形容词\n' +
                 '- 使用奔放的情节的表达，可引入俚语和OOC，丰富情感\n' +
                 '- 输出尽可能长的内容，约4000字左右\n' +
                 '- 避免刻板描写、减少负面形容词\n' +
                 '- 要符合中文的用词习惯和表达习惯\n' +
                 '- 注意与前文的衔接\n' +
                 '- 避免塑造什么都不知道的人物，或愚蠢的、傻帽式的人物'
      },
      {
        title: '抗Gemini默认文风',
        color: 'red',
        content: '- 对人物对话、人物心理活动、人物动作细节、场景塑造进行综合调优\n' +
                 '- 使用优秀的，具有浪漫想象力情节的表达\n' +
                 '- 输出尽可能长的内容，\n' +
                 '- 不要堆砌形容词，使用幽默的描写\n' +
                 '- 避免刻板描写、避免出现行军文风、军旅文风、命令文风、避免大幅度“讽刺”\n' +
                 '- 避免出现“不是……而是……”等对比句式'
      },
      {
        title: '避免重复介绍',
        color: 'yellow',
        content: '- 人物均已出现过，避免重复介绍。'
      },
      {
        title: '基础',
        color: 'blue',
        content: '* 扩写时，请仔细分析用户提供的片段，理解其含义和作用。\n' +
                 '* 扩写时，请充分利用前情提要和相关设定，为故事增加细节和深度。\n' +
                 '* 扩写时，请注意人物的心理活动和行为动机，使人物更加立体和真实。\n' +
                 '* 扩写时，请注意情节的节奏和悬念，使故事更加引人入胜。'
      },
      {
        title: '轻松',
        color: 'green',
        content: '- 对人物对话、人物心理活动、人物动作细节、场景塑造进行综合调优\n' +
                 '- 使用流畅、地道的表达，适当的时机使用俚语化的表达，加强气氛\n' +
                 '- 加上日式吐槽优化语言张力；'
      }
    ]
  
    
  
    async function handleCopy(content: string) {
      try {
        copyToClip(content)
        message.success('复制成功')
      } catch (error) {
        message.error('复制失败')
      }
    }

    function handleApply(content: string) {
      if (typeof onApply === 'function') {
        onApply(content)
        onClose()
      }
    }
  
  
    function RefItem(props: { title: string, color: string, content: string }) {
      const title = <div className={'f-flex-two-side'}>
        <div>
          <Tag color={props.color}>{props.title}</Tag>
        </div>
        <div>
          <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => handleCopy(props.content)}>复制</Button>
          {hasApply && <Button type="link" size="small" icon={<CheckOutlined />} onClick={() => handleApply(props.content)}>应用</Button>}
        </div>
      </div>
  
      return (
        <Card size="small" title={title} style={{ marginTop: '10px' }}>
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{props.content}</Typography.Paragraph>
        </Card>
      )
    }
  
    return (
      <Modal
        title="注意事项参考"
        open={isVisible}
        onCancel={onClose}
        width={520}
        footer={[
          <Button key="close" onClick={onClose}>关闭</Button>
        ]}
      >
        {refList.map((item, index) => (
          <RefItem key={index} title={item.title} color={item.color} content={item.content} />
        ))}
      </Modal>
    )
  }