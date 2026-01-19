import { createSlice } from '@reduxjs/toolkit';

interface INavigatorState {
    navMenu: any[]
    menuSearchKey: string
    lastPathname: string
    historyTags: any[]
    showAll: boolean,
    drawerVisible: boolean
}

let defaultShowAll = false;
if (typeof window !== 'undefined') {
    defaultShowAll = window.localStorage.getItem('myworksite_show_mode') === 'true';
}

const navigatorSlice = createSlice({
    name: 'navigator',
    initialState: {
        navMenu: [],
        menuSearchKey: '',
        lastPathname: '',
        historyTags: [],
        showAll: defaultShowAll,
        drawerVisible: false
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
        },

        setShowAll: (state, {payload}) => {
            state.showAll = payload;
            if (typeof window !== 'undefined') {
                window.localStorage.setItem('myworksite_show_mode', payload.toString());
            }
        },

        toggleDrawerVisible: (state) => {
            state.drawerVisible = !state.drawerVisible;
        }
    }
});

const { 
    setNavMenu, 
    setMenuSearchKey, 
    setLastPathname,
    setHistoryTags,
    setShowAll,
    toggleDrawerVisible
} = navigatorSlice.actions;

export default navigatorSlice;
export type {
    INavigatorState
};
export {
    setNavMenu,
    setMenuSearchKey,
    setLastPathname,
    setHistoryTags,
    setShowAll,
    toggleDrawerVisible
};