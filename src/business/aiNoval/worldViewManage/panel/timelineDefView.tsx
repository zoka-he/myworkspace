import { Descriptions, Button, Space } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { ITimelineDef } from '@/src/types/IAiNoval'
import { TimelineDateFormatter } from '@/src/business/aiNoval/common/novelDateUtils'

interface TimelineDefViewProps {
  data?: ITimelineDef
  onEdit: () => void
}

export function TimelineDefView({ data, onEdit }: TimelineDefViewProps) {
  if (!data) {
    return (
      <div className="inline-flex items-center gap-2">
        <span><strong>时间线定义</strong>：<span style={{ color: '#999' }}>未定义</span></span>
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={onEdit}
          size="small"
        >
          编辑
        </Button>
      </div>
    )
  }

  const formatter = new TimelineDateFormatter(data)

  return (
    <div>
      <div className="inline-flex items-center gap-2 mb-4">
        <span><strong>时间线定义</strong></span>
        <Button
          type="text"
          icon={<EditOutlined />}
          onClick={onEdit}
          size="small"
        >
          编辑
        </Button>
      </div>
      <Descriptions column={3} layout="horizontal" bordered size="small">
        <Descriptions.Item label="时间线公元点">
          {formatter.getEpoch()}
        </Descriptions.Item>
        <Descriptions.Item label="时间线起点">
          {formatter.formatSecondsToDate(formatter.getStartSeconds())}
        </Descriptions.Item>
        <Descriptions.Item label="标准时长度">
          {formatter.getHourLengthInSeconds()} 秒
        </Descriptions.Item>
        <Descriptions.Item label="标准日长度">
          {data.day_length_in_hours} 时
        </Descriptions.Item>
        <Descriptions.Item label="标准月长度">
          {data.month_length_in_days} 天
        </Descriptions.Item>
        <Descriptions.Item label="标准年长度">
          {data.year_length_in_months} 月
        </Descriptions.Item>
      </Descriptions>
    </div>
  )
}
