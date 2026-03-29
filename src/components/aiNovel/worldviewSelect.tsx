import { Select, SelectProps } from 'antd';
import useSWR from 'swr';
import useApp from 'antd/lib/app/useApp';
import { IWorldViewData } from '@/src/types/IAiNoval';
import { useMemo, useEffect, useState, useRef } from 'react';

export default function WorldviewSelect(props: SelectProps) {
    return <WorldviewSelectWithSWR {...props} />;
}

const worldviewListFetcher = async (url: string) => {
    const response = await fetch(url);
    const data = await response.json() as { data: IWorldViewData[] };
    return data.data ?? [];
}

function WorldviewSelectWithSWR(props: SelectProps) {
    const { data, error, isLoading } = useSWR('/api/aiNoval/worldView/list', worldviewListFetcher);
    const isFirstLoad = useRef(true);

    useEffect(() => {
        autoSelectFirstWorldview();
    }, [data, props.value, props.onChange]);

    function autoSelectFirstWorldview() {

        if (props.value != null) {
            console.debug('WorldviewSelectWithSWR --> value is not null, current value is: ', props.value, typeof props.value, 'return');
            return;
        }

        if (typeof props.onChange !== 'function') {
            console.debug('WorldviewSelectWithSWR --> onChange is not a function, return');
            return;
        }

        if (!isFirstLoad.current) {
            console.debug('WorldviewSelectWithSWR --> is not first load, return');
            return;
        }

        if (data && data.length > 0) {
            props.onChange(data[0]?.id);
            isFirstLoad.current = false;
        }
    }

    const normalizedProps = useMemo(() => {
        const newProps = {
            ...props,
        }

        if (!newProps.style) {
            newProps.style = {};
        }

        if (!newProps.style.width && !newProps.className) {
            newProps.style.width = '160px';
        }

        return newProps;
    }, [props]);

    return <Select {...normalizedProps} loading={isLoading}>
        {data?.map((worldview) => (
            <Select.Option key={worldview.id} value={worldview.id}>{worldview.title}</Select.Option>
        ))}
    </Select>
}