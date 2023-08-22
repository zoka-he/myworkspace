import { configureStore } from '@reduxjs/toolkit';
import loginSlice from './loginSlice';
import navigatorSlice from './navigatorSlice';
import dayEditorSlice, { IDayEditorState } from './dayEditorSlice';
import type { INavigatorState } from './navigatorSlice';
import type { ILoginState } from './loginSlice';

interface IRootState {
    loginSlice: ILoginState
    navigatorSlice: INavigatorState
    dayEditorSlice: IDayEditorState
};

const store = configureStore({
    reducer: {
        loginSlice: loginSlice.reducer,
        navigatorSlice: navigatorSlice.reducer,
        dayEditorSlice: dayEditorSlice.reducer
    }
});

export default store;
export type {
    IRootState
}