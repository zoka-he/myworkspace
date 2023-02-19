import { AutoComplete } from "antd";
import { useState } from "react";
import fetch from '@/src/fetch';

export default function EmployeeInput(props) {
    let [options, setOptions] = useState([]);

    function onSelect() {

    }

    async function onSearch(text) {
        let { data } = await fetch.get('/api/employee/list', { params: { name: text, page: 1, limit: 10 } });

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