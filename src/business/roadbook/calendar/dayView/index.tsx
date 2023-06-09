import { Button, Calendar, Space } from "antd";
import AddPlanModal from "./addPlan";
import AddRemarkModal from "./addRemarkModal";
import { useRef } from "react";
import AddLuggageModal from "./addLuggageModal";

export default function() {

    let mAddPlanModal = useRef<AddPlanModal>();
    let mAddRemarkModal = useRef<AddRemarkModal>();
    let mAddLuggageModal = useRef<AddLuggageModal>();

    function openAddPlanModal() {
        mAddPlanModal?.current?.show();
    }

    function openAddRemarkModal() {
        mAddRemarkModal?.current?.show();
    }

    function openAddLuggageModal() {
        mAddLuggageModal?.current?.show();
    }

    return (
        <div className="f-fit-height f-flex-col">
            <div>
                <Space>
                    <Button type="primary" onClick={openAddPlanModal}>添加计划</Button>
                    <Button onClick={openAddRemarkModal}>添加备注</Button>
                    <Button onClick={openAddLuggageModal}>添加物品单</Button>
                </Space>
            </div>
            <div className="f-flex-1" style={{ margin: '12px 0' }}>
                <Calendar></Calendar>
            </div>
            <AddPlanModal ref={mAddPlanModal}/>
            <AddRemarkModal ref={mAddRemarkModal}/>
            <AddLuggageModal ref={mAddLuggageModal}/>
        </div>
    )

}