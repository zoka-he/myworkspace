import { useState, useRef, useEffect } from 'react';
import fetch from '@/src/fetch';
import { Button, Input, Select, Space, Table, message, Card, Divider, Modal } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';

import { IWorldViewData, IGeoStarSystemData, IGeoStarData, IGeoPlanetData, IGeoSatelliteData, IGeoGeographyUnitData } from '@/src/types/IAiNoval';
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

const { Column } = Table;

const LEFT_PANEL_WIDTH = 400; // 左侧面板宽度，必须大于320

export default function GeoManage() {

    let [worldViewList, updateWorldViewList] = useState<IWorldViewData[]>([]);
    let [worldViewId, updateWorldViewId] = useState<null | number>(null);
    let [updateTimestamp, setUpdateTimestamp] = useState(0);


    let [treeRaisedObject, setTreeRaisedObject] = useState<IGeoTreeItem<IGeoStarSystemData & IGeoStarData & IGeoPlanetData & IGeoSatelliteData & IGeoGeographyUnitData> | null>(null);

    let [panelRaisedObject, setPanelRaisedObject] = useState<IGeoTreeItem<IGeoStarSystemData & IGeoStarData & IGeoPlanetData & IGeoSatelliteData & IGeoGeographyUnitData> | null>(null);

    let starSystemEditRef = useRef<StarSystemEdit>(null);
    let starEditRef = useRef<StarEdit>(null);
    let planetEditRef = useRef<PlanetEdit>(null);
    let satelliteEditRef = useRef<SatelliteEdit>(null);
    let geographyUnitEditRef = useRef<GeographyUnitEdit>(null);

    let [delConfirmModal, delConfirmModalContextHolder] = Modal.useModal();

    /**
     * 更新世界观列表
     */
    async function updateWorldViews() {
        let resp = await fetch.get('/api/aiNoval/worldView/list', { params: { page: 1, limit: 100 } });

        let data: IWorldViewData[] = [];
        let count = 0;

        if (resp && resp.data && resp.data.length > 0) {
            data = resp.data;
        }

        count = (resp as { count?: number })?.count || 0;


        updateWorldViewList(data);
        if (count > 100) {
            message.error('世界观数量超出正常需求，请检查数据状态！');
        } else {
            message.info(`更新完毕，世界观数量：${count}`);
        }

        if (data.length > 0) {
            updateWorldViewId(data[0].id || null);
        }

        setUpdateTimestamp(Date.now());
    }

    /**
     * 初始化
     */
    useEffect(() => {
        updateWorldViews();
    }, []);


    function confirmAndDelete(title: string, objName: string, callback: () => void) {
        delConfirmModal.confirm({
            title,
            icon: <ExclamationCircleFilled />,
            content: `是否删除 ${objName}？`,
            okText: '删除',
            cancelText: '取消',
            okButtonProps: { danger: true, type: 'default' },
            cancelButtonProps: { type: 'primary' },
            onCancel: () => { message.info('已取消删除操作'); },
            onOk: callback,
        });
    }


    function treeAddStarSystem() {
        if (starSystemEditRef.current) {
            starSystemEditRef.current.showAndEdit({
                worldview_id: worldViewId,
            });
        }
    }

    function panelEditStarSystem(data: IGeoStarSystemData) {
        if (starSystemEditRef.current) {
            starSystemEditRef.current.showAndEdit(data);
        }
    }

    function panelDeleteStarSystem(data: IGeoStarSystemData) {
        const title = '删除太阳系';
        const objectName = (data?.name || '无名太阳系') + (data?.code ? `(${data?.code})` : '');
        confirmAndDelete(title, objectName, async () => {
            await deleteStarSystem(data);
            message.info('已删除' + objectName);
            resetAll();
        });
    }   

    /**
     * 添加恒星
     */
    function panelAddStar(data: IGeoStarSystemData) {
        if (starEditRef.current) {
            starEditRef.current.showAndEdit({
                worldview_id: worldViewId,
                star_system_id: data?.id || null,
            });
        }
    }

    function panelEditStar(data: IGeoStarData) {
        if (starEditRef.current) {
            starEditRef.current.showAndEdit(data);
        }
    }

    function panelDeleteStar(data: IGeoStarData) {
        const title = '删除恒星';
        const objectName = (data?.name || '无名恒星') + (data?.code ? `(${data?.code})` : '');
        confirmAndDelete(title, objectName, async () => {
            await deleteStar(data);
            message.info('已删除' + objectName);
            resetAll();
        });
    }

    /**
     * 添加行星
     */
    function panelAddPlanet(data: IGeoStarSystemData) {
        if (planetEditRef.current) {
            planetEditRef.current.showAndEdit({
                worldview_id: worldViewId,
                star_system_id: data?.id || null,
            });
        }
    }

    function panelEditPlanet(data: IGeoPlanetData) {
        if (planetEditRef.current) {
            planetEditRef.current.showAndEdit(data);
        }
    }

    function panelDeletePlanet(data: IGeoPlanetData) {
        const title = '删除行星';
        const objectName = (data?.name || '无名行星') + (data?.code ? `(${data?.code})` : '');
        confirmAndDelete(title, objectName, async () => {
            await deletePlanet(data);
            message.info('已删除' + objectName);
            resetAll();
        });
    }

    function panelAddSatellite(data: IGeoPlanetData) {
        if (satelliteEditRef.current) {
            satelliteEditRef.current.showAndEdit({
                worldview_id: worldViewId,
                star_system_id: data?.star_system_id || null,
                planet_id: data?.id || null,
            });
        }
    }

    function panelEditSatellite(data: IGeoSatelliteData) {
        if (satelliteEditRef.current) {
            satelliteEditRef.current.showAndEdit(data);
        }
    }

    function panelDeleteSatellite(data: IGeoSatelliteData) {
        const title = '删除卫星';
        const objectName = (data?.name || '无名卫星') + (data?.code ? `(${data?.code})` : '');
        confirmAndDelete(title, objectName, async () => {
            await deleteSatellite(data);
            message.info('已删除' + objectName);
            resetAll();
        });
    }

    function panelAddGeographicUnit(data: IGeoPlanetData & IGeoSatelliteData & IGeoGeographyUnitData) { 

        let planet_id: number | null = null;
        let satellite_id: number | null = null;

        switch (data?.parent_type) {
            case 'planet':
                planet_id = data?.id || null;
                break;

            case 'satellite':
                planet_id = data?.planet_id || null;
                satellite_id = data?.id || null;
                break;
        }

        if (geographyUnitEditRef.current) {
            geographyUnitEditRef.current.showAndEdit({
                worldview_id: worldViewId,
                star_system_id: data?.star_system_id || null,
                planet_id,
                satellite_id,
                parent_id: data?.id || null,
                parent_type: data?.parent_type || null,
            });
        }
    }

    function panelEditGeographicUnit(data: IGeoGeographyUnitData) {
        if (geographyUnitEditRef.current) {
            geographyUnitEditRef.current.showAndEdit(data);
        }
    }

    function panelDeleteGeographicUnit(data: IGeoGeographyUnitData) {
        console.debug('panelDeleteGeographicUnit', data);

        const title = '删除地理单元';
        const objectName = (data?.name || '无名地理单元') + (data?.code ? `(${data?.code})` : '');
        confirmAndDelete(title, objectName, async () => {
            await deleteGeographicUnit(data);
            message.info('已删除' + objectName);
            resetAll();
        });
    }

    function resetAll() {
        setUpdateTimestamp(Date.now());
        setTreeRaisedObject(null);
    }

    // 主渲染逻辑 -----------------------------------------------------------

    let starSystemId: number | null | undefined = null;
    let mainPanel = null;

    if (!treeRaisedObject) {
        mainPanel = <p>未选取对象！</p>
    } else {

        mainPanel = [];
        
        // 提取关键信息
        switch (treeRaisedObject?.dataType) {
            case 'starSystem': 
                starSystemId = treeRaisedObject?.data?.id;
                mainPanel.push(
                    <StarSystemPanel 
                        worldViewId={worldViewId} 
                        updateTimestamp={updateTimestamp} 
                        node={treeRaisedObject} 
                        raiseAddStar={(data: IGeoStarSystemData) => panelAddStar({ ...data })}
                        raiseAddPlanet={(data: IGeoStarSystemData) => panelAddPlanet({ ...data })}
                        raiseEditStarSystem={(data: IGeoStarSystemData) => panelEditStarSystem({ ...data })}
                        raiseDeleteStarSystem={(data: IGeoStarSystemData) => panelDeleteStarSystem({ ...data })}
                    />
                );
                break;
            
            // 恒星面板
            case 'star':
                starSystemId = treeRaisedObject?.data?.star_system_id;
                mainPanel.push(
                    <StarPanel 
                        worldViewId={worldViewId} 
                        updateTimestamp={updateTimestamp} 
                        node={treeRaisedObject} 
                        raiseEditStar={(data => panelEditStar({ ...data }))}
                        raiseDeleteStar={(data => panelDeleteStar({ ...data }))}
                    />
                );
                break;

            // 行星面板
            case 'planet':
                starSystemId = treeRaisedObject?.data?.star_system_id;
                mainPanel.push(
                    <PlanetPanel 
                        worldViewId={worldViewId} 
                        updateTimestamp={updateTimestamp} 
                        node={treeRaisedObject} 
                        raiseAddSatellite={(data: IGeoPlanetData) => panelAddSatellite({ ...data })}
                        raiseAddGeographicUnit={(data: IGeoPlanetData) => panelAddGeographicUnit({ ...data, parent_type: 'planet' })}
                        raiseEditPlanet={(data => panelEditPlanet({ ...data }))}
                        raiseDeletePlanet={(data => panelDeletePlanet({ ...data }))}
                    />
                );
                break;    

            // 卫星面板
            case 'satellite':
                starSystemId = treeRaisedObject?.data?.star_system_id;
                mainPanel.push(
                    <SatellitePanel 
                        worldViewId={worldViewId} 
                        updateTimestamp={updateTimestamp} 
                        node={treeRaisedObject} 
                        raiseAddGeographicUnit={(data: IGeoSatelliteData) => panelAddGeographicUnit({ ...data, parent_type: 'satellite' })}
                        raiseEditSatellite={(data => panelEditSatellite({ ...data }))}
                        raiseDeleteSatellite={(data => panelDeleteSatellite({ ...data }))}
                    />
                );
                break;    

            // 地理单元面板
            case 'geographicUnit':
                starSystemId = treeRaisedObject?.data?.star_system_id;
                mainPanel.push(
                    <GeographicUnitPanel
                        worldViewId={worldViewId} 
                        updateTimestamp={updateTimestamp} 
                        node={treeRaisedObject} 
                        raiseAddGeographicUnit={(data: IGeoGeographyUnitData) => panelAddGeographicUnit({ ...data, parent_type: 'geographicUnit' })}
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
        <div style={{ display: 'flex', height: '100%' }}>
            <div style={{ width: LEFT_PANEL_WIDTH, height: '100%', padding: '0 0 10px 0' }}>
                {/* 左面板卡片 */}
                <Card
                    className='f-fit-height'
                    size="small"
                    title={(
                        <Space>
                        <label>世界观：</label>
                        <Select style={{ width: LEFT_PANEL_WIDTH - 150 }} value={worldViewId} onChange={e => updateWorldViewId(e)} size="small">
                            {worldViewList.map((item, index) => {
                                return (
                                    <Select.Option key={index} value={item.id}>
                                        {item.title}
                                    </Select.Option>
                                )
                            })}
                        </Select>
                        <Button type={'primary'} onClick={e => updateWorldViews()} size="small">刷新</Button>
                        </Space>
                    )}
                >
                    <div className='f-fit-height f-overflow-auto'>
                        {/* 世界观地理对象树 */}
                        <Button style={{ width: '100%' }} size='small' onClick={treeAddStarSystem}>添加星系</Button>
                        <GeoTree worldViewId={worldViewId} updateTimestamp={updateTimestamp} onRaiseObject={obj => setTreeRaisedObject(obj)}/>
                    </div>
                </Card>
            </div>
            <div style={{ flex: 1, height: '100%', padding: '0 0 10px 10px' }}>
                {/* 右面板卡片 */}
                <Card
                    className='f-fit-height'
                    size="small"
                    title={<strong>地理设定管理</strong>}
                >
                    {mainPanel}
                </Card>
                
            </div>

            <StarSystemEdit ref={starSystemEditRef} onFinish={() => resetAll()}/>
            <StarEdit ref={starEditRef} onFinish={() => resetAll()}/>
            <PlanetEdit ref={planetEditRef} onFinish={() => resetAll()}/>
            <SatelliteEdit ref={satelliteEditRef} onFinish={() => resetAll()}/>
            <GeographyUnitEdit ref={geographyUnitEditRef} onFinish={() => resetAll()}/>

            {delConfirmModalContextHolder}
        </div>
    )

}