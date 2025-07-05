import { createSlice } from '@reduxjs/toolkit';

interface IDifyState {
    datasetsApiKey: string | null,
    baseUrl: string | null,
}

const difySlice = createSlice({
    name: 'dify',
    initialState: {
        datasetsApiKey: null,
        baseUrl: null,
    },
    reducers: {

        setDatasetsApiKey: (state, { payload }) => {
            state.datasetsApiKey = payload;
        },

        setBaseUrl: (state, { payload }) => {
            state.baseUrl = payload;
        },
    }
});

const {
    setDatasetsApiKey,
    setBaseUrl,
} = difySlice.actions;

export default difySlice;
export {
    setDatasetsApiKey,
    setBaseUrl,
};
export type {
    IDifyState
}
