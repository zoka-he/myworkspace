import { createSlice } from '@reduxjs/toolkit';

interface IDifyState {
    datasetsApiKey: string | null,
    baseUrl: string | null,
    frontHost: string | null,
    difyFrontHostOptions: string[],
}

const difySlice = createSlice({
    name: 'dify',
    initialState: {
        datasetsApiKey: null,
        baseUrl: null,
        frontHost: typeof window !== 'undefined' ? window.location.hostname : null,
        difyFrontHostOptions: [] as string[],
    },
    reducers: {

        setDatasetsApiKey: (state, { payload }) => {
            state.datasetsApiKey = payload;
        },

        setBaseUrl: (state, { payload }) => {
            state.baseUrl = payload;
        },

        setFrontHost: (state, { payload }) => {
            state.frontHost = payload;
        },

        setDifyFrontHostOptions: (state, { payload }) => {
            state.difyFrontHostOptions = payload;
        },

        addDifyFrontHostOption: (state, { payload }) => {
            if (typeof payload === 'string') {
                state.difyFrontHostOptions.push(payload as string);
            }
        },

        removeDifyFrontHostOption: (state, { payload }) => {
            state.difyFrontHostOptions = state.difyFrontHostOptions.filter(option => option !== payload);
        },
    }
});

const {
    setDatasetsApiKey,
    setBaseUrl,
    setFrontHost,
    setDifyFrontHostOptions,
} = difySlice.actions;

export default difySlice;
export {
    setDatasetsApiKey,
    setBaseUrl,
    setFrontHost,
    setDifyFrontHostOptions,
};
export type {
    IDifyState
}
