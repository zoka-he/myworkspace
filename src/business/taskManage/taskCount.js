import React, {useEffect, useState} from "react";
import {Button, Input, Space, Table} from "antd";
import {SearchOutlined} from "@ant-design/icons";
import _ from 'lodash';
import TaskService from './taskService';

const { Column } = Table;

export default function () {

    let [listData, updateListData] = useState([]);
    let [spinning, updateSpinning] = useState(false);
    let [queryEmployee, updateQueryEmployee] = useState('');


    async function onQuery() {
        try {
            updateSpinning(true);
            let queryObject = {};

            if (queryEmployee) {
                queryObject.employee = { $like: `%${queryEmployee}%` };
            }


            let service = new TaskService();
            let data = await service.getTaskCount();

            updateListData(data);

        } catch (e) {
            console.error(e);
        } finally {
            updateSpinning(false);
            console.debug(listData);
        }

    }


    useEffect(() => {
        console.debug('useEffect');
        onQuery();
    }, []);

    useEffect(() => {
        _.debounce(onQuery, 300)();
    }, [queryEmployee]);

    function renderCount(num) {
        if (num > 0) {
            return <span className="f-bold">{num}</span>
        } else {
            return <span className="f-silver">{num}</span>
        }
    }



    function renderTableSummary() {
        function sumOfCol(colName) {
            let sum = 0;
            listData.forEach(item => {
                if (typeof item[colName] === 'number') {
                    sum += item[colName];
                }
            });
            return sum;
        }

        return (
            <Table.Summary.Row>
                <Table.Summary.Cell index={0}>统计</Table.Summary.Cell>
                <Table.Summary.Cell index={1}>{sumOfCol('unfinished')}</Table.Summary.Cell>
                <Table.Summary.Cell index={2}>{sumOfCol('not_started')}</Table.Summary.Cell>
                <Table.Summary.Cell index={3}>{sumOfCol('developing')}</Table.Summary.Cell>
                <Table.Summary.Cell index={4}>{sumOfCol('testing')}</Table.Summary.Cell>
                <Table.Summary.Cell index={5}>{sumOfCol('fuckable')}</Table.Summary.Cell>
                <Table.Summary.Cell index={6}>{sumOfCol('finished')}</Table.Summary.Cell>
                <Table.Summary.Cell index={7}>{sumOfCol('closed')}</Table.Summary.Cell>
                <Table.Summary.Cell index={8}>{sumOfCol('total')}</Table.Summary.Cell>
            </Table.Summary.Row>
        );
    }

    return (
        <div className="f-fit-height f-flex-col">
            {/*<div className="f-flex-two-side">*/}
            {/*    <Space>*/}
            {/*        <label>承接人：</label>*/}
            {/*        <Input value={queryEmployee} onInput={e => updateQueryEmployee(e.target.value)}/>*/}

            {/*        <Button icon={<SearchOutlined/>} type="primary" onClick={onQuery} loading={spinning}>查询</Button>*/}
            {/*    </Space>*/}

            {/*</div>*/}


            <div className="f-flex-1" style={{ margin: '12px 0' }}>
                <Table dataSource={listData} size={'small'} summary={renderTableSummary} pagination={{ pageSize: 100 }}>
                    <Column title="承接人" dataIndex="employee" key="employee"/>
                    <Column title="进行中合计" dataIndex="unfinished" key="unfinished" render={renderCount}/>
                    <Column title="未开始" dataIndex="not_started" key="not_started" render={renderCount}/>
                    <Column title="开发中" dataIndex="developing" key="developing" render={renderCount}/>
                    <Column title="测试中" dataIndex="testing" key="testing" render={renderCount}/>
                    <Column title="待上线" dataIndex="fuckable" key="fuckable" render={renderCount}/>
                    <Column title="已完成" dataIndex="finished" key="finished" render={renderCount}/>
                    <Column title="已关闭" dataIndex="closed" key="closed" render={renderCount}/>
                    <Column title="合计" dataIndex="total" key="total" render={renderCount}/>
                </Table>
            </div>
        </div>
    )
}