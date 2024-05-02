import { Button, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useEffect, useRef, useState } from "react";
import fetch from '@/src/fetch';
import BugEditor from "../bugTrace/bugEditor";

interface IProblemItemProps {
    index: number
    detail?: string
    solution?: string
}

function ProblemItem(props: IProblemItemProps) {
    let qTitle = `Q${props.index+1}：${props.detail}`;
    let qAnswer = `A${props.index+1}：${props.solution}`;

    return (
        <div>
            <div className="f-two-side">
                <div className="f-vertical-middle">
                    <strong>{qTitle}</strong>
                </div>
                <Space>
                    <Button type="link" size="small">编辑</Button>
                    <Button type="link" size="small" danger>关闭</Button>
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

export default function(props: IProblemListProps) {

    let [pList, setPList] = useState<any[]>([])
    let mEditor = useRef<BugEditor | null>(null);
    

    let items = pList.map((item, index) => {
        return <ProblemItem {...{...item, index}}></ProblemItem>
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
            limit: 20,
            task_id: props.taskId,
        };

        let {data} = await fetch.get(url, { params });
        setPList(data);
    }

    useEffect(() => { onQueryList() }, []);
    useEffect(() => { onQueryList() }, [props.taskId]);

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

    return (
        <div>
            {items}
            <Space align="center" className="f-fit-width">
                <Button icon={<PlusOutlined/>} type="dashed" style={{ width: '20em' }} onClick={() => onCreateProblem()}>添加问题</Button>
                <Button onClick={() => onQueryList()}>刷新</Button>
            </Space>
            <BugEditor ref={mEditor} onFinish={() => onQueryList()}/>
        </div>
    )    
}