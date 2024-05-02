import { Component } from "react";
import {Button, Space} from "antd";
import {EditOutlined} from "@ant-design/icons";
import moment from 'moment';

import type { ITaskData } from '../../types/ITaskData';
import type { ITaskTipProps } from './ITaskTipProps';

class TaskTip extends Component<ITaskTipProps>{
    constructor(props: ITaskTipProps) {
        super(props);
    }

    emitToEditor(task?: ITaskData) {
        let emitter = this.props.onEdit;
        if (!emitter) {
            console.error('请传入onEdit事件！');
            return;
        }

        emitter(task)
    }



    render() {
        let taskData = this.props.taskData;
        // @ts-ignore
        let { ID, task_name, employee, bug_titles, detail, priority, fuck_date, deadline_time, msg_cnt, bug_cnt, sys_name } = taskData;
        if (!msg_cnt) msg_cnt = 0;
        if (!bug_cnt) bug_cnt = 0;


        let emergFlag = priority == 1;
        let pauseFlag = priority == -1

        // 显示title
        let taskNameStyle = '';
        let tipStyle = '';
        if (emergFlag) {
            taskNameStyle = 'f-red';
            tipStyle = 'emerg';
        }

        if (pauseFlag) {
            tipStyle = 'pause';
        }

        // 显示任务描述
        let renderDetail = null;
        if (detail) {
            renderDetail = <div className="m_tasktip-detail">
                <pre>{detail}</pre>
            </div>;
        }

        // 显示bug按钮
        let renderBug = null;
        // if (bug_cnt) {
            const emitBugViewer = () => {
                if (typeof this.props.onShowBug === 'function') {
                    this.props.onShowBug(taskData);
                }
            }
            let bugClassName = ['m_tasktip-txtbtn', 'f-bold'];
            if (bug_cnt) {
                bugClassName.push('f-red');
            }
            renderBug = <Button className={bugClassName.join(' ')} type={"text"} size={"small"}>问题({bug_cnt})</Button>
        // }

        // 显示沟通记录
        let renderCatflight = null;
        // if (msg_cnt) {
            const emitMsgViewer = () => {
                if (typeof this.props.onShowInteract === 'function') {
                    this.props.onShowInteract(taskData);
                }
            }
            let msgClassName = ['m_tasktip-txtbtn', 'f-bold'];
            if (msg_cnt) {
                msgClassName.push('f-orange');
            }
            renderCatflight = <Button className={msgClassName.join(' ')} type={"text"}>沟通记录({msg_cnt})</Button>
        // }

        // 显示问题简要描述
        let renderProblems = null;
        if (typeof bug_titles === 'string') {
            let problems = bug_titles.split('|||').map(item => <li style={{ padding: '0', margin: '0', fontSize: '10px' }}>{item}</li>);

            renderProblems = <div className="m_tasktip-problems">
                <ul style={{ listStyle: 'decimal', paddingInlineStart: '15px', margin: '2px 0' }}>{problems}</ul>
            </div>
        }

        // 显示附加button
        let renderExtraBtns = null;
        let extraBtns = [renderBug, renderCatflight].filter(item => item !== null);
        let extraClassName = ['m_tasktip-extra_btn'];
        if (!msg_cnt && !bug_cnt) { // 假如都没有问题，让它自动隐藏
            extraClassName.push('auto_hide')
        }
        renderExtraBtns = <div className={extraClassName.join(' ')}>{extraBtns}</div>;


        let renderEmployee = null;
        if (employee) {
            renderEmployee = <dl>
                <dt>负责人：</dt>
                <dd>{employee}</dd>
            </dl>;
        }

        // 显示上线时间
        let renderFuckDate = null;
        if (fuck_date) {
            renderFuckDate = <dl>
                <dt>上线日期：</dt>
                <dd>{moment(fuck_date).format('YYYY-MM-DD')}</dd>
            </dl>
        }

        // 显示截止时间
        let renderDeadlineTime = null;
        if (deadline_time) {
            renderDeadlineTime = <dl>
                <dt>截止日期：</dt>
                <dd>{moment(deadline_time).format('YYYY-MM-DD')}</dd>
            </dl>
        }

        let title = [sys_name, task_name].filter(s => s).join('：')

        return (
            <div className={`m_tasktip f-inline-block ${tipStyle}`} onClick={() => this.emitToEditor(taskData)}>
                <div className="m_tasktip-title">
                    <h4>
                        <span className={taskNameStyle}>{title}</span>
                        {/* <Button size={'small'} type={'link'} icon={<EditOutlined />} onClick={() => this.emitToEditor(taskData)}/> */}
                    </h4>
                </div>
                <div className="m_tasktip-context">
                    <div className="m_tasktip-props">
                        {renderEmployee}
                        {renderFuckDate}
                        {renderDeadlineTime}
                    </div>
                    {renderDetail}
                    {renderExtraBtns}
                    {renderProblems}
                </div>

            </div>
        )
    }
}

export default TaskTip;