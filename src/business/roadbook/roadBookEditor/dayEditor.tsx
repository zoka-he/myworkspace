import React from "react";
import {Form, Modal, Input, Button, message, Radio, FormInstance} from "antd";
import _, { update } from 'lodash';
import moment from "moment";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";

interface IDayPlanEditorProps {
    onFinish?: Function
}

interface IDayPlanEditorState {
    modalOpen: boolean,
    loading: boolean,
    dayPlanDetail: Array<any>
}

class DayPlanEditor extends React.Component<IDayPlanEditorProps, IDayPlanEditorState> {

    private oldData: any;

    constructor(props: IDayPlanEditorProps) {
        super(props);

        this.state = {
            modalOpen: false,
            loading: false,

            dayPlanDetail: []
        }
    }

    show() {
        this.setState({
            modalOpen: true
        });
    }

    parseAndFixData(data: any) {
        
    }

    showAndEdit(data: any) {
        this.setState({
            modalOpen: true
        });

        this.oldData = _.clone(data);
        this.parseAndFixData(this.oldData);
    }

    /**
     * 打开，并自动附带上任务ID
     * @param task
     */
    showWithTask(task: any) {
        let { ID } = task;
        this.setState({
            modalOpen: true
        });

        this.oldData = { task_id: ID };
    }


    hide() {
        this.setState({
            modalOpen: false
        });
    }

    async onFinish(data: any) {
        this.hide();

        let cb = this.props.onFinish;
        if (cb) {
            cb(data);
        }
    }

    onFinishedFailed() {
        message.warning('表单校验失败，请修改');
    }

    onCancel() {
        this.hide();
    }

    onDragEnd() {

    }

    renderDetail() {
        let { dayPlanDetail } = this.state;

        let myplaceholder: JSX.Element | null = null;
        if (!dayPlanDetail.length) {
            myplaceholder = <div>请添加日程明细！</div>;
        }

        let taskContext = [];

        return (
            <Droppable droppableId='dayplan111111'>
                {(provided, snapshot) => {
                    return (
                        <div ref={provided.innerRef} {...provided.droppableProps}>
                            {taskContext}
                            {provided.placeholder}
                            {myplaceholder}
                        </div>
                    )
                }}
            </Droppable>
        );
    }

    render() {
        return (
            <>
                <Modal title={'编辑日程'} open={this.state.modalOpen} onCancel={e => this.onCancel()} footer={null}>
                    <div className="f-flex-row">
                        <div>
                            <section>
                                <h5>日程描述：</h5>
                                <Input.TextArea/>
                            </section>

                            <section>
                                <h5>日程明细：</h5>
                                <DragDropContext>
                                    { this.renderDetail() }
                                </DragDropContext>
                            </section>
                        </div>
                        <div>

                        </div>
                    </div>
                </Modal>
            </>
        );
    }
}

export default DayPlanEditor;
