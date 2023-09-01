import { Modal, Form, DatePicker, InputNumber, Select, Input, Divider, Checkbox } from "antd";
import React, { useEffect, useState } from "react";


interface AddLuggageModalProps {

}

function LuggageChecklist(props: AddLuggageModalProps) {

    let [luggageList, setLuggageList] = useState<string[]>([]);

    useEffect(() => {
        try {
            let parseLocal = JSON.parse(localStorage['MYWORKSPACE-LUGGAGECHECKLIST']);
            if (parseLocal instanceof Array) {
                setLuggageList(parseLocal);
            }
        } catch(e) {
            console.error(e);
            localStorage['MYWORKSPACE-LUGGAGECHECKLIST'] = '[]';
        }
    }, []);

    useEffect(() => {
        localStorage['MYWORKSPACE-LUGGAGECHECKLIST'] = JSON.stringify(luggageList);
    }, [luggageList]);

    function toggleLuggage(s: string, addOrRm: boolean) {
        if (addOrRm) { // add
            setLuggageList([...(luggageList || []), s])
        } else {
            setLuggageList(luggageList?.filter(item => item != s) || [])
        }
    }

    function renderCheckers(context: string) {
        let value = luggageList?.includes(context) || false;
        return <Checkbox checked={value} onChange={() => toggleLuggage(context, !value)}>{context}</Checkbox>;
    }

    function renderDividers(context: string) {
        return <Divider orientation="left" orientationMargin="0">{context}</Divider>;
    }

    function renderGroups(children: any[]) {
        let wrappedChildren = children.map(item => <li>{item}</li>)

        return (
            <ul style={{ listStyle: 'decimal' }}>{wrappedChildren}</ul>
        )
    }



    return (
        <div>
            {renderDividers('一、衣服类')}
            {renderGroups([
                [
                    <span>冬衣：</span>,
                    renderCheckers('羽绒衣'),
                    renderCheckers('冲锋衣'),
                    renderCheckers('外套'),
                    renderCheckers('束能裤'),
                    renderCheckers('手套'),
                    renderCheckers('护膝')
                ],
                [
                    <span>四季衣：</span>,
                    renderCheckers('衬衣'),
                    renderCheckers('长裤'),
                    renderCheckers('颈套'),
                ],
                [
                    <span>内衣：</span>,
                    renderCheckers('睡衣'),
                    renderCheckers('内裤'),
                    renderCheckers('袜子'),
                ],
                [
                    <span>鞋类：</span>,
                    renderCheckers('运动鞋'),
                    renderCheckers('拖鞋'),
                    renderCheckers('鞋袋'),
                ],
            ])}
            {renderDividers('二、日用品类')}
            {renderGroups([
                [
                    renderCheckers('速干毛巾'),
                    renderCheckers('梳'),
                    renderCheckers('牙膏'),
                    renderCheckers('牙刷'),
                    renderCheckers('香皂'),
                    renderCheckers('打泡网'),
                    renderCheckers('洗头水'),
                    renderCheckers('硅胶漱口杯'),
                    renderCheckers('纸巾'),
                    renderCheckers('马桶垫'),
                    renderCheckers('棉签'),
                ],
                [
                    renderCheckers('太阳镜'),
                    renderCheckers('太阳帽'),
                    renderCheckers('雨衣'),
                    renderCheckers('气枕'),
                ],
                [
                    renderCheckers('纸笔'),
                    renderCheckers('电筒'),
                    renderCheckers('指甲钳'),
                    renderCheckers('小刀'),
                    renderCheckers('剪刀'),
                    renderCheckers('小魔方插座'),
                    renderCheckers('挂扣'),
                    renderCheckers('防丢绳'),
                ],
                [
                    renderCheckers('晾衣绳'),
                    renderCheckers('长尾夹'),
                    renderCheckers('折叠衣'),
                    renderCheckers('晾衣固定架'),
                    renderCheckers('烘干衣机'),
                ],
                [
                    renderCheckers('水瓶'),
                    renderCheckers('保温杯'),
                ],
                [
                    renderCheckers('拉杆箱'),
                    renderCheckers('背包'),
                    renderCheckers('腰包'),
                    renderCheckers('旅途随车用品收纳袋'),
                    renderCheckers('手机袋'),
                ],
            ])}
            {renderDividers('三、化妆品类')}
            <div style={{paddingLeft: '2em'}}>{[
                renderCheckers('防晒霜'),
                renderCheckers('润肤膏'),
                renderCheckers('木瓜膏'),
                renderCheckers('发胶'),
            ]}</div>
            {renderDividers('四、药品类')}
            <div style={{paddingLeft: '2em'}}>{[
                renderCheckers('止血贴'),
                renderCheckers('达克宁'),
                renderCheckers('眼药水'),
                renderCheckers('百服宁'),
                renderCheckers('先锋六'),
                renderCheckers('镇痛膏'),
                renderCheckers('过敏药'),
                renderCheckers('止泻药'),
                renderCheckers('清凉油'),
                renderCheckers('纱布'),
                renderCheckers('泡腾片'),
                renderCheckers('高原安'),
                renderCheckers('头痛散'),
                renderCheckers('康泰克'),
                renderCheckers('葡萄糖'),
                renderCheckers('丹参滴丸'),
                renderCheckers('小柴胡'),
            ]}</div>
            {renderDividers('五，重要的')}
            {renderGroups([
                [
                    renderCheckers('手机+充电器'),
                    renderCheckers('相机+充电器+储存卡+读卡器+说明书+清洁工具+U盘'),
                    renderCheckers('充电宝+充电器'),
                ],
                [
                    renderCheckers('身份证'),
                    renderCheckers('人民币'),
                    renderCheckers('信用卡'),
                ],
                [
                    renderCheckers('羊城通'),
                    renderCheckers('锁匙'),
                ],
            ])}
            {renderDividers('六、食品类')}
            <div style={{paddingLeft: '2em'}}>
                {renderCheckers('小压缩饼干')}
            </div>

        </div>
    )
}

export default LuggageChecklist;