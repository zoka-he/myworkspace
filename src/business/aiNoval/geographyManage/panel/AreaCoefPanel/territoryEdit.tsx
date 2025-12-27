import { Form, Input, TreeSelect, Button, Modal, DatePicker, Typography, Tag, Space, Select, InputNumber, message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatGeoDataTree } from './FlatGeoData';
import { useSimpleFactionContext } from '../../../common/SimpleFactionProvider';
import { useGeoData } from '../../GeoDataProvider';
import { useSimpleWorldviewContext } from '../../../common/SimpleWorldviewProvider';
import { useSimpleTimelineProvider } from '../../../common/SimpleTimelineProvider';
import { TimelineDateFormatter } from '../../../common/novelDateUtils';
import _ from 'lodash';
import fetch from '@/src/fetch';
import { IFactionTerritory } from '@/src/types/IAiNoval';

const { Text } = Typography;

interface ITerritoryEditProps {
    
}

interface ITerritoryEditOptions {
    // initialValues: any;
    onUpdateSuccess: () => void;
}

export default function useTerritoryEdit(options?: ITerritoryEditOptions) {

    const [form] = Form.useForm();
    const [visible, setVisible] = useState(false);
    const { state: worldviewState } = useSimpleWorldviewContext();

    const open = useCallback((value?: IFactionTerritory) => {
        setVisible(true);

        if (value) {
            form.setFieldsValue({
                ...value,
            });
        } else {
            form.setFieldsValue({
                id: null, // 新建时，id为null
                worldview_id: worldviewState.worldviewId,
                start_date: null,
                end_date: null,
                faction_id: null,
                alias_name: null,
                description: null,
                geo_code: null,
            });
        }
    }, [options]);

    const onCancel = useCallback(() => {
        setVisible(false);
    }, [options]);

    const TerritoryEdit = useCallback((props: ITerritoryEditProps) => {
        const { state: factionState } = useSimpleFactionContext();
        const { state: geoDataState } = useGeoData();

        async function handleSubmit() {
            const values = await form.validateFields();

            if (!values.worldview_id) {
                values.worldview_id = worldviewState.worldviewId; // 直接覆盖，这玩意儿不可能是别的东西（如果有，就是前端其他部分哪里错了）
            }

            let geoType = geoDataState.geoData?.find(geo => geo.code === values.geo_code)?.data_type;
            switch (geoType) {
                case 'starSystem':
                    values.geo_type = 'star_system';
                    break;
                case 'geoUnit':
                    values.geo_type = 'geography_unit';
                    break;
                default:
                    values.geo_type = geoType;
            }
            
            try {
                if (!values.id) {
                    await createTerritory(values);
                } else {
                    await updateTerritory(values);
                }

                message.success('操作成功！');
                setVisible(false);

                options?.onUpdateSuccess?.();

            } catch(e) {
                console.error(e);
                message.error('操作失败！');
            }
        }

        return (
            <>
                <Modal open={visible} onCancel={onCancel} onOk={handleSubmit} title="添加疆域单元" width={720}>
                    <Form form={form} labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
                        <Form.Item name="id" hidden></Form.Item>
                        <Form.Item label="世界观" name="worldview_id">
                            <Tag>{worldviewState.worldviewList?.find(w => w.id === worldviewState.worldviewId)?.title || '未知'}</Tag>
                        </Form.Item>
                        <Form.Item label="疆域区块" name="geo_code" rules={[{ required: true, message: '请输入疆域名称' }]}>
                            <TreeSelect treeData={geoDataState.geoTree || []} 
                                fieldNames={{ label: 'title', value: 'key', children: 'children' }}
                                allowClear
                                // treeDefaultExpandAll
                                showSearch
                                treeNodeFilterProp="title"
                            />
                        </Form.Item>
                        <Form.Item label="所属阵营" name="faction_id" rules={[{ required: true, message: '请选择所属阵营' }]}>
                            <TreeSelect treeData={factionState.factionTree || []} 
                                fieldNames={{ label: 'title', value: 'value', children: 'children' }}
                                allowClear
                                // treeDefaultExpandAll
                                showSearch
                                treeNodeFilterProp="title"
                            />
                        </Form.Item>
                        <Form.Item label="曾用地名" name="alias_name">
                            <Input allowClear/>
                        </Form.Item>
                        <Form.Item label="开始时间" name="start_date">
                            <NovelDatePicker />
                        </Form.Item>
                        <Form.Item label="结束时间" name="end_date">
                            <NovelDatePicker />
                        </Form.Item>
                        <Form.Item label="疆域描述" name="description">
                            <Input.TextArea allowClear/>
                        </Form.Item>
                    </Form>
                </Modal>
            </>
        )
    }, [visible, onCancel, options]);

    return {
        Modal: TerritoryEdit,
        open
    }
}

function NovelDatePicker(props: { value?: number | null, onChange?: (value?: number | null) => void }) {

    const { state: worldviewState } = useSimpleWorldviewContext();
    const { state: timelineState } = useSimpleTimelineProvider();

    const [timelineId, setTimelineId] = useState<number | null>(worldviewState.worldviewData?.tl_id ?? null);

    const [year, setYear] = useState<number | null>(null);
    const [month, setMonth] = useState<number | null>(null);
    const [day, setDay] = useState<number | null>(null);
    const [hour, setHour] = useState<number | null>(null);

    function onClear() {
        setYear(null);
        setMonth(null);
        setDay(null);
        setHour(null);
        props.onChange?.(null); // useEffect屏蔽了这种情况（否则没有机会清空），必须显式通知父组件清空时间
    }

    const timelineOptions = useMemo(() => {
        return timelineState.timelineList?.map(timeline => {
            return {
                label: timeline.epoch,
                value: timeline.id,
            }
        }) || [];
    }, [timelineState.timelineList]);

    useEffect(() => {
        let timelineDef = timelineState.timelineList?.find(timeline => timeline.id === timelineId);

        if (!timelineDef) return;
        if (!_.isNumber(year) || !_.isNumber(month) || !_.isNumber(day) || !_.isNumber(hour)) return;

        const newDate = new TimelineDateFormatter(timelineDef).dateDataToSeconds({
            isBC: false,
            year: year ?? 1,
            month: month ?? 1,
            day: day ?? 1,
            hour: hour ?? 0,
            minute: 0,
            second: 0,
        });

        props.onChange?.(newDate);
    }, [year, month, day, hour]);

    useEffect(() => {
        if (!props.value) {
            if (_.isNumber(year) && _.isNumber(month) && _.isNumber(day) && _.isNumber(hour)) {
                setYear(null);
                setMonth(null);
                setDay(null);
                setHour(null);
            }
            return;
        }

        let timelineDef = timelineState.timelineList?.find(timeline => timeline.id === timelineId);
        if (!timelineDef) return;

        const dateData = new TimelineDateFormatter(timelineDef).secondsToDateData(props.value);
        setYear(dateData.isBC ? -dateData.year : dateData.year);
        setMonth(dateData.month);
        setDay(dateData.day);
        setHour(dateData.hour);
    }, [props.value, timelineId]);

    return (
        <Space.Compact>
            <Select options={timelineOptions} value={timelineId} onChange={setTimelineId} style={{ width: 120 }}/>
            <InputNumber value={year} onChange={setYear} style={{ width: 70 }}/>
            <Space.Addon>年</Space.Addon>
            <InputNumber value={month} onChange={setMonth} style={{ width: 50 }}/>
            <Space.Addon>月</Space.Addon>
            <InputNumber value={day} onChange={setDay} style={{ width: 50 }}/>
            <Space.Addon>日</Space.Addon>
            <InputNumber value={hour} onChange={setHour} style={{ width: 50 }}/>
            <Space.Addon>时</Space.Addon>
            <Button onClick={() => onClear()}>清空</Button>
        </Space.Compact>
    )
}

function createTerritory(values: any) {
    return fetch.post('/api/aiNoval/faction/territory', values);
}

function updateTerritory(values: any) {
    return fetch.post('/api/aiNoval/faction/territory', values, {params: {id: values.id}});
}
