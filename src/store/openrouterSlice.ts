import { createSlice } from '@reduxjs/toolkit';

export interface IOpenRouterState {
    balance: string,
}

const openrouterSlice = createSlice({
    name: 'openrouter',
    initialState: {
        balance: '0.00',
    },
    reducers: {
        setBalance: (state, { payload }: { payload: string }) => {
            state.balance = payload;
        },
    },
});

export const { setBalance } = openrouterSlice.actions;

type TOpenRouterBalanceResponse = {
    data: {
        total_credits: number;
        total_usage: number;
    }
}

/** 需要传入 dispatch，在 store 创建后调用，否则 setBalance 不会更新 store */
export async function updateOpenRouterBalance(
    dispatch: (action: ReturnType<typeof setBalance>) => void
) {
    try {
        const response = await fetch(
            'https://openrouter.ai/api/v1/credits',
            {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                }
            }
        );

        const data = (await response.json()) as TOpenRouterBalanceResponse;
        const balance = data.data.total_credits - data.data.total_usage;
        console.log('OpenRouter余额', balance);
        dispatch(setBalance(balance.toFixed(2)));
    } catch (error) {
        console.error('更新OpenRouter余额失败', error);
        dispatch(setBalance('0.00'));
    }
}

export default openrouterSlice;