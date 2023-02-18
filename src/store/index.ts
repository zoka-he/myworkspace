import { configureStore } from '@reduxjs/toolkit';
import loginSlice from './loginSlice';
import navigatorSlice from './navigatorSlice';
import type { INavigatorState } from './navigatorSlice';
import type { ILoginState } from './loginSlice';

interface IRootState {
  loginSlice: ILoginState
  navigatorSlice: INavigatorState
};

const store = configureStore({
  reducer: {
    loginSlice: loginSlice.reducer,
    navigatorSlice: navigatorSlice.reducer
  }
});

export default store;
export type {
  IRootState
}