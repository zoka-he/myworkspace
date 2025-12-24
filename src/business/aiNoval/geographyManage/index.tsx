import { useState, useRef, useEffect, useMemo } from 'react';
import fetch from '@/src/fetch';
import { Button, Input, Select, Space, Table, message, Card, Divider, Modal } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';

import { IWorldViewData, IGeoStarSystemData, IGeoStarData, IGeoPlanetData, IGeoSatelliteData, IGeoGeographyUnitData, IGeoUnionData } from '@/src/types/IAiNoval';
import GeoTree, { type IGeoTreeItem } from './geoTree';
import StarSystemEdit from './edit/starSystemEdit';
import StarSystemPanel from './panel/starSystemPanel';
import StarPanel from './panel/starPanel';
import PlanetPanel from './panel/planetPanel';
import SatellitePanel from './panel/satellitePanel';
import GeographicUnitPanel from './panel/geographicUnitPanel';

import StarEdit from './edit/starEdit';
import PlanetEdit from './edit/planetEdit';
import SatelliteEdit from './edit/satelliteEdit';
import GeographyUnitEdit from './edit/geographyUnitEdit';
import { deleteGeographicUnit, deletePlanet, deleteSatellite, deleteStar, deleteStarSystem } from './remove';
import GeoDataProvider from './GeoDataProvider';
import SimpleWorldviewProvider, { useSimpleWorldviewContext } from '../common/SimpleWorldviewProvider';
import ManageStateProvider, { useManageState } from './ManageStateProvider';
import EditProvider from './edit/EditProvider';

import { useEditContext } from './edit/EditProvider';

const { Column } = Table;

const LEFT_PANEL_WIDTH = 400; // 左侧面板宽度，必须大于320

export default function GeoManage() {

    // 主渲染逻辑 -----------------------------------------------------------

    return (
        <SimpleWorldviewProvider>
            <GeoDataProvider>
                <ManageStateProvider>
                    <EditProvider>
                        <div style={{ display: 'flex', height: '100%' }}>
                            <div style={{ width: LEFT_PANEL_WIDTH, height: '100%', padding: '0 0 10px 0' }}>
                                {/* 左面板卡片 */}
                                <LeftPanel/>
                            </div>
                            <div style={{ flex: 1, height: '100%', padding: '0 0 10px 10px' }}>
                                {/* 右面板卡片 */}
                                <RightPanel/>
                                
                            </div>
                        </div>
                    </EditProvider>
                </ManageStateProvider>
            </GeoDataProvider>
        </SimpleWorldviewProvider>
    )

}


interface LeftPanelProps {
}

function LeftPanel(prop: LeftPanelProps) {
    const { state: worldviewState, setWorldviewId, loadWorldviews } = useSimpleWorldviewContext();

    const { treeAddStarSystem } = useEditContext();

    const worldViewOptions = useMemo(() => {
        return worldviewState.worldviewList.map(item => {
            return (
                <Select.Option key={item.id} value={item.id}>
                    {item.title}
                </Select.Option>
            )
        })
    }, [worldviewState.worldviewList]);

    function handleAddStarSystem() {
        if (!worldviewState?.worldviewId) {
            message.error('请先选择世界观');
            return;
        }
        treeAddStarSystem();
    }

    return (
        <Card
            className='f-fit-height'
            size="small"
            title={(
                <Space>
                <label>世界观：</label>
                <Select style={{ width: LEFT_PANEL_WIDTH - 150 }} value={worldviewState.worldviewId} onChange={e => setWorldviewId(e)} size="small">
                    {worldViewOptions}
                </Select>
                <Button type={'primary'} onClick={e => loadWorldviews()} size="small">刷新</Button>
                </Space>
            )}
        >
            <div className='f-fit-height f-overflow-auto'>
                {/* 世界观地理对象树 */}
                <Button style={{ width: '100%' }} size='small' onClick={() => handleAddStarSystem()}>添加星系</Button>
                <GeoTree />
            </div>
        </Card>
    )
}

interface RightPanelProps {
    
}

function RightPanel(prop: RightPanelProps) {
    const { state: manageState } = useManageState();
    const { treeRaisedObject } = manageState;

    const { 
        panelAddStar, 
        panelAddPlanet, 
        panelAddSatellite, 
        panelAddGeographicUnit, 
        panelEditStarSystem, 
        panelEditStar, 
        panelEditPlanet, 
        panelEditSatellite, 
        panelEditGeographicUnit, 
        panelDeleteStarSystem, 
        panelDeleteStar, 
        panelDeletePlanet, 
        panelDeleteSatellite, 
        panelDeleteGeographicUnit,
    } = useEditContext();

    let mainPanel = null;

    if (!treeRaisedObject) {
        mainPanel = <p>未选取对象！</p>
    } else {

        mainPanel = [];
        
        // 提取关键信息
        switch (treeRaisedObject?.dataType) {
            case 'starSystem': 
                // starSystemId = treeRaisedObject?.data?.id;
                mainPanel.push(
                    <StarSystemPanel 
                        raiseAddStar={(data: IGeoStarSystemData) => panelAddStar({ ...data })}
                        raiseAddPlanet={(data: IGeoStarSystemData) => panelAddPlanet({ ...data })}
                        raiseEditStarSystem={(data: IGeoStarSystemData) => panelEditStarSystem({ ...data })}
                        raiseDeleteStarSystem={(data: IGeoStarSystemData) => panelDeleteStarSystem({ ...data })}
                    />
                );
                break;
            
            // 恒星面板
            case 'star':
                mainPanel.push(
                    <StarPanel 
                        raiseEditStar={(data => panelEditStar({ ...data }))}
                        raiseDeleteStar={(data => panelDeleteStar({ ...data }))}
                    />
                );
                break;

            // 行星面板
            case 'planet':
                mainPanel.push(
                    <PlanetPanel 
                        raiseAddSatellite={(data: IGeoPlanetData) => panelAddSatellite({ ...data })}
                        raiseAddGeographicUnit={(data: IGeoPlanetData) => panelAddGeographicUnit({ ...data, parent_type: 'planet' })}
                        raiseEditPlanet={(data => panelEditPlanet({ ...data }))}
                        raiseDeletePlanet={(data => panelDeletePlanet({ ...data }))}
                    />
                );
                break;    

            // 卫星面板
            case 'satellite':
                mainPanel.push(
                    <SatellitePanel 
                        raiseAddGeographicUnit={(data: IGeoSatelliteData) => panelAddGeographicUnit({ ...data, parent_type: 'satellite' })}
                        raiseEditSatellite={(data => panelEditSatellite({ ...data }))}
                        raiseDeleteSatellite={(data => panelDeleteSatellite({ ...data }))}
                    />
                );
                break;    

            // 地理单元面板
            case 'geoUnit':
                mainPanel.push(
                    <GeographicUnitPanel
                        raiseAddGeographicUnit={(data: IGeoGeographyUnitData) => panelAddGeographicUnit({ ...data, parent_type: 'geoUnit' })}
                        raiseEditGeographicUnit={(data => panelEditGeographicUnit({ ...data }))}
                        raiseDeleteGeographicUnit={(data => panelDeleteGeographicUnit({ ...data }))}
                    />
                );
                break;

            default: 
                mainPanel.push(<p>未知对象类型：{ treeRaisedObject?.dataType }</p>);
        }
    }


    return (
        <Card
            className='f-fit-height'
            size="small"
            title={<strong>地理设定管理</strong>}
        >
            {mainPanel}
        </Card>
    )
}

