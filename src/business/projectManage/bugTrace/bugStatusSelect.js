import { useState } from 'react';
import { Select } from 'antd';

export default function(props) {

  const statusNames = ['未复现', '已复现', '修复中', '待复验', '已关闭'];

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
