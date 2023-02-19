import React, {FormEvent} from "react";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

import fetch from '@/src/fetch';
import TaskTip from "./taskTip";
import {Button, Input, message, Space} from "antd";

// import TaskService from "../taskManage/taskService";
import TaskEditor from "../taskEditor";
import InteractViewer from '../catfightLog/interactViewer';
import BugViewer from '../bugTrace/bugViewer';

import _ from 'lodash';

import {SearchOutlined} from "@ant-design/icons";
import {ITaskData} from "@/src/types/ITaskData";

interface IDashboardLists {
    notStarted: Array<any>,
    developing: Array<any>,
    testing: Array<any>,
    fuckable: Array<any>,
    finished: Array<any>,
}

interface IDashboardState {
    queryTaskName: string,
    queryEmployee: string,
}

class Dashboard extends React.Component<{}, IDashboardState & IDashboardLists & {}> {

    private mTaskEditor: TaskEditor | null = null;
    private mInteractViewer: InteractViewer | null = null;
    private mBugViewer: BugViewer | null = null;

    constructor(props: any) {
        super(props);

        this.state = {
            notStarted: [],
            developing: [],
            testing: [],
            fuckable: [],
            finished: [],
            queryTaskName: '',
            queryEmployee: '',
        }


    }

    statusName2status(statusName: string) {
        let ret = ['notStarted', 'developing', 'testing', 'fuckable', 'finished'].indexOf(statusName);
        console.debug('statusName2status', statusName, ret);
        if (ret === -1) {
            console.error('入参错误！');
            console.trace();
        }

        return ret;
    }

    status2statusName(status: number) {
        return ['notStarted', 'developing', 'testing', 'fuckable', 'finished'][status];
    }

    /**
     * 改变数组排序
     * @param list
     * @param startIndex
     * @param endIndex
     * @returns {unknown[]}
     */
    reorder(list: Array<any>, startIndex: number, endIndex: number) {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);

        return result;
    };

    /**
     * 转移item
     * @param source 源坐标
     * @param destination 释放点坐标
     * @param droppableSource 源数据
     * @param droppableDestination 释放点数据
     * @returns {{destination: unknown[], source: unknown[]}}
     */
    move(source: Array<any>, destination: Array<any>, droppableSource: any, droppableDestination: any) {
        // 复制原始表
        const sourceClone = Array.from(source);
        const destClone = Array.from(destination);

        // 迁移
        const [removed] = sourceClone.splice(droppableSource.index, 1);
        destClone.splice(droppableDestination.index, 0, removed);

        return { source: sourceClone, destination: destClone };
    };

    onConditionInput(prop: string, e: FormEvent<HTMLInputElement>) {
        // @ts-ignore
        let val = e?.target?.value || '';

        // @ts-ignore
        this.setState({ [prop]: val });
        _.debounce(() => this.onQuery(), 300)();
    }

    /**
     * 拖拽完成，变更state，并触发保存入库
     * @param result
     */
    async onDragEnd(result: any) {
        const { source, destination } = result;

        // dropped outside the list
        if (!destination) {
            return;
        }

        try {
            // @ts-ignore
            console.debug('getSourceTask', source.droppableId, this.state[source.droppableId], source.index);
            // @ts-ignore
            let sourceTask = this.state[source.droppableId][source.index];

            // 状态未变，重新排序
            if (source.droppableId === destination.droppableId) {
                const items = this.reorder(
                    // @ts-ignore
                    this.state[source.droppableId],
                    source.index,
                    destination.index
                );

                // @ts-ignore
                this.setState({
                    [source.droppableId]: items
                });

                await this.updateDispOrder(source.droppableId, items);
            }

            // 状态已变，重新排序目标序列
            else {
                const result = this.move(
                    // @ts-ignore
                    this.state[source.droppableId],
                    // @ts-ignore
                    this.state[destination.droppableId],
                    source,
                    destination
                );

                // @ts-ignore
                this.setState({
                    [source.droppableId]: result.source,
                    [destination.droppableId]: result.destination,
                })

                await this.changeTaskStatus(sourceTask, destination.droppableId);

                console.debug('result.destination', result.destination)
                await this.updateDispOrder(destination.droppableId, result.destination);
            }
        } catch (e) {
            message.error('更新出现错误，重新加载列表，请查看日志！');
            console.error(e);
            this.onQuery();
        }
    }



    async onQuery() {
        // let { data } = await new TaskService().query({ status: { $ne: 5 } }, [], ['priority desc', 'create_time asc'], 1, 10000);


        let params: any = {};
        if (this.state.queryTaskName) {
            params.task_name = this.state.queryTaskName;
        }
        if (this.state.queryEmployee) {
            params.employee = this.state.queryEmployee;
        }

        // let data = await new TaskService().getDashboard(conditions);
        let data: any = await fetch.get('/api/dashboard', { params });
        console.debug('fetch data', data);

        let state: IDashboardLists = {
            notStarted: [],
            developing: [],
            testing: [],
            fuckable: [],
            finished: []
        };

        console.debug('onQuery', data);

        for (let item of data) {
            // @ts-ignore
            state[this.status2statusName(item.status)]?.push(item);
        }

        this.setState(state);
    }

    componentDidMount() {
        this.onQuery();
    }

    getItemStyle() {
        return {};
    }

    async updateDispOrder(listName: string, refList: Array<any>) {
        let list = refList;
        if (!(list instanceof Array)) {
            console.error(refList);
            return;
        }

        let dispOrder = 0;
        // let service = new TaskService();
        // for (let item of list) {
        //     await service.updateOne(item, { disp_order: dispOrder++ });
        // }
    }

    async changeTaskStatus(task: ITaskData, statusName: string) {
        // await new TaskService().updateOne(task, { status: this.statusName2status(statusName) });
    }

    onCreateTask() {
        if (this.mTaskEditor) {
            this.mTaskEditor.show();
        }
    }

    onEditTask(task: ITaskData) {
        if (this.mTaskEditor) {
            this.mTaskEditor.showAndEdit(task);
        }
    }

    onShowInteract(task: ITaskData) {
        if (this.mInteractViewer) {
            this.mInteractViewer.show(task);
        }
    }

    onShowBug(task: ITaskData) {
        if (this.mBugViewer) {
            this.mBugViewer.show(task);
        }
    }

    /**
     * 渲染可拖拽项
     * @param item
     * @param index
     * @returns {JSX.Element}
     */
    renderTask(item: ITaskData, index: number) {
        // @ts-ignore
        return (
            <Draggable key={item.ID} draggableId={item.ID.toString()} index={index}>
                {(provided, snapshot) => {
                    return (
                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                            <TaskTip taskData={item}
                                     onEdit={(task: ITaskData) => this.onEditTask(task)}
                                     onShowInteract={(task: ITaskData) => this.onShowInteract(task)}
                                     onShowBug={(task: ITaskData) => this.onShowBug(task)}
                            />
                        </div>
                    )
                }}
            </Draggable>
        )
    }

    /**
     * 渲染任务列表
     * @param droppableId 任务列表变量名
     * @returns {JSX.Element}
     */
    renderTaskList(droppableId: string) {
        let myplaceholder: JSX.Element | null = null;
        let taskContext: JSX.Element | null = null;


        // @ts-ignore
        let taskList = this.state[droppableId];

        // console.debug(droppableId, taskList);
        if (!taskList?.length) {
            myplaceholder = <div>请拖拽任务到此处以更新状态！</div>;
        } else {
            // 千万注意这里的lambda不能丢，否则renderTask的this就丢失了；
            // 此外index也不能丢，react-beautiful-dnd需要使用
            taskContext = taskList.map((item: ITaskData, index: number) => this.renderTask(item, index));
        }

        return <Droppable droppableId={droppableId}>
            {(provided, snapshot) => {
                return (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                        {taskContext}
                        {provided.placeholder}
                        {myplaceholder}
                    </div>
                )
            }}
        </Droppable>;
    }

    render() {
        let self = this;

        return (
            <div className={'f-fit-content'}>
                <div className={'f-flex-two-side'}>
                    <Space>
                        <label>任务名称：</label>
                        <Input style={{ width: '20em' }} value={this.state.queryTaskName} onInput={e => this.onConditionInput('queryTaskName', e)}/>
                        <label>负责人：</label>
                        <Input style={{ width: '10em' }} value={this.state.queryEmployee} onInput={e => this.onConditionInput('queryEmployee', e)}/>
                        <Button icon={<SearchOutlined/>} type="primary" onClick={() => this.onQuery()}>刷新</Button>
                    </Space>
                    <Space>
                        <Button type={'primary'} onClick={e => this.onCreateTask()}>添加</Button>
                    </Space>
                </div>

                <div style={{ margin: '5px -10px' }}>
                    <DragDropContext onDragEnd={e => this.onDragEnd(e)}>
                        <div className="f-flex-row">
                            <div className="m-dashboard_main-list">
                                <h3 className="f-inline-block f-fit-width f-bg-red18 f-align-center">未开始</h3>
                                {this.renderTaskList('notStarted')}
                            </div>
                            <div className="m-dashboard_main-list">
                                <h3 className="f-inline-block f-fit-width f-bg-yellow18 f-align-center">开发中</h3>
                                {this.renderTaskList('developing')}
                            </div>
                            <div className="m-dashboard_main-list">
                                <h3 className="f-inline-block f-fit-width f-bg-blue18 f-align-center">测试中</h3>
                                {this.renderTaskList('testing')}
                            </div>
                            <div className="m-dashboard_main-list">
                                <h3 className="f-inline-block f-fit-width f-bg-red f-yellow f-align-center">待上线</h3>
                                {this.renderTaskList('fuckable')}
                            </div>
                            <div className="m-dashboard_main-list">
                                <h3 className="f-inline-block f-fit-width f-bg-green18 f-align-center">已完成</h3>
                                {this.renderTaskList('finished')}
                            </div>
                        </div>
                    </DragDropContext>
                </div>

                <TaskEditor ref={comp => this.mTaskEditor = comp} onFinish={() => this.onQuery()}/>
                <InteractViewer ref={comp => this.mInteractViewer = comp}/>
                <BugViewer ref={comp => this.mBugViewer = comp}/>
            </div>

        );
    }
}

export default Dashboard;