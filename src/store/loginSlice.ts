import { createSlice } from '@reduxjs/toolkit';

interface ILoginState {
  user: Object | null,
  isLogin: boolean
}

const loginSlice = createSlice({
  name: 'login',
  initialState: {
    user: null,
    isLogin: true,
  },
  reducers: {

    setLoginUser: () => {

    },

    clearLoginUser: () => {

    }
  }
});

const { 
  setLoginUser,
  clearLoginUser
} = loginSlice.actions;

export default loginSlice;
export {
  setLoginUser,
  clearLoginUser
};
export type {
  ILoginState
}
