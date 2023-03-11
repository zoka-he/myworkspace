import { Button, Input, Select, TimePicker } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined, DeleteOutlined, EnvironmentOutlined, ExclamationCircleFilled } from '@ant-design/icons';
import React from "react";
import * as Dayjs from 'dayjs';

interface IDayNodeProps {
    index: number,
    totalCount: number,
    deleteNode: Function,
    moveUpNode: Function,
    moveDownNode: Function
    initData: any
    isLocating: boolean,
    locatingIndex: number | null,
    requestLocate: Function,
    locateChange: Function,
    indexChange: Function
}

interface IDayNodeStates {
    type?: string
    addr?: string
    stayTime?: Dayjs | null | undefined,
    lng?: number
    lat?: number
    dist?: number
    dura?: number,
    preferTime?: Dayjs[]
}

export default class NodeEditor extends React.Component<IDayNodeProps, IDayNodeStates> {

    private locateChangeFlag: boolean;

    constructor(props: IDayNodeProps) {
        super(props);
        let data = props.initData;
        
        this.state = {
            type: data.type,
            addr: data.addr,
            stayTime: data.stayTime
        };

        this.locateChangeFlag = false;
    }

    public acceptLocation(data: IDayNodeStates) {
        let obj = {
            lng: data.lng,
            lat: data.lat,
        };
        
        this.locateChangeFlag = true;
        this.setState(obj);
        
    }

    public acceptDistAndDura(dist: number, dura: number, preferTime: Dayjs[]) {
        this.setState({
            dist,
            dura,
            preferTime
        });
    }

    setAddrText(text) {
        this.locateChangeFlag = true;

        this.setState({
            addr: text
        });
    }

    public getStayDuraSecond() {
        if (!this.state.stayTime) {
            return 0;
        }

        let t0 = Dayjs().startOf('day');
        let t1 = this.state.stayTime;
        let dura = Dayjs.duration(t1.diff(t0));
        return dura;
    }

    componentDidUpdate(prevProps: Readonly<IDayNodeProps>, prevState: Readonly<IDayNodeStates>, snapshot?: any): void {

        if (this.locateChangeFlag) {
            this.locateChangeFlag = false;
            if (typeof this.props.locateChange === 'function') {
                this.props.locateChange();
            }
        }

        if (prevProps.index !== this.props.index) {
            if (typeof this.props.indexChange === 'function') {
                this.props.indexChange();
            }
        }
    }

    renderDistAndDura() {
        if (!(typeof this.state.dist === 'number') || !(typeof this.state.dura === 'number')) {
            return <i className="f-silver">&lt;未规划&gt;</i>
        } else {
            let s_km = (this.state.dist / 1000).toFixed(1);
            let s_HH = Math.floor(this.state.dura / 3600);
            let s_mm = Math.floor((this.state.dura % 3600) / 60);
            return <span>{s_km}km {s_HH}h{s_mm}m</span>
        }
    }

    renderPreferTime() {
        if (!this.state.preferTime) {
            return <i className="f-silver">&lt;未规划&gt;</i>
        } else {
            return this.state.preferTime[0].format('HH:mm') + ' - ' + this.state.preferTime[1].format('HH:mm');
        }
    }
    
    render() {
        let { index, totalCount, deleteNode, moveUpNode, moveDownNode, isLocating, locatingIndex, requestLocate } = this.props;

        let isFirst = index === 0;
        let isLast = index === totalCount - 1;

        let locateEnable = true;
        if (isLocating && locatingIndex !== index) {
            locateEnable = false;
        }
        let isMeLocating = false;
        if (locateEnable && locatingIndex === index) {
            isMeLocating = true;
        }

        return (
            <div className="m-day_tips">
                <div className="f-flex-row">
                    <Input.Group compact>
                        <Select placeholder="类型" value={this.state.type} onChange={e => this.setState({ type: e })}>
                            <Select.Option value="meal">用餐</Select.Option>
                            <Select.Option value="position">途经</Select.Option>
                            <Select.Option value="hotel">住宿</Select.Option>
                            <Select.Option value="sights">景点</Select.Option>
                        </Select>
                        <Input style={{ width: '300px' }} placeholder={`第${index}号节点`}  value={this.state.addr} allowClear
                                onInput={e => this.setAddrText(e.target.value )}/>
                        <Button icon={<EnvironmentOutlined />} 
                                type={ isMeLocating ? "primary" : "default" } 
                                disabled={!locateEnable}
                                onClick={() => requestLocate()}/>
                    </Input.Group>
                    <Button type="link" icon={<ArrowUpOutlined/>} disabled={isFirst} onClick={() => moveUpNode(index)}/>
                    <Button type="link" icon={<ArrowDownOutlined/>} disabled={isLast} onClick={() => moveDownNode(index)}/>
                    <Button type="link" icon={<DeleteOutlined/>} danger onClick={() => deleteNode(index)}/>
                </div>
                <div>
                    <div style={{ width: '170px', display: 'inline-block' }}>行驶：{this.renderDistAndDura()}</div>
                    <TimePicker placeholder="停留" value={this.state.stayTime} 
                                onChange={e => this.setState({ stayTime: e })}/>

                    <div style={{ width: '200px', display: 'inline-block', textAlign: 'right' }}>参考时间：{ this.renderPreferTime() }</div>

                    {/* <Input style={{ width: '80px' }} placeholder="参考海拔"></Input> */}
                </div>
            </div>
        )
    };
}