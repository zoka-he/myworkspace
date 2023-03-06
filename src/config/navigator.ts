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
      label: '信息管理',
      menu: [
        {
          label: '人员管理',
          url: '/taskManage/employeeManage'
        },
        {
          label: '账号密码管理',
          url: '/infos/accounts'
        }
      ]
    },
    {
      label: '路书',
      menu: [
        {
          label: '计划板',
          url: '/roadBook/planBoard'
        },
        {
          label: '编辑器',
          url: '/roadBook/editor'
        }
      ]
    },

  ]
}

export default navObj;
export type { INavMenu }
