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
        label: '账户管理',
        key: '/user',
        children: [
            {
                key: '/account',
                label: '用户账户'
            },
            {
                key: '/permission',
                label: '权限定义'
            },
            {
                key: '/role',
                label: '角色定义'
            }
        ]
    },
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
                label: '联系人管理',
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
                label: '心愿墙',
                key: '/wishBoard'
            },
            {
                label: '计划板',
                key: '/planBoard'
            },
            {
                label: '编辑器',
                key: '/editor'
            },
            {
                label: '天气日历',
                key: '/calendar'
            },
            {
                label: '统计图',
                key: '/countBoard'
            },
        ]
    },

    {
        label: '自行车',
        key: '/bike',
        children: [
            {
                label: '轮组计算器',
                key: '/wheelDev'
            },
            {
                label: '器材数据',
                key: '/bikeManage'
            }
        ]
    },

    {
        label: 'AI小说',
        key: '/aiNovel',
        children: [
            {
                label: '工具配置',
                key: '/toolConfig'
            },
            {
                label: '小说管理',
                key: '/novelManage'
            },
            {
                label: '世界观设计',
                key: '/worldViewManage'
            },
            {
                label: '地理设计',
                key: '/geographyManage'
            },
            {
                label: '种族设计',
                key: '/raceManage'
            },
            {
                label: '角色设计',
                key: '/roleManage'
            },
            {
                label: '物品设计',
                key: '/itemManage'
            },
            {
                label: '魔法设计',
                key: '/magicManage'
            },
            {
                label: '技能设计',
                key: '/skillManage'
            },
            {
                label: '阵营设计',
                key: '/factionManage'
            },
            {
                label: '事件管理',
                key: '/eventManage'
            },
            {
                label: '章节管理',
                key: '/chapterManage'
            }
        ]
    }

];

export default navObj;
export type { INavMenu }
