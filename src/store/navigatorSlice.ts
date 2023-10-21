import { createSlice } from '@reduxjs/toolkit';

interface INavigatorState {
    navMenu: any[],
    menuSearchKey: string
}


const navigatorSlice = createSlice({
    name: 'navigator',
    initialState: {
        navMenu: [],
        menuSearchKey: ''
    },
    reducers: {
        setNavMenu: (state, { payload }) => {
            state.navMenu = payload;
        },

        setMenuSearchKey: (state, { payload }) => {
            state.menuSearchKey = payload
        }
    }
});

const { setNavMenu, setMenuSearchKey } = navigatorSlice.actions;

export default navigatorSlice;
export type {
    INavigatorState
};
export {
    setNavMenu,
    setMenuSearchKey
};