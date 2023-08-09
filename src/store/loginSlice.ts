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

        setLoginUser: (state, { payload }) => {
            state.user = payload;
        },
    }
});

const {
    setLoginUser,
} = loginSlice.actions;

export default loginSlice;
export {
    setLoginUser,
};
export type {
    ILoginState
}
