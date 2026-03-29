'use client';

import { Modal, Space, Typography, Alert } from 'antd';
import { useEffect, useState } from 'react';
import { message } from '@/src/utils/antdAppMessage';
import NovelTimeEdit from '@/src/business/aiNoval/eventManage2/components/NovelTimeEdit';
import type { ITimelineDef } from '@/src/types/IAiNoval';
import { useWorldViewData } from './hooks';

const { Text } = Typography;

export interface ViewportFitModalProps {
    open: boolean;
    onCancel: () => void;
    /** 校验通过后由父级调用 figure.fitViewportToTimeRange */
    onConfirm: (visibleStartSeconds: number, visibleEndSeconds: number) => void;
    /** 当前用于换算的世界时间线；无则无法编辑 */
    timelineDef: ITimelineDef | null;
    /** 打开弹窗时初始化「视口起」的秒数（与主图 timeline 范围一致） */
    defaultStartSeconds?: number;
    /** 打开弹窗时初始化「视口止」的秒数 */
    defaultEndSeconds?: number;
}

export default function ViewportFitModal(props: ViewportFitModalProps) {
    const { open, onCancel, onConfirm, timelineDef, defaultStartSeconds, defaultEndSeconds } = props;
    const [start, setStart] = useState<number | null>(null);
    const [end, setEnd] = useState<number | null>(null);
    const [worldviewData] = useWorldViewData();

    useEffect(() => {
        if (!open) {
            return;
        }
        if (defaultStartSeconds != null && defaultEndSeconds != null) {
            setStart(defaultStartSeconds);
            setEnd(defaultEndSeconds);
        } else {
            setStart(null);
            setEnd(null);
        }
    }, [open, defaultStartSeconds, defaultEndSeconds]);

    function handleOk() {
        if (!timelineDef) {
            message.warning('请先选择世界观并等待时间线加载');
            return;
        }
        if (start == null || end == null) {
            message.warning('请填写视口起止时间');
            return;
        }
        if (!Number.isFinite(start) || !Number.isFinite(end)) {
            message.warning('时间必须为有效数字');
            return;
        }
        if (start === end) {
            message.warning('起止时间不能相同');
            return;
        }
        onConfirm(start, end);
    }

    return (
        <Modal
            title="视口对准时间"
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            okText="对准视口"
            cancelText="取消"
            destroyOnClose
            width={720}
            okButtonProps={{ disabled: !timelineDef }}
        >
            <Space direction="vertical" size="middle" className="w-full pt-1">
                <Text type="secondary">
                    较小时间在屏幕下方，较大时间在上方；与主图时间轴方向一致。
                </Text>
                {!timelineDef ? (
                    <Alert type="warning" showIcon message="请先选择世界观并等待时间线加载完成" />
                ) : null}
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <Text>视口起</Text>
                        {timelineDef ? (
                            <NovelTimeEdit
                                debounceMs={0}
                                timelineDef={timelineDef}
                                value={start ?? undefined}
                                onChange={(seconds) => setStart(seconds)}
                            />
                        ) : null}
                    </div>
                    <div className="flex flex-col gap-1">
                        <Text>视口止</Text>
                        {timelineDef ? (
                            <NovelTimeEdit
                                debounceMs={0}
                                timelineDef={timelineDef}
                                value={end ?? undefined}
                                onChange={(seconds) => setEnd(seconds)}
                            />
                        ) : null}
                    </div>
                </div>
            </Space>
        </Modal>
    );
}
