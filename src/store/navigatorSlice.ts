import { createSlice } from '@reduxjs/toolkit';

interface INavigatorState {
    lv1Key: number,
    lv2Key: number,
    navMenu: any[]
}


const navigatorSlice = createSlice({
    name: 'navigator',
    initialState: {
        lv1Key: 0,
        lv2Key: 0,
        navMenu: []
    },
    reducers: {
        setLv1Key: (state, { payload }) => {
            state.lv1Key = payload;
            state.lv2Key = 0;
        },

        setLv2Key: (state, { payload }) => {
            state.lv2Key = payload;
            // updateUrl(state);
        },

        setPage: (state, { payload }) => {
            if (payload instanceof Array) {
                state.lv1Key = payload[0];
                state.lv2Key = payload[1];
            } else if (payload.hasOwnProperty('lv1Key') && payload.hasOwnProperty('lv2Key')) {
                state.lv1Key = payload.lv1Key;
                state.lv2Key = payload.lv2Key;
            }

            // updateUrl(state);
        },

        setNavMenu: (state, { payload }) => {
            state.navMenu = payload;
        }
    }
});

const { setLv1Key, setLv2Key, setNavMenu } = navigatorSlice.actions;

export default navigatorSlice;
export type {
    INavigatorState
};
export {
    setLv1Key,
    setLv2Key,
    setNavMenu
};