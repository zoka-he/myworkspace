import { configureStore } from '@reduxjs/toolkit';
import loginSlice from './loginSlice';
import navigatorSlice from './navigatorSlice';
import dayEditorSlice, { IDayEditorState } from './dayEditorSlice';
import type { INavigatorState } from './navigatorSlice';
import type { ILoginState } from './loginSlice';
import difySlice, { type IDifyState } from './difySlice';

interface IRootState {
    loginSlice: ILoginState
    navigatorSlice: INavigatorState
    dayEditorSlice: IDayEditorState
    difySlice: IDifyState
};

const store = configureStore({
    reducer: {
        loginSlice: loginSlice.reducer,
        navigatorSlice: navigatorSlice.reducer,
        dayEditorSlice: dayEditorSlice.reducer,
        difySlice: difySlice.reducer
    }
});

export default store;
export type {
    IRootState
}