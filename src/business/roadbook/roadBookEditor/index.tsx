import { Card, Input, Space, Button, Select } from 'antd';
import { useState } from 'react';

export default function() {
    return (
        <div className="f-fit-height f-flex-col">
            <div className='f-flex-two-side'>
                <Space>
                    <Select></Select>
                    <Button type='primary'>保存</Button>
                </Space>
            </div>
            <div className="f-flex-1" style={{ margin: '12px 0' }}>

            </div>
        </div>
    );
}