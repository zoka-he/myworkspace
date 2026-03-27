'use client';

import { Button, Popconfirm, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { IFactionDefData, IRoleData, IStoryLine, ITimelineEvent } from "@/src/types/IAiNoval";
import type { EventTableRow } from "../types";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";

interface Props {
    rows: ITimelineEvent[];
    factions: IFactionDefData[];
    roles: IRoleData[];
    storyLines: IStoryLine[];
    loading?: boolean;
    formatDate: (seconds: number) => string;
    formatLocation: (locationCode: string) => string;
    showLocation?: boolean;
    showFactions?: boolean;
    showRoles?: boolean;
    onEdit: (row: ITimelineEvent) => void;
    onDelete: (row: ITimelineEvent) => void;
}

const STATE_COLOR: Record<string, string> = {
    enabled: "green",
    questionable: "gold",
    not_yet: "blue",
    blocked: "red",
    closed: "default",
};

const STATE_LABEL: Record<string, string> = {
    enabled: "启用",
    questionable: "待核实",
    not_yet: "尚未发生",
    blocked: "受阻",
    closed: "已关闭",
};

export default function EventTable(props: Props) {
    const factionMap = new Map(props.factions.map((item) => [item.id, item.name]));
    const roleMap = new Map(props.roles.map((item) => [String(item.id), item.name ?? String(item.id)]));
    const storyLineMap = new Map(props.storyLines.map((item) => [item.id, item.name]));

    const columns: ColumnsType<EventTableRow> = [
        {
            title: "时间",
            dataIndex: "date",
            width: 120,
            fixed: "left",
            render: (seconds: number) => props.formatDate(seconds),
        },
        {
            title: "故事线",
            dataIndex: "story_line_id",
            width: 130,
            render: (id: number) => storyLineMap.get(id) ?? id,
        },
        { title: "标题", dataIndex: "title", width: 220, ellipsis: true },
        { title: "描述", dataIndex: "description", minWidth: 300, ellipsis: true },
        {
            title: "状态",
            dataIndex: "state",
            width: 120,
            render: (state: string) => <Tag color={STATE_COLOR[state] ?? "default"}>{STATE_LABEL[state] ?? state}</Tag>,
        },
        {
            title: "操作",
            key: "actions",
            fixed: "right",
            width: 80,
            render: (_, row) => (
                <Space>
                    <Button size="small" type="link" onClick={() => props.onEdit(row)}><EditOutlined /></Button>
                    <Popconfirm
                        title="确认删除该事件？"
                        okText="删除"
                        cancelText="取消"
                        onConfirm={() => props.onDelete(row)}
                    >
                        <Button size="small" type="link" danger><DeleteOutlined /></Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];
    if (props.showLocation !== false) {
        columns.splice(4, 0, {
            title: "地点",
            dataIndex: "location",
            width: 120,
            render: (locationCode: string) => props.formatLocation(locationCode),
        });
    }
    if (props.showFactions !== false) {
        columns.splice(columns.length - 2, 0, {
            title: "阵营",
            dataIndex: "faction_ids",
            width: 220,
            render: (ids: number[] = []) => (
                <Space size={[0, 4]} wrap>
                    {ids.map((id) => <Tag key={id}>{factionMap.get(id) ?? id}</Tag>)}
                </Space>
            ),
        });
    }
    if (props.showRoles !== false) {
        columns.splice(columns.length - 2, 0, {
            title: "角色",
            dataIndex: "role_ids",
            width: 240,
            render: (ids: string[] = []) => (
                <Space size={[0, 4]} wrap>
                    {ids.map((id) => <Tag key={id}>{roleMap.get(String(id)) ?? id}</Tag>)}
                </Space>
            ),
        });
    }

    return (
        <Table<EventTableRow>
            size="small"
            rowKey={(row) => row.id}
            loading={props.loading}
            columns={columns}
            dataSource={props.rows.map((item) => ({ ...item, key: item.id }))}
            scroll={{ x: 1600, y: "calc(100vh - 240px)" }}
            pagination={{ pageSize: 20, showSizeChanger: true }}
        />
    );
}
