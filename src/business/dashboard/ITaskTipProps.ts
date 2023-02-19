import {ITaskData} from "@/src/types/ITaskData";

interface ITaskTipProps {
    taskData?: ITaskData
    onEdit?: Function
    onShowBug?: Function
    onShowInteract?: Function
}

export type {
    ITaskTipProps
}