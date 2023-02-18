import EmployeeService from "../employeeManage/employeeService";
import { AutoComplete } from "antd";
import { useState } from "react";

export default function EmployeeInput(props) {
    let [options, setOptions] = useState([]);

    function onSelect() {

    }

    async function onSearch(text) {
        let { data } = await new EmployeeService().query({ name: { $like: `%${text}%` } });
        if (data instanceof Array) {
            setOptions(data.map(item => ({value: item.name})));

        } else {
            setOptions([]);
        }
    }

    function onChange(...args) {
        if (typeof props?.onChange === 'function') {
            props.onChange(...args);
        } else {
            console.error('EmployeeInput:', '请提供onChange事件！')
        }
    }

    return (
        <AutoComplete
            value={props.value}
            options={options}
            style={props.style}
            onSelect={onSelect}
            onSearch={onSearch}
            onChange={onChange}
            placeholder={'请输入姓名！'}
        />
    )
}