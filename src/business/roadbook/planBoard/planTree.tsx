import { useState } from 'react';
import { Card, Input, Space, Tree } from 'antd';
import { DataNode } from 'antd/es/tree';
import GeoCoder from '@/src/utils/geo/GeoCoder';

let provinces = GeoCoder.getCodes();


interface IPlanTreeProps {
    onChange?: Function,
    taskList?: any[]
}


export default function(props: IPlanTreeProps) {

    let [checkedKeys, setCheckedKeys] = useState<React.Key[]>(['0']);

    function countOptionsRef() {
        if (!props?.taskList?.length) {
            return {};
        }

        let counter: { [key: string]: number } = {};
        for (let item of props.taskList) {
            if (!item?.provinces?.length) {
                continue;
            }

            for (let province_id of item.provinces) {
                if (typeof counter[province_id] === 'number') {
                    counter[province_id] += 1;
                } else {
                    counter[province_id] = 1;
                }
            }
        }

        return counter;
    }

    let optionsCount = countOptionsRef();

    function getOptionCount(province_id: string) {
        if (typeof optionsCount[province_id] === 'number') {
            return optionsCount[province_id];
        } else {
            return 0;
        }
    }

    function getTreeData() {
        let data: DataNode[] = [];
        

        data.push({
            title: '全国',
            key: '0',
        });

        let provinceOptions = provinces.map(item => {
            let title = item.label;
            let count = getOptionCount(item.code);
            if (count) {
                title += '(' + count + ')';
            }

            let leaf: { [key: string]: any } = {
                title,
                key: item.code,
                _count: count
            };

            if (props?.taskList?.length > 0 && count === 0) {
                leaf.disableCheckbox = true;
            }

            return leaf;
        });

        provinceOptions.sort((a, b) => {
            // 先比较 disableCheckbox
            if (a.disableCheckbox && b.disableCheckbox) {
                return 0;
            }

            if (a.disableCheckbox && !b.disableCheckbox) {
                return 1;
            }

            if (!a.disableCheckbox && b.disableCheckbox) {
                return -1;
            }

            // 然后比较 count
            return (b._count || 0) - (a._count || 0);
        })

        // 省份
        data.push({
            title: '省份',
            key: '1',
            checkable: false,
            children: provinceOptions
        });

        return data;
    }

    function getWrapperStyle() {
        return {
            padding: '0 15px 10px 0',
            width: '240px'
        }
    }

    function getSpacerStyle() {
        return {
            paddingBottom: '13px'
        }
    }

    function onCheck(e: React.Key[]) {
        let e2 = [...e];

        if (e.includes('0') && !checkedKeys.includes('0')) {
            e2 = ['0'];
            
        } else {
            let idx = e2.indexOf('0');
            if (idx >= 0) {
                e2.splice(idx, 1);
            }
        }

        setCheckedKeys(e2);

        let emit: React.Key[] = [];
        if (e2.length === 0 || e2[0] === '0') {
            // do nothing
        } else {
            emit = e2;
        }

        props?.onChange && props.onChange(emit);
    }

    

    return (
        <div className='f-flex-col' style={getWrapperStyle()}>
            <div style={getSpacerStyle()}>
                <Input className="f-fit-width"></Input>
            </div>
            <Card className='f-fit-height f-overflow-auto'>
                <Tree 
                    treeData={getTreeData()} 
                    defaultExpandAll 
                    checkable 
                    onCheck={onCheck} 
                    checkedKeys={checkedKeys}
                    blockNode 
                />
            </Card>
        </div>
    );
}