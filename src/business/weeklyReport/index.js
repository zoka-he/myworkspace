import {useEffect, useState} from "react";
import TaskService from "../taskManage/taskService";
import {Button, Space} from "antd";
import moment from "moment";
import _ from 'lodash';

import './week-report.scss';

export default function () {
    let [taskData, updateTaskData] = useState([]);
    let [lstWeekPlan, updateLstWeekPlan] = useState([]);
    let [tseWeekPlan, updateTseWeekPlan] = useState([]);

    useEffect(() => {
        onRefresh();
    }, [])

    async function onRefresh() {
        processTitle();
        processReportData();
        processFullData();
    }

    async function processFullData() {
        let { data } = await new TaskService().query(
            { status: { $lt: 5 } },
            [],
            ['sys_name asc', 'status desc'],
            1, 200
        );

        console.debug('task data', data);
        updateTaskData(data);
    }

    async function processReportData() {
        let { data } = await new TaskService().query(
            { is_week_report: '1', status: { $lt: 5 } },
            [],
            ['sys_name asc', 'status desc'],
            1, 200
        );

        let taskData = data;


        // 处理上周进度，有进度的任务状态应该是，已启动且未关闭，已关闭的任务已经被sql语句排除
        let lstWeekTasks = taskData.filter(item => item.status > 0);
        let lstWeekArr = [];
        lstWeekTasks.forEach(item => {
            let sysObj = _.find(lstWeekArr, { sys_name: item.sys_name});
            if (!sysObj) {
                sysObj = {
                    sys_name: item.sys_name,
                    task_list: []
                };
                lstWeekArr.push(sysObj);
            }

            sysObj.task_list.push({
                task_name: item.task_name,
                detail: item.detail,
                problems: item.problems,
                status: item.status,
            })
        });
        if (lstWeekArr[0].sys_name === null && lstWeekArr.length > 1) {
            let head = lstWeekArr.shift();
            lstWeekArr.push(head);
        }
        updateLstWeekPlan(lstWeekArr);

        // 处理下周计划，保守看任务状态应该是，未启动
        let tseWeekTasks = taskData.filter(item => item.status === 0);
        let tseWeekArr = [];
        tseWeekTasks.forEach(item => {
            let sysObj = _.find(tseWeekArr, { sys_name: item.sys_name});
            if (!sysObj) {
                sysObj = {
                    sys_name: item.sys_name,
                    task_list: []
                };
                tseWeekArr.push(sysObj);
            }

            sysObj.task_list.push({
                task_name: item.task_name,
                detail: item.detail,
            })
        });
        if (tseWeekArr[0].sys_name === null && tseWeekArr.length > 1) {
            let head = tseWeekArr.shift();
            tseWeekArr.push(head);
        }
        updateTseWeekPlan(tseWeekArr);
    }

    function processTitle() {
        let d_start = moment().startOf('week').subtract(7, 'days');     // 上周一
        let d_end = moment().startOf('week').subtract(3, 'days');      // 上周五

        return `XXX_工作周报（${d_start.format('MMDD')}-${d_end.format('MMDD')}）`;
    }

    /**
     * 渲染本周工作
     * @returns {JSX.Element}
     */
    function renderLstWeek() {
        console.debug('lstWeekPlan', lstWeekPlan);

        let sections = [];
        lstWeekPlan.forEach(sysObj => {
            if (sysObj.sys_name) {
                sections.push(<p>【{sysObj.sys_name}】</p>);
            } else {
                sections.push(<p>其他事项：</p>)
            }

            let li_items = [];
            sysObj.task_list.forEach(task => {
                let status_str = ['', '推进', '测试', '准备', '完成'][task.status];
                let taskname_str = task.task_name;
                let detail_str = task.detail;
                let problems_str = task.problems;

                let li_str = status_str + taskname_str;
                if (detail_str || problems_str) {
                    li_str += '：' + [detail_str, problems_str].filter(s => s).map(s => s + '；').join('');
                } else {
                    li_str += '；'
                }

                li_items.push(<li>{li_str}</li>)
            });

            sections.push(<ul>{li_items}</ul>);
            sections.push(<br/>);
        });

        return (
            <div>
                <h4>本周工作：</h4>
                {sections}
            </div>
        )
    }

    /**
     * 渲染下周计划
     * @returns {JSX.Element}
     */
    function renderTseWeek() {
        console.debug('tseWeekPlan', JSON.stringify(tseWeekPlan));

        let sections = [];
        tseWeekPlan.forEach(sysObj => {
            if (sysObj.sys_name) {
                sections.push(<p>【{sysObj.sys_name}】</p>);
            } else {
                sections.push(<p>其他事项：</p>)
            }

            let li_items = [];
            sysObj.task_list.forEach(task => {
                let taskname_str = task.task_name;
                let detail_str = task.detail;


                let li_str = taskname_str;
                if (detail_str) {
                    li_str += '：' + detail_str + '；';
                } else {
                    li_str += '；'
                }

                li_items.push(<li>{li_str}</li>)
            });

            sections.push(<ul>{li_items}</ul>);
            sections.push(<br/>);
        });

        return (
            <div>
                <h4>下周计划：</h4>
                {sections}
            </div>
        );
    }

    function renderPlanDetail() {
        console.debug(taskData);

        function processFinishDate(task) {
            let time = task.fuck_date || task.deadline_time;
            if (!time) {
                return '/'
            }
            return moment(time).format('YYYY-MM-DD');
        }

        function processStatus(task) {
            return ['未开始', '进行中', '测试中', '待上线', '已完成'][task.status];
        }

        let tdata = [];
        tdata.push(['序号', '分类', '工作事项', '事项内容简述', '计划完成时间', '状态', '备注'])
        taskData.forEach((item, index) => {
            tdata.push([index + 1, item.sys_name, item.task_name, item.detail, processFinishDate(item), processStatus(item), item.problems]);
        });

        let trs = tdata.map(row => {
            let cells = row.map(item => <td><pre>{item}</pre></td>);
            return <tr>{cells}</tr>
        })
        return (
            <table className={'m-week_report-tbl_detail'}>
                <tbody>
                    <tr>
                        <th colspan="7">工作台账</th>
                    </tr>
                    <tr>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                    </tr>
                    {trs}
                </tbody>
            </table>
        );
    }

    return (
        <div className={'f-fit-content'}>
            <div>
                <div className={'f-align-center'}>
                    <h3>
                        <span>{processTitle()}</span>
                        <Button type={'link'} onClick={onRefresh}>刷新</Button>
                    </h3>
                </div>

                <div className={'m-week_report-partition'}>
                    {renderLstWeek()}
                </div>

                <div className={'m-week_report-partition'}>
                    {renderTseWeek()}
                </div>
            </div>

            <br/>

            <div>
                {renderPlanDetail()}
            </div>

        </div>
    );
}
