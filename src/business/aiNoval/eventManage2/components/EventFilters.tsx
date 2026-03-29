'use client';

import { Button, Input, Select, Space, Typography } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface Props {
    keyword: string;
    dateSort: "asc" | "desc";
    canCreate: boolean;
    loading?: boolean;
    onKeywordChange: (value: string) => void;
    onDateSortChange: (value: "asc" | "desc") => void;
    onCreate: () => void;
    onRefresh: () => void;
}

export default function EventFilters(props: Props) {
    return (
        <div className="flex flex-row justify-between gap-3 flex-wrap">
            <Space wrap>
                <Text>时间排序：</Text>
                <Select
                    size="small"
                    className="w-32"
                    value={props.dateSort}
                    onChange={props.onDateSortChange}
                    options={[
                        { label: "最新在前", value: "desc" },
                        { label: "最早在前", value: "asc" },
                    ]}
                />
                <Input.Search
                    size="small"
                    allowClear
                    className="w-60"
                    placeholder="搜索标题/描述/地点"
                    value={props.keyword}
                    onChange={(e) => props.onKeywordChange(e.target.value)}
                />
            </Space>
            <Space>
                <Button size="small" icon={<ReloadOutlined />} loading={props.loading} onClick={props.onRefresh}>
                    刷新
                </Button>
                <Button size="small" type="primary" icon={<PlusOutlined />} onClick={props.onCreate} disabled={!props.canCreate}>
                    新增事件
                </Button>
            </Space>
        </div>
    );
}
