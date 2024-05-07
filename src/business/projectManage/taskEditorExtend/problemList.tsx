import { Button, Space, Tag, message } from "antd";
import { PlusOutlined, ExclamationCircleFilled } from "@ant-design/icons";
import { useEffect, useRef, useState } from "react";
import fetch from '@/src/fetch';
import BugEditor from "../bugTrace/bugEditor";
import DayJS from 'dayjs';
import ProjectValueMapper from "../projectCommon/projectValueMapper";
import confirm from "antd/es/modal/confirm";

interface IProblemItemProps {
    index: number
    problemData: any
    onEdit?: Function
    onDelete?: Function
}

/**
 * 问题单项
 * @param props 
 * @returns 
 */
function ProblemItem(props: IProblemItemProps) {
    let { detail, solution, status, create_time } = props.problemData;

    let qTitle = `Q${props.index+1}：${detail}`;
    let qAnswer = `A${props.index+1}：${solution}`;
    let tagText = ProjectValueMapper.bugStateMapper.mapValueToString(status, '未知');

    function onEditButtonClick() {
        if (props.onEdit) {
            props.onEdit(props.problemData);
        }
    }

    function onDeleteButtonClick() {
        if (props.onDelete) {
            props.onDelete(props.problemData);
        }
    }

    return (
        <div style={{ margin: '10px 0' }}>
            <div className="f-two-side">
                <div className="f-vertical-middle">
                    <strong>{qTitle}</strong>
                    <span>&nbsp;</span>
                    <Tag>{tagText}</Tag>
                </div>
                <Space>
                    <span>创建于：{DayJS(create_time).format('YYYY-MM-DD')}</span>
                    <Button type="link" size="small" onClick={() => onEditButtonClick()}>编辑</Button>
                    <Button type="link" size="small" danger onClick={() => onDeleteButtonClick()}>关闭</Button>
                </Space>
            </div>
            <div>
                <span>{qAnswer}</span>
            </div>
        </div>
    )
}


interface IProblemListProps {
    taskId?: number
}

/**
 * 问题列表
 * @param props 
 * @returns 
 */
export default function(props: IProblemListProps) {

    let [pList, setPList] = useState<any[]>([])
    let mEditor = useRef<BugEditor | null>(null);

    function onCreateProblem() {
        if (mEditor.current) {
            mEditor.current.showAndEdit({ task_id: props.taskId });
        }
    }

    function onEditProblem(item: any) {
        if (mEditor.current) {
            mEditor.current.showAndEdit(item);
        }
    }

    async function closeProblem(item: any) {
        await fetch.post('/api/bug', { status: 4 }, { params: { ID: item.ID } });
        message.success('问题已关闭！');
        onQueryList();
    }

    function onDeleteProblem(item: any) {
        console.debug('close problem', item);

        confirm({
            title: '关闭确认',
            icon: <ExclamationCircleFilled />,
            content: '警告！将关闭问题，请二次确认！',
            okText: '关闭',
            okType: 'danger',
            cancelText: '取消',
            onOk() {
                closeProblem(item);
            },
            onCancel() {
                console.log('Cancel');
            },
        });
    }
    

    let items = pList.map((item, index) => {
        return <ProblemItem 
            index={index} problemData={item} 
            onEdit={(prob: any) => onEditProblem(prob)}
            onDelete={(prob: any) => onDeleteProblem(prob)}
        ></ProblemItem>
    });


    // TODO 补充取数逻辑？
    async function onQueryList() {
        if (!props.taskId) {
            setPList([]);
            return;
        }

        let url: string = '/api/bug/list';
        let params = {
            page: 1,
            status: [0, 1, 2, 3],
            limit: 20,
            task_id: props.taskId,
        };

        let {data} = await fetch.get(url, { params });
        setPList(data);
    }

    useEffect(() => { onQueryList() }, []);
    useEffect(() => { onQueryList() }, [props.taskId]);

    

    return (
        <div>
            <Space align="center" className="f-fit-width">
                <Button icon={<PlusOutlined/>} type="dashed" style={{ width: '20em' }} onClick={() => onCreateProblem()}>添加问题</Button>
                <Button onClick={() => onQueryList()}>刷新</Button>
            </Space>
            {items}
            <BugEditor ref={mEditor} onFinish={() => onQueryList()}/>
        </div>
    )    
}