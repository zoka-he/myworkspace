import { Modal, Form, InputNumber, Input, Space, Button, Select, Row, Col } from 'antd'
import { useState, forwardRef, useImperativeHandle } from 'react'
import { ITimelineDef } from '@/src/types/IAiNoval'

interface TimelineDefEditProps {
  open: boolean
  onCancel: () => void
  onSave: (values: ITimelineDef, mode: string) => void
}

interface TimelineDefFormValues extends Omit<ITimelineDef, 'start_seconds'> {
  year: number
  is_bc: boolean
  month: number
  day: number
}

export const TimelineDefEdit = forwardRef<{ openAndEdit: (values: ITimelineDef, mode: string) => void }, TimelineDefEditProps>(
  ({ open, onCancel, onSave }, ref) => {
    const [form] = Form.useForm<TimelineDefFormValues>()
    const [loading, setLoading] = useState(false)
    const [backupValues, setBackupValues] = useState<ITimelineDef | undefined>()
    const [mode, setMode] = useState<string>('create')

    useImperativeHandle(ref, () => ({
      openAndEdit: (values: ITimelineDef, mode: string) => {
        setBackupValues(values)
        setMode(mode)
        const formValues = getInitialValues(values)
        if (formValues) {
          form.setFieldsValue(formValues)
        }
      }
    }))

    const handleSubmit = async () => {
      try {
        setLoading(true)
        const values = await form.validateFields()
        // 使用自定义时间单位计算秒数
        const { 
          year, 
          is_bc, 
          month, 
          day, 
          hour_length_in_seconds = 3600, // 默认1小时=3600秒
          day_length_in_hours = 24,      // 默认1天=24小时
          month_length_in_days = 30,     // 默认1月=30天
          year_length_in_months = 12,    // 默认1年=12月
          ...rest 
        } = values
        
        // 计算总秒数
        const secondsPerHour = hour_length_in_seconds
        const secondsPerDay = secondsPerHour * day_length_in_hours
        const secondsPerMonth = secondsPerDay * month_length_in_days
        const secondsPerYear = secondsPerMonth * year_length_in_months
        
        const yearSeconds = year * secondsPerYear
        const monthSeconds = (month - 1) * secondsPerMonth
        const daySeconds = (day - 1) * secondsPerDay
        
        const timelineValues: ITimelineDef = {
          ...backupValues, // 保留所有原始字段，包括id和worldview_id
          ...rest, // 用表单值覆盖
          hour_length_in_seconds,
          day_length_in_hours,
          month_length_in_days,
          year_length_in_months,
          start_seconds: is_bc ? -(yearSeconds + monthSeconds + daySeconds + 1) : (yearSeconds + monthSeconds + daySeconds)
        }
        onSave(timelineValues, mode)
      } catch (error) {
        console.error('Form validation failed:', error)
      } finally {
        setLoading(false)
      }
    }

    // 将秒数转换为年月日
    const getInitialValues = (values: ITimelineDef) => {
      const { start_seconds, hour_length_in_seconds = 3600, day_length_in_hours = 24, month_length_in_days = 30, year_length_in_months = 12, ...rest } = values
      const absSeconds = Math.abs(start_seconds)

      // 计算自定义时间单位
      const secondsPerHour = hour_length_in_seconds
      const secondsPerDay = secondsPerHour * day_length_in_hours
      const secondsPerMonth = secondsPerDay * month_length_in_days
      const secondsPerYear = secondsPerMonth * year_length_in_months

      // 计算年月日
      const year = Math.floor(absSeconds / secondsPerYear)
      const remainingSeconds = absSeconds % secondsPerYear
      const month = Math.floor(remainingSeconds / secondsPerMonth) + 1
      const remainingSecondsAfterMonth = remainingSeconds % secondsPerMonth
      const day = Math.floor(remainingSecondsAfterMonth / secondsPerDay) + 1

      return {
        ...rest,
        year,
        is_bc: start_seconds < 0,
        month,
        day,
        hour_length_in_seconds,
        day_length_in_hours,
        month_length_in_days,
        year_length_in_months
      }
    }

    // 当modal关闭时清除备份值
    const handleCancel = () => {
      setBackupValues(undefined)
      onCancel()
    }

    return (
      <Modal
        title="时间线定义编辑"
        open={open}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            取消
          </Button>,
          <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
            保存
          </Button>,
        ]}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            label="时间线公元点"
            name="epoch"
            rules={[{ required: true, message: '请输入时间线公元点' }]}
          >
            <Input placeholder="例如：创世纪元年" />
          </Form.Item>

          <Form.Item
            label="时间线起点"
            required
          >
            <Row gutter={8}>
              <Col span={6}>
                <Form.Item
                  name="year"
                  rules={[{ required: true, message: '请输入年份' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={1}
                    placeholder="年份"
                  />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item
                  name="is_bc"
                  initialValue={false}
                >
                  <Select
                    options={[
                      { label: '公元', value: false },
                      { label: '公元前', value: true },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="month"
                  rules={[{ required: true, message: '请输入月份' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={1}
                    max={12}
                    placeholder="月份"
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="day"
                  rules={[{ required: true, message: '请输入日期' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={1}
                    max={31}
                    placeholder="日期"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>

          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item
              label="标准时长度（秒）"
              name="hour_length_in_seconds"
              rules={[{ required: true, message: '请输入标准时长度' }]}
            >
              <InputNumber
                min={1}
                style={{ width: '100%' }}
                placeholder="请输入标准时长度"
              />
            </Form.Item>

            <Form.Item
              label="标准日长度（时）"
              name="day_length_in_hours"
              rules={[{ required: true, message: '请输入标准日长度' }]}
            >
              <InputNumber
                min={1}
                style={{ width: '100%' }}
                placeholder="请输入标准日长度"
              />
            </Form.Item>

            <Form.Item
              label="标准月长度（天）"
              name="month_length_in_days"
              rules={[{ required: true, message: '请输入标准月长度' }]}
            >
              <InputNumber
                min={1}
                style={{ width: '100%' }}
                placeholder="请输入标准月长度"
              />
            </Form.Item>

            <Form.Item
              label="标准年长度（月）"
              name="year_length_in_months"
              rules={[{ required: true, message: '请输入标准年长度' }]}
            >
              <InputNumber
                min={1}
                style={{ width: '100%' }}
                placeholder="请输入标准年长度"
              />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    )
  }
)
