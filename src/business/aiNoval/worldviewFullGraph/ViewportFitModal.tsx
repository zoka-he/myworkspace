'use client';

import { Alert, Button, Modal, Space, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { message } from '@/src/utils/antdAppMessage';
import NovelTimeEdit from '@/src/business/aiNoval/eventManage2/components/NovelTimeEdit';
import type { ITimelineDef } from '@/src/types/IAiNoval';
import { useWorldViewData } from './hooks';

const { Text } = Typography;

/** 按世界观历法换算标准日/月/年长度（秒） */
function useWorldCalendarSeconds() {
    const [worldViewData] = useWorldViewData();
    return useMemo(() => {
        const hourSeconds = worldViewData?.tl_hour_length_in_seconds ?? 3600;
        const daySeconds = hourSeconds * (worldViewData?.tl_day_length_in_hours ?? 24);
        const monthSeconds = daySeconds * (worldViewData?.tl_month_length_in_days ?? 30);
        const yearSeconds = monthSeconds * (worldViewData?.tl_year_length_in_months ?? 12);
        return { hourSeconds, daySeconds, monthSeconds, yearSeconds, worldViewData };
    }, [worldViewData]);
}

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
    const calendar = useWorldCalendarSeconds();

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

    /** 以 te_max_seconds 为视口止（上方），向前倒推 span 秒作为视口起（下方） */
    function applyPresetBackFromTeMax(spanSeconds: number, label: string) {
        if (!timelineDef) {
            message.warning('请先选择世界观并等待时间线加载');
            return;
        }
        const teMax = calendar.worldViewData?.te_max_seconds;
        if (teMax == null || !Number.isFinite(teMax)) {
            message.warning('当前世界观缺少叙事最大时间 te_max_seconds，无法快捷倒推');
            return;
        }
        if (spanSeconds <= 0 || !Number.isFinite(spanSeconds)) {
            message.warning('快捷区间无效');
            return;
        }
        const endSec = teMax;
        const rawStart = endSec - spanSeconds;
        const tMin = timelineDef.start_seconds ?? 0;
        const startSec = Math.max(tMin, rawStart);
        if (startSec >= endSec) {
            message.warning(`「${label}」倒推后区间为空，请缩短跨度或检查时间线起点与 te_max_seconds`);
            return;
        }
        setStart(startSec);
        setEnd(endSec);
    }

    const quickPresets: { key: string; label: string; span: number }[] = [
        // { key: '1h', label: '近1小时', span: calendar.hourSeconds },
        // { key: '1d', label: '近1日', span: calendar.daySeconds },
        { key: '1m', label: '近1月', span: calendar.monthSeconds },
        { key: '3m', label: '近3月', span: 3 * calendar.monthSeconds },
        { key: '1y', label: '近1年', span: calendar.yearSeconds },
        { key: '2y', label: '近2年', span: 2 * calendar.yearSeconds },
        { key: '10y', label: '近10年', span: 10 * calendar.yearSeconds },
        { key: '100y', label: '近100年', span: 100 * calendar.yearSeconds },
    ];

    const teMaxReady =
        calendar.worldViewData?.te_max_seconds != null &&
        Number.isFinite(calendar.worldViewData.te_max_seconds as number);

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
                {timelineDef && teMaxReady ? (
                    <div className="flex flex-col gap-2">
                        <Text type="secondary">
                            快捷设定（以叙事最大时间 te_max_seconds 为终点，按历法向前倒推）：
                        </Text>
                        <Space wrap size="small">
                            {quickPresets.map((p) => (
                                <Button
                                    key={p.key}
                                    size="small"
                                    onClick={() => applyPresetBackFromTeMax(p.span, p.label)}
                                >
                                    {p.label}
                                </Button>
                            ))}
                        </Space>
                    </div>
                ) : timelineDef && !teMaxReady ? (
                    <Alert
                        type="info"
                        showIcon
                        message="未配置 te_max_seconds 时无法使用快捷倒推，请手动填写起止时间"
                    />
                ) : null}
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
