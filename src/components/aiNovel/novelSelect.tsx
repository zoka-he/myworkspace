'use client';
import { INovalData } from '@/src/types/IAiNoval';
import { Select, SelectProps } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import useApp from 'antd/lib/app/useApp';

interface NovelSelectProps extends SelectProps {
    
}

// 为将来支持Context留出空间
export default function NovelSelect(props: NovelSelectProps) {
    return <NovelSelectWithSWR {...props} />;
}

const novalListFetcher = (url: string) =>
    fetch(url).then((res) => res.json()) as Promise<{ data: INovalData[] }>;

function NovelSelectWithSWR(props: SelectProps) {
    const { data, error, isLoading } = useSWR('/api/aiNoval/noval/list', novalListFetcher);
    const novelList = data?.data ?? [];
    const app = useApp();

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

    useEffect(() => {
        if (error) {
            app.message.error(error.message);
        }
    }, [error]);

    return <Select {...normalizedProps} loading={isLoading}>
        {novelList?.map((novel) => (
            <Select.Option key={novel.id} value={novel.id}>{novel.title}</Select.Option>
        ))}
    </Select>
}

// 未实现
function NovelSelectWithContext() {
}