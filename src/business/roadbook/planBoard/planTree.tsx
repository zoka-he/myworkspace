import { useState } from 'react';
import { Card, Input, Space, Tree } from 'antd';
import { DataNode } from 'antd/es/tree';
import GeoCoder from '@/src/utils/geo/GeoCoder';

let provinces = GeoCoder.getCodes();


interface IPlanTreeProps {
    onChange?: Function
}

// TODO 增加计划书分类树
export default function(props: IPlanTreeProps) {

    let [checkedKeys, setCheckedKeys] = useState<React.Key[]>(['0']);

    function getTreeData() {
        let data: DataNode[] = [];
        

        data.push({
            title: '全国',
            key: '0',
        });

        // 省份
        data.push({
            title: '省份',
            key: '1',
            children: provinces.map(item => {
                return {
                    title: item.label,
                    key: item.code
                }
            })
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