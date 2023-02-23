import { Card, Input, Space, Button, Select } from 'antd';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import qs from 'querystring';

export default function() {

    let navigate = useNavigate();
    let location = useLocation();

    let sstr = location.search;
    if (sstr.startsWith('?')) {
        sstr = sstr.substring(1);
    }
    let sobj = qs.parse(sstr);
    console.debug('sobj', sobj);
    

    return (
        <div className="f-fit-height f-flex-two-side">
            <div>
                <Space>
                    <Select></Select>
                </Space>
            </div>
            <div className="f-flex-1">

            </div>
        </div>
    );
}