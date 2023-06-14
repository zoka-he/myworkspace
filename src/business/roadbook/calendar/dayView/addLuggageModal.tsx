import { Modal, Form, DatePicker, InputNumber, Select, Input, Divider, Checkbox } from "antd";
import React from "react";


interface AddLuggageModalProps {

}

interface AddLuggageModalState {
    isOpen?: boolean,
    luggageList?: string[]
}

class AddLuggageModal extends React.Component<AddLuggageModalProps, AddLuggageModalState> {

    constructor() {
        super({});

        this.state = {
            isOpen: false,
            luggageList: []
        }
    }

    show() {
        this.setState({ isOpen: true });
    }

    showAndEdit() {
        this.show();
    }

    close() {
        this.setState({ isOpen: false });
    }

    getInitalValues() {
        return {
            type: null,
            desc: null,
            date: null,
        }
    }

    toggleLuggage(s: string, addOrRm: boolean) {
        if (addOrRm) { // add
            this.setState({
                luggageList: [...(this.state.luggageList || []), s]
            })
        } else {
            this.setState({
                luggageList: this.state.luggageList?.filter(item => item != s) || []
            })
        }
    }

    renderCheckers(context: string) {
        let value = this.state.luggageList?.includes(context) || false;
        return <Checkbox checked={value} onChange={() => this.toggleLuggage(context, !value)}>{context}</Checkbox>;
    }

    renderDividers(context: string) {
        return <Divider orientation="left" orientationMargin="0">{context}</Divider>;
    }

    renderGroups(children: any[]) {
        let wrappedChildren = children.map(item => <li>{item}</li>)

        return (
            <ul style={{ listStyle: 'decimal' }}>{wrappedChildren}</ul>
        )
    }

    componentDidUpdate(prevProps: Readonly<AddLuggageModalProps>, prevState: Readonly<AddLuggageModalState>, snapshot?: any): void {
        console.debug('luggageList', this.state.luggageList);
    }

    render() {
        return (
            <>
                <Modal title="添加备注" open={this.state.isOpen} width={'70vw'}
                        onCancel={this.close.bind(this)}>
                    <div>
                        <span>打包日期：</span>
                        <DatePicker/>
                    </div>
                    {this.renderDividers('一、衣服类')}
                    {this.renderGroups([
                        [
                            <span>冬衣：</span>,
                            this.renderCheckers('羽绒衣'),
                            this.renderCheckers('冲锋衣'),
                            this.renderCheckers('外套'),
                            this.renderCheckers('束能裤'),
                            this.renderCheckers('手套'),
                            this.renderCheckers('护膝')
                        ],
                        [
                            <span>四季衣：</span>,
                            this.renderCheckers('衬衣'),
                            this.renderCheckers('长裤'),
                            this.renderCheckers('颈套'),
                        ],
                        [
                            <span>内衣：</span>,
                            this.renderCheckers('睡衣'),
                            this.renderCheckers('内裤'),
                            this.renderCheckers('袜子'),
                        ],
                        [
                            <span>鞋类：</span>,
                            this.renderCheckers('运动鞋'),
                            this.renderCheckers('拖鞋'),
                            this.renderCheckers('鞋袋'),
                        ],
                    ])}
                    {this.renderDividers('二、日用品类')}
                    {this.renderGroups([
                        [
                            this.renderCheckers('速干毛巾'),
                            this.renderCheckers('梳'),
                            this.renderCheckers('牙膏'),
                            this.renderCheckers('牙刷'),
                            this.renderCheckers('香皂'),
                            this.renderCheckers('打泡网'),
                            this.renderCheckers('洗头水'),
                            this.renderCheckers('硅胶漱口杯'),
                            this.renderCheckers('纸巾'),
                            this.renderCheckers('马桶垫'),
                            this.renderCheckers('棉签'),
                        ],
                        [
                            this.renderCheckers('太阳镜'),
                            this.renderCheckers('太阳帽'),
                            this.renderCheckers('雨衣'),
                            this.renderCheckers('气枕'),
                        ],
                        [
                            this.renderCheckers('纸笔'),
                            this.renderCheckers('电筒'),
                            this.renderCheckers('指甲钳'),
                            this.renderCheckers('小刀'),
                            this.renderCheckers('剪刀'),
                            this.renderCheckers('小魔方插座'),
                            this.renderCheckers('挂扣'),
                            this.renderCheckers('防丢绳'),
                        ],
                        [
                            this.renderCheckers('晾衣绳'),
                            this.renderCheckers('长尾夹'),
                            this.renderCheckers('折叠衣'),
                            this.renderCheckers('晾衣固定架'),
                            this.renderCheckers('烘干衣机'),
                        ],
                        [
                            this.renderCheckers('水瓶'),
                            this.renderCheckers('保温杯'),
                        ],
                        [
                            this.renderCheckers('拉杆箱'),
                            this.renderCheckers('背包'),
                            this.renderCheckers('腰包'),
                            this.renderCheckers('旅途随车用品收纳袋'),
                            this.renderCheckers('手机袋'),
                        ],
                    ])}
                    {this.renderDividers('三、化妆品类')}
                    <div style={{paddingLeft: '2em'}}>{[
                        this.renderCheckers('防晒霜'),
                        this.renderCheckers('润肤膏'),
                        this.renderCheckers('木瓜膏'),
                        this.renderCheckers('发胶'),
                    ]}</div>
                    {this.renderDividers('四、药品类')}
                    <div style={{paddingLeft: '2em'}}>{[
                        this.renderCheckers('止血贴'),
                        this.renderCheckers('达克宁'),
                        this.renderCheckers('眼药水'),
                        this.renderCheckers('百服宁'),
                        this.renderCheckers('先锋六'),
                        this.renderCheckers('镇痛膏'),
                        this.renderCheckers('过敏药'),
                        this.renderCheckers('止泻药'),
                        this.renderCheckers('清凉油'),
                        this.renderCheckers('纱布'),
                        this.renderCheckers('泡腾片'),
                        this.renderCheckers('高原安'),
                        this.renderCheckers('头痛散'),
                        this.renderCheckers('康泰克'),
                        this.renderCheckers('葡萄糖'),
                        this.renderCheckers('丹参滴丸'),
                        this.renderCheckers('小柴胡'),
                    ]}</div>
                    {this.renderDividers('五，重要的')}
                    {this.renderGroups([
                        [
                            this.renderCheckers('手机+充电器'),
                            this.renderCheckers('相机+充电器+储存卡+读卡器+说明书+清洁工具+U盘'),
                            this.renderCheckers('充电宝+充电器'),
                        ],
                        [
                            this.renderCheckers('身份证'),
                            this.renderCheckers('人民币'),
                            this.renderCheckers('信用卡'),
                        ],
                        [
                            this.renderCheckers('羊城通'),
                            this.renderCheckers('锁匙'),
                        ],
                    ])}
                    {this.renderDividers('六、食品类')}
                    <div style={{paddingLeft: '2em'}}>
                        {this.renderCheckers('小压缩饼干')}
                    </div>
                </Modal>
            </>
        )
    }
}

export default AddLuggageModal;