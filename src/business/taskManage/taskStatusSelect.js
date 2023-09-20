import { useState } from 'react';
import { Select } from 'antd';

export default function(props) {

  const statusNames = ['未开始', '执行中', '验证中', '待上线', '已完成', '已关闭'];

  function renderStatusOptions() {
    return statusNames.map((item, index) => {
      return <Select.Option value={index} key={index}>{item}</Select.Option>
    })
  }

  let selectProps = {
    ...props,
    mode: 'multiple',
    allowClear: true,
    style: { minWidth: '200px' },
    maxTagCount: 2
  }

  return (
    <Select {...selectProps}>
      {renderStatusOptions()}
    </Select>
  )

}
