import { createSlice } from '@reduxjs/toolkit';
import mysqlConfig from '@/src/config/mysql';

interface IDifyState {
    datasetsApiKey: string | null,
    baseUrl: string | null,
    frontHost: string | null,
    difyFrontHostOptions: string[],
}

function getDefaultFrontHost() {

    let hostname = `${mysqlConfig.MYSQL_HOST}`;

    if (typeof window !== 'undefined') {
        if (hostname.includes('localhost') && process.env.NODE_ENV === 'production') {   // 适应生产环境且本地访问
            hostname = 'host.docker.internal';
        } else if (process.env.NODE_ENV === 'production') {  // 适应生产环境且非本地访问
            hostname = window.location.hostname;
        }
    }
    return hostname;
}

const difySlice = createSlice({
    name: 'dify',
    initialState: {
        datasetsApiKey: null,
        baseUrl: null,
        frontHost: getDefaultFrontHost(),
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
