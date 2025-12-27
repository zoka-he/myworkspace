import { Modal, message } from "antd";
import { useRef, useMemo, createContext, useContext } from "react";
import GeographyUnitEdit from "./geographyUnitEdit";
import PlanetEdit from "./planetEdit";
import SatelliteEdit from "./satelliteEdit";
import StarEdit from "./starEdit";
import StarSystemEdit from "./starSystemEdit";
import { ExclamationCircleFilled } from "@ant-design/icons";
import { useSimpleWorldviewContext } from "../../common/SimpleWorldviewProvider";
import { IGeoStarSystemData, IGeoStarData, IGeoPlanetData, IGeoSatelliteData, IGeoGeographyUnitData } from "@/src/types/IAiNoval";
import { deleteStarSystem, deleteStar, deletePlanet, deleteSatellite, deleteGeographicUnit } from "../remove";
import { useGeoData } from "../GeoDataProvider";

const EditContext = createContext<any>(null);

export default function EditProvider({ children }: { children: React.ReactNode }) {

    const { state: worldviewState } = useSimpleWorldviewContext();
    const { refreshGeoData } = useGeoData();

    let starSystemEditRef = useRef<StarSystemEdit>(null);
    let starEditRef = useRef<StarEdit>(null);
    let planetEditRef = useRef<PlanetEdit>(null);
    let satelliteEditRef = useRef<SatelliteEdit>(null);
    let geographyUnitEditRef = useRef<GeographyUnitEdit>(null);
    

    let [delConfirmModal, delConfirmModalContextHolder] = Modal.useModal();

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
        if (!worldviewState.worldviewId) {
            message.error('请先选择世界观');
            return;
        }
        if (starSystemEditRef.current) {
            starSystemEditRef.current.showAndEdit({
                worldview_id: worldviewState.worldviewId,
            });
        }
    }

    function panelAddStarSystem(data: IGeoStarSystemData) {
        if (starSystemEditRef.current) {
            starSystemEditRef.current.showAndEdit({
                worldview_id: worldviewState.worldviewId,
                parent_system_id: data?.id || null,
            });
        }
    }

    function panelEditStarSystem(data: IGeoStarSystemData) {
        if (starSystemEditRef.current) {
            starSystemEditRef.current.showAndEdit(data);
        }
    }

    function panelDeleteStarSystem(data: IGeoStarSystemData) {
        const title = '删除天体系统';
        const objectName = (data?.name || '无名天体系统') + (data?.code ? `(${data?.code})` : '');
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
                worldview_id: worldviewState.worldviewId,
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
                worldview_id: worldviewState.worldviewId,
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
                worldview_id: worldviewState.worldviewId,
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
                worldview_id: worldviewState.worldviewId,
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
        refreshGeoData();
    }

    const providerValue = useMemo(() => ({
        treeAddStarSystem,
        panelAddStarSystem,
        panelEditStarSystem,
        panelDeleteStarSystem,
        panelAddStar,
        panelEditStar,
        panelDeleteStar,
        panelAddPlanet,
        panelEditPlanet,
        panelDeletePlanet,
        panelAddSatellite,
        panelEditSatellite,
        panelDeleteSatellite,
        panelAddGeographicUnit,
        panelEditGeographicUnit,
        panelDeleteGeographicUnit,
        resetAll,
    }), [starSystemEditRef, starEditRef, planetEditRef, satelliteEditRef, geographyUnitEditRef]);


    return (
        <EditContext.Provider value={providerValue}>
            {children}
            <StarSystemEdit ref={starSystemEditRef} onFinish={() => resetAll()}/>
            <StarEdit ref={starEditRef} onFinish={() => resetAll()}/>
            <PlanetEdit ref={planetEditRef} onFinish={() => resetAll()}/>
            <SatelliteEdit ref={satelliteEditRef} onFinish={() => resetAll()}/>
            <GeographyUnitEdit ref={geographyUnitEditRef} onFinish={() => resetAll()}/>

            {delConfirmModalContextHolder}
        </EditContext.Provider>
    )
}

export function useEditContext() {
    return useContext(EditContext);
}
