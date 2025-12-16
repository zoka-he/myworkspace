import { useEffect, useState } from 'react';
import { Select } from 'antd';
import fetch from '@/src/fetch';

const { Option } = Select;

interface IPlanSelectProps {
    onChange?: Function
}

export default function (props: IPlanSelectProps) {
    let [options, setOptions] = useState([]);

    useEffect(() => {
        loadOptions();
    }, []);

    async function loadOptions() {
        let { data } = await fetch.get(
            '/api/roadPlan/list', 
            { 
                params: {
                    page: 1,
                    limit: 200
                }
            }
        );

        if (!data) {
            data = [];
        }
        // @ts-ignore
        setOptions(data.map(item => ( { value: item.ID, label: item.name } )));
    }

    function filterOption(input: string, option: any) {
        console.debug('filterOption', option);
        return (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
    }

    return (
        /** @ts-ignore */
        <Select 
            showSearch 
            filterOption={filterOption} 
            optionFilterProp="children"
            {...props}
        >
            {options.map((item: any) => <Option value={item.value} key={item.value}>{item.label}</Option>)}
        </Select>
    );
}