import TaskService from "../taskManage/taskService";
import {Select} from "antd";
import {useEffect, useState} from "react";
const { Option } = Select;

export default function (props) {
    let [options, setOptions] = useState([]);

    useEffect(() => {
        loadOptions();
    }, []);

    async function loadOptions() {
        let { data } = await new TaskService().query({ status: { $ne: 5 } }, [], ['priority desc', 'task_name asc'], 1, 200);
        setOptions(data.map(item => ( { value: item.ID, label: item.task_name } )));
    }

    function filterOption(input, option) {
        console.debug('filterOption', option);
        return (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
    }

    function onChange(...args) {
        if (typeof props.onChange === 'function') {
            props.onChange(...args);
        }
    }

    return (
        <Select value={props.value} onChange={onChange} showSearch filterOption={filterOption} optionFilterProp="children">
            {options.map(item => <Option value={item.value} key={item.value}>{item.label}</Option>)}
        </Select>
    )
}