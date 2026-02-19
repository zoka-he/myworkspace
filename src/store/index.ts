import { configureStore } from '@reduxjs/toolkit';
import loginSlice from './loginSlice';
import navigatorSlice from './navigatorSlice';
import dayEditorSlice, { IDayEditorState } from './dayEditorSlice';
import type { INavigatorState } from './navigatorSlice';
import type { ILoginState } from './loginSlice';
import difySlice, { type IDifyState } from './difySlice';
import themeSlice, { type IStyleState } from './themeSlice';
import deepseekSlice, { type IDeepSeekState, updateDeepSeekBalance } from './deepseekSlice';
import openrouterSlice, { type IOpenRouterState, updateOpenRouterBalance } from './openrouterSlice';

interface IRootState {
    loginSlice: ILoginState
    navigatorSlice: INavigatorState
    dayEditorSlice: IDayEditorState
    difySlice: IDifyState
    themeSlice: IStyleState
    deepseekSlice: IDeepSeekState
    openrouterSlice: IOpenRouterState
};

const store = configureStore({
    reducer: {
        loginSlice: loginSlice.reducer,
        navigatorSlice: navigatorSlice.reducer,
        dayEditorSlice: dayEditorSlice.reducer,
        difySlice: difySlice.reducer,
        themeSlice: themeSlice.reducer,
        deepseekSlice: deepseekSlice.reducer,
        openrouterSlice: openrouterSlice.reducer,
    }
});

// 初始化并定时更新 DeepSeek 余额（必须在 store 创建后 dispatch 才会生效）
updateDeepSeekBalance(store.dispatch);
// updateOpenRouterBalance(store.dispatch);
setInterval(() => {
    updateDeepSeekBalance(store.dispatch)
    // updateOpenRouterBalance(store.dispatch)
}, 1000 * 15 * 60);

export default store;
export type {
    IRootState
}