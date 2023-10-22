import { createSlice } from '@reduxjs/toolkit';

interface INavigatorState {
    navMenu: any[]
    menuSearchKey: string
    lastPathname: string
    historyTags: any[]
}


const navigatorSlice = createSlice({
    name: 'navigator',
    initialState: {
        navMenu: [],
        menuSearchKey: '',
        lastPathname: '',
        historyTags: []
    },
    reducers: {
        setNavMenu: (state, { payload }) => {
            state.navMenu = payload;
        },

        setMenuSearchKey: (state, { payload }) => {
            state.menuSearchKey = payload
        },

        setLastPathname: (state, { payload }) => {
            state.lastPathname = payload
        },

        setHistoryTags: (state, {payload}) => {
            state.historyTags = payload;
        }
    }
});

const { 
    setNavMenu, 
    setMenuSearchKey, 
    setLastPathname,
    setHistoryTags
} = navigatorSlice.actions;

export default navigatorSlice;
export type {
    INavigatorState
};
export {
    setNavMenu,
    setMenuSearchKey,
    setLastPathname,
    setHistoryTags
};