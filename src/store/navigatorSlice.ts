import { createSlice } from '@reduxjs/toolkit';

interface INavigatorState {
    navMenu: any[]
}


const navigatorSlice = createSlice({
    name: 'navigator',
    initialState: {
        navMenu: []
    },
    reducers: {
        setNavMenu: (state, { payload }) => {
            state.navMenu = payload;
        }
    }
});

const { setNavMenu } = navigatorSlice.actions;

export default navigatorSlice;
export type {
    INavigatorState
};
export {
    setNavMenu
};