import { useState } from 'react';
import { Card, Input, Space, Tree } from 'antd';
import { DataNode } from 'antd/es/tree';
import GeoCoder from '@/src/utils/geo/GeoCoder';

let provinces = GeoCoder.getCodes();

// TODO 增加计划书分类树
export default function(props: any) {

    function getTreeData() {
        let data: DataNode[] = [];

        data.push({
            title: '全部',
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
            width: '200px'
        }
    }

    function getSpacerStyle() {
        return {
            paddingBottom: '13px'
        }
    }

    return (
        <div className='f-flex-col' style={getWrapperStyle()}>
            <div style={getSpacerStyle()}>
                <Input className="f-fit-width"></Input>
            </div>
            <Card className='f-fit-height f-overflow-auto'>
                <Tree treeData={getTreeData()}/>
            </Card>
        </div>
    );
}