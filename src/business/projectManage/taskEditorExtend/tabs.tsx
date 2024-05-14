import { Tabs } from "antd";
import BibiList from "./bibiList";
import ProblemList from "./problemList";

export default function ModalTabs(props: any = {}) {

    let tabs = [
        {
            key: '1',
            label: `问题`,
            children: <ProblemList {...props}></ProblemList>,
        },
        {
            key: '2',
            label: `沟通历史`,
            children: <BibiList {...props}></BibiList>,
        },
    ];

    return (
        <div className="l-with-tabs-on-top">
            <Tabs items={tabs} defaultActiveKey="1">
                
            </Tabs>
        </div>
    )
}