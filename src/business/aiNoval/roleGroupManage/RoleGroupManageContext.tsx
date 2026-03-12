import { IRoleGroup, IWorldViewData } from '@/src/types/IAiNoval';
import { createContext, createElement, Dispatch, useContext, useReducer } from 'react';
import apiCalls from './apiCalls';
import { getWorldViews } from '@/src/api/aiNovel';

interface RoleGroupManageContextData {
    worldViewId: number | null;
    worldViewList: IWorldViewData[];
    roleGroupList: IRoleGroup[];
    currentRoleGroupId: number | null;
    roleGroupDetail: (IRoleGroup & { members?: any[] }) | null;
}

const RoleGroupManageContext = createContext<RoleGroupManageContextData>(defaultContextData());
const RoleGroupManageDispatchContext = createContext<Dispatch<RoleGroupManageAction>>(() => {});

function defaultContextData(): RoleGroupManageContextData {
    return {
        worldViewId: null,
        worldViewList: [],
        roleGroupList: [],
        currentRoleGroupId: null,
        roleGroupDetail: null,
    };
}

interface RoleGroupManageAction {
    type: 'SET_WORLD_VIEW_ID' | 'SET_WORLD_VIEW_LIST' | 'SET_ROLE_GROUP_LIST' | 'SET_CURRENT_ROLE_GROUP_ID' | 'SET_ROLE_GROUP_DETAIL';
    payload: any;
}

function reducer(state: RoleGroupManageContextData, action: RoleGroupManageAction) {
    switch (action.type) {
        case 'SET_WORLD_VIEW_ID':
            return { ...state, worldViewId: action.payload };
        case 'SET_WORLD_VIEW_LIST':
            return { ...state, worldViewList: action.payload || [] };
        case 'SET_ROLE_GROUP_LIST':
            return { ...state, roleGroupList: action.payload || [] };
        case 'SET_CURRENT_ROLE_GROUP_ID':
            return { ...state, currentRoleGroupId: action.payload, roleGroupDetail: null };
        case 'SET_ROLE_GROUP_DETAIL':
            return { ...state, roleGroupDetail: action.payload };
        default:
            return state;
    }
}

export default function RoleGroupManageContextProvider({ children }: { children: React.ReactNode }) {
    const [values, dispatch] = useReducer(reducer, defaultContextData());
    return createElement(
        RoleGroupManageContext.Provider,
        { value: values },
        createElement(RoleGroupManageDispatchContext.Provider, { value: dispatch }, children)
    );
}

export function useLoadWorldViewList() {
    const dispatch = useContext(RoleGroupManageDispatchContext);
    return async () => {
        const response = await getWorldViews();
        const data = (response as { data?: IWorldViewData[] })?.data || [];
        dispatch({ type: 'SET_WORLD_VIEW_LIST', payload: data });
        return data;
    };
}

export function useLoadRoleGroupList() {
    const { worldViewId } = useContext(RoleGroupManageContext);
    const dispatch = useContext(RoleGroupManageDispatchContext);
    return async () => {
        if (!worldViewId) return { data: [], count: 0 };
        const response = await apiCalls.getRoleGroupList(worldViewId);
        const data = (response as { data?: IRoleGroup[] })?.data || [];
        dispatch({ type: 'SET_ROLE_GROUP_LIST', payload: data });
        return response;
    };
}

export function useWorldViewId() {
    const { worldViewId } = useContext(RoleGroupManageContext);
    const dispatch = useContext(RoleGroupManageDispatchContext);
    return [
        worldViewId,
        (id: number | null) => dispatch({ type: 'SET_WORLD_VIEW_ID', payload: id }),
    ] as const;
}

export function useWorldViewList() {
    const { worldViewList } = useContext(RoleGroupManageContext);
    return worldViewList;
}

export function useRoleGroupList() {
    const { roleGroupList } = useContext(RoleGroupManageContext);
    return roleGroupList;
}

export function useCurrentRoleGroupId() {
    const { currentRoleGroupId } = useContext(RoleGroupManageContext);
    const dispatch = useContext(RoleGroupManageDispatchContext);
    return [
        currentRoleGroupId,
        (id: number | null) => dispatch({ type: 'SET_CURRENT_ROLE_GROUP_ID', payload: id }),
    ] as const;
}

export function useCurrentRoleGroup() {
    const { roleGroupDetail, currentRoleGroupId, roleGroupList } = useContext(RoleGroupManageContext);
    if (roleGroupDetail && roleGroupDetail.id === currentRoleGroupId) return roleGroupDetail;
    return roleGroupList.find((g) => g.id === currentRoleGroupId) ?? null;
}

export function useLoadRoleGroupDetail() {
    const dispatch = useContext(RoleGroupManageDispatchContext);
    const { currentRoleGroupId } = useContext(RoleGroupManageContext);
    return async (id?: number | null) => {
        const targetId = id ?? currentRoleGroupId;
        if (!targetId) return null;
        const res = await apiCalls.getRoleGroup(targetId);
        const data = (res as any)?.data ?? res;
        dispatch({ type: 'SET_ROLE_GROUP_DETAIL', payload: data });
        return data;
    };
}
