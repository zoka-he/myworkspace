import React, { useState, useEffect, useCallback } from 'react'
import { IWorldViewDataWithExtra, ITimelineDef } from '@/src/types/IAiNoval'
import { TimelineDateFormatter, ITimelineDateData } from '@/src/business/aiNoval/common/novelDateUtils'
import { Form, InputNumber, Select, Space, Typography } from 'antd'
import debounce from 'lodash/debounce'

const { Option } = Select

interface NovelTimeEditProps {
  value?: number // seconds
  onChange?: (seconds: number) => void
  timelineDef: ITimelineDef
  disabled?: boolean
}

function NovelTimeEdit({ value, onChange, timelineDef, disabled }: NovelTimeEditProps) {
  const [formatter] = useState(() => new TimelineDateFormatter(timelineDef))
  const [dateData, setDateData] = useState<ITimelineDateData>({
    isBC: false,
    year: 1,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0
  })

  // Convert seconds to date components
  useEffect(() => {
    if (value !== undefined) {
      setDateData(formatter.secondsToDateData(value))
    }
  }, [value, formatter])

  // Create a debounced update function
  const debouncedUpdate = useCallback(
    debounce((newDateData: ITimelineDateData) => {
      const seconds = formatter.dateDataToSeconds(newDateData)
      onChange?.(seconds)
    }, 300),
    [formatter, onChange]
  )

  // Update handlers with debounced updates
  const handleEraChange = (newEra: 'BC' | 'AD') => {
    const newDateData = { ...dateData, isBC: newEra === 'BC' }
    setDateData(newDateData)
    debouncedUpdate(newDateData)
  }

  const handleYearChange = (newYear: number | null) => {
    if (newYear !== null) {
      const newDateData = { ...dateData, year: newYear }
      setDateData(newDateData)
      debouncedUpdate(newDateData)
    }
  }

  const handleMonthChange = (newMonth: number | null) => {
    if (newMonth !== null) {
      const newDateData = { ...dateData, month: newMonth }
      setDateData(newDateData)
      debouncedUpdate(newDateData)
    }
  }

  const handleDayChange = (newDay: number | null) => {
    if (newDay !== null) {
      const newDateData = { ...dateData, day: newDay }
      setDateData(newDateData)
      debouncedUpdate(newDateData)
    }
  }

  const handleHourChange = (newHour: number | null) => {
    if (newHour !== null) {
      const newDateData = { ...dateData, hour: newHour }
      setDateData(newDateData)
      debouncedUpdate(newDateData)
    }
  }

  const handleMinuteChange = (newMinute: number | null) => {
    if (newMinute !== null) {
      const newDateData = { ...dateData, minute: newMinute }
      setDateData(newDateData)
      debouncedUpdate(newDateData)
    }
  }

  const handleSecondChange = (newSecond: number | null) => {
    if (newSecond !== null) {
      const newDateData = { ...dateData, second: newSecond }
      setDateData(newDateData)
      debouncedUpdate(newDateData)
    }
  }

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedUpdate.cancel()
    }
  }, [debouncedUpdate])

  return (
    <Space direction="vertical" size="small">
      <Space wrap>
        <Select
          value={dateData.isBC ? 'BC' : 'AD'}
          onChange={handleEraChange}
          disabled={disabled}
          style={{ width: 80 }}
        >
          <Option value="BC">公元前</Option>
          <Option value="AD">公元</Option>
        </Select>
      </Space>

      <Space wrap>
        <InputNumber
          min={1}
          value={dateData.year}
          onChange={handleYearChange}
          disabled={disabled}
          style={{ width: 80 }}
          controls={false}
        />
        <span>-</span>
        <InputNumber
          min={1}
          max={timelineDef.year_length_in_months}
          value={dateData.month}
          onChange={handleMonthChange}
          disabled={disabled}
          style={{ width: 60 }}
          controls={false}
        />
        <span>-</span>
        <InputNumber
          min={1}
          max={timelineDef.month_length_in_days}
          value={dateData.day}
          onChange={handleDayChange}
          disabled={disabled}
          style={{ width: 60 }}
          controls={false}
        />
        <span> </span>
        <InputNumber
          min={0}
          max={timelineDef.day_length_in_hours - 1}
          value={dateData.hour}
          onChange={handleHourChange}
          disabled={disabled}
          style={{ width: 60 }}
          controls={false}
        />
        <span>:</span>
        <InputNumber
          min={0}
          max={59}
          value={dateData.minute}
          onChange={handleMinuteChange}
          disabled={disabled}
          style={{ width: 60 }}
          controls={false}
        />
        <span>:</span>
        <InputNumber
          min={0}
          max={59}
          value={dateData.second}
          onChange={handleSecondChange}
          disabled={disabled}
          style={{ width: 60 }}
          controls={false}
        />
      </Space>
    </Space>
  )
}

// Add Form.Item support
NovelTimeEdit.valuePropName = 'value'
NovelTimeEdit.getValueProps = (value: number) => ({ value })

// Add type guard to ensure value is always a number
NovelTimeEdit.normalize = (value: any): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  return 0
}

export default NovelTimeEdit

