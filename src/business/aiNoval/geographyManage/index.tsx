import { useMemo, useState } from 'react';
import { Button, Select, Space, message, Card, Radio } from 'antd';

import { IGeoStarSystemData, IGeoPlanetData, IGeoSatelliteData, IGeoGeographyUnitData } from '@/src/types/IAiNoval';
import GeoTree, { type IGeoTreeItem } from './geoTree';
import StarSystemPanel from './panel/starSystemPanel';
import StarPanel from './panel/starPanel';
import PlanetPanel from './panel/planetPanel';
import SatellitePanel from './panel/satellitePanel';
import GeographicUnitPanel from './panel/geographicUnitPanel';

import GeoDataProvider from './GeoDataProvider';
import SimpleWorldviewProvider, { useSimpleWorldviewContext } from '../common/SimpleWorldviewProvider';
import ManageStateProvider, { useManageState } from './ManageStateProvider';
import SimpleFactionProvider from '../common/SimpleFactionProvider';
import EditProvider from './edit/EditProvider';

import { useEditContext } from './edit/EditProvider';
import AreaCoefPanel from './panel/AreaCoefPanel';

const LEFT_PANEL_WIDTH = 400; // 左侧面板宽度，必须大于320

export default function GeoManage() {

    // 主渲染逻辑 -----------------------------------------------------------

    return (
        <SimpleWorldviewProvider>
            <GeoDataProvider>
            <SimpleFactionProvider>
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
            </SimpleFactionProvider>
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
    const [activePanel, setActivePanel] = useState('manage');

    const title = (
        <Radio.Group value={activePanel} onChange={e => setActivePanel(e.target.value)} size="small" buttonStyle="solid" optionType="button">
            <Radio.Button value="manage">地理设定管理</Radio.Button>
            <Radio.Button value="areas">疆域设定</Radio.Button>
            {/* <Radio.Button value="faction_bind">阵营绑定</Radio.Button> */}
        </Radio.Group>
    )

    let Content = <p>开发中...敬请期待.</p>;
    if (activePanel === 'manage') {
        Content = <RightPanelContentOfManage/>;
    } else if (activePanel === 'areas') {
        Content = <AreaCoefPanel/>;
    }

    return (
        <Card
            className='f-fit-height'
            size="small"
            title={title}
        >
            {Content}
        </Card>
    )
}

function RightPanelContentOfManage() {
    const { state: manageState } = useManageState();
    const { treeRaisedObject } = manageState;

    const { 
        panelAddStarSystem,
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

        mainPanel = <></>;
        
        // 提取关键信息
        switch (treeRaisedObject?.dataType) {
            case 'starSystem': 
                // starSystemId = treeRaisedObject?.data?.id;
                mainPanel = (
                    <StarSystemPanel 
                        raiseAddStarSystem={(data: IGeoStarSystemData) => panelAddStarSystem({ ...data })}
                        raiseAddStar={(data: IGeoStarSystemData) => panelAddStar({ ...data })}
                        raiseAddPlanet={(data: IGeoStarSystemData) => panelAddPlanet({ ...data })}
                        raiseEditStarSystem={(data: IGeoStarSystemData) => panelEditStarSystem({ ...data })}
                        raiseDeleteStarSystem={(data: IGeoStarSystemData) => panelDeleteStarSystem({ ...data })}
                    />
                );
                break;
            
            // 恒星面板
            case 'star':
                mainPanel = (
                    <StarPanel 
                        raiseEditStar={(data => panelEditStar({ ...data }))}
                        raiseDeleteStar={(data => panelDeleteStar({ ...data }))}
                    />
                );
                break;

            // 行星面板
            case 'planet':
                mainPanel = (
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
                mainPanel = (
                    <SatellitePanel 
                        raiseAddGeographicUnit={(data: IGeoSatelliteData) => panelAddGeographicUnit({ ...data, parent_type: 'satellite' })}
                        raiseEditSatellite={(data => panelEditSatellite({ ...data }))}
                        raiseDeleteSatellite={(data => panelDeleteSatellite({ ...data }))}
                    />
                );
                break;    

            // 地理单元面板
            case 'geoUnit':
                mainPanel = (
                    <GeographicUnitPanel
                        raiseAddGeographicUnit={(data: IGeoGeographyUnitData) => panelAddGeographicUnit({ ...data, parent_type: 'geoUnit' })}
                        raiseEditGeographicUnit={(data => panelEditGeographicUnit({ ...data }))}
                        raiseDeleteGeographicUnit={(data => panelDeleteGeographicUnit({ ...data }))}
                    />
                );
                break;

            default: 
                mainPanel = (<p>未知对象类型：{ treeRaisedObject?.dataType }</p>);
        }
    }


    return mainPanel;
}

