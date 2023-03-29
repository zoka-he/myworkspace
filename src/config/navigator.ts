import React from 'react';

interface INavMenu {
  label?: string,
  component?: React.Component | React.FunctionComponent
  children?: Array<INavMenu>,
  url?: string,
  query?: Object,
  key?: string
}

const navObj: INavMenu[] = [
  {
    label: '任务管理',
    key: '/taskManage',
    children: [
      {
        label: '贴纸板',
        key: '/dashboard'
      },
      {
        label: '任务编辑',
        key: '/taskManage'
      },
      {
        label: '问题跟踪',
        key: '/bugTrace'
      },
      {
        label: '沟通日志',
        key: '/catfightLog'
      },
      {
        label: '周报',
        key: '/weeklyReport'
      },
      {
        label: '上线管理',
        key: '/uplineCheck'
      }
    ]
  },
  {
    label: '信息管理',
    key: '/infos',
    children: [
      {
        label: '联系人',
        key: '/employeeManage'
      },
      {
        label: '账号密码管理',
        key: '/accounts'
      }
    ]
  },
  {
    label: '路书',
    key: '/roadBook',
    children: [
      {
        label: '计划板',
        key: '/planBoard'
      },
      {
        label: '编辑器',
        key: '/editor'
      },
      {
        label: '天气板',
        key: '/weatherBoard'
      }
    ]
  },

];

export default navObj;
export type { INavMenu }
