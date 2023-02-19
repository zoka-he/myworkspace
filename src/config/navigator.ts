import React from 'react';

interface INavMenu {
  label?: string,
  component?: React.Component | React.FunctionComponent
  menu?: Array<INavMenu>,
  url?: string,
  query?: Object
}

const navObj: INavMenu = {
  menu: [
    {
      label: '任务管理',
      menu: [
        {
          label: '贴纸板',
          url: '/taskManage/dashboard'
        },
        {
          label: '任务编辑',
          url: '/taskManage/taskManage'
        },
        {
          label: '人员管理',
          url: '/taskManage/employeeManage'
        },
        {
          label: '问题跟踪',
          url: '/taskManage/bugTrace'
        },
        {
          label: '沟通日志',
          url: '/taskManage/catfightLog'
        },
        {
          label: '周报',
          url: '/taskManage/weeklyReport'
        },
        {
          label: '上线管理',
          url: '/taskManage/uplineCheck'
        }
      ]
    },
    {
      label: '系统配置',
      menu: [
        {
          label: '规则详情',
        }
      ]
    },

  ]
}

export default navObj;
export type { INavMenu }
