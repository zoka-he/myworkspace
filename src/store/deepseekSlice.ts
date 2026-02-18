import { createSlice } from '@reduxjs/toolkit';

export interface IDeepSeekState {
    balance: string,
}

const deepseekSlice = createSlice({
    name: 'deepseek',
    initialState: {
        balance: '0.00',
    },
    reducers: {
        setBalance: (state, { payload }: { payload: string }) => {
            state.balance = payload;
        },
    },
});

export const { setBalance } = deepseekSlice.actions;

type TDeepSeekBalanceResponse = {
    is_available: boolean;
    balance_infos: {
        currency: string;
        total_balance: string;
        granted_balance: string;
        topped_up_balance: string;
    }[]
}

/** 需要传入 dispatch，在 store 创建后调用，否则 setBalance 不会更新 store */
export async function updateDeepSeekBalance(
    dispatch: (action: ReturnType<typeof setBalance>) => void
) {
    try {
        const response = await fetch(
            'https://api.deepseek.com/user/balance',
            {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                }
            }
        );

        const data = (await response.json()) as TDeepSeekBalanceResponse;
        if (data.is_available) {
            const balance = data.balance_infos.find(info => info.currency === 'CNY')?.total_balance ?? '0.00';
            console.log('DeepSeek余额', balance);
            dispatch(setBalance(balance));
        } else {
            console.error('DeepSeek余额不可用');
            dispatch(setBalance('0.00'));
        }
    } catch (error) {
        console.error('更新DeepSeek余额失败', error);
        dispatch(setBalance('0.00'));
    }
}

export default deepseekSlice;