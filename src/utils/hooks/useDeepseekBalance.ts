import { useSelector, useDispatch } from 'react-redux';
import { IRootState } from '@/src/store';


export function useDeepseekBalance() {
    const deepseekBalance = useSelector((state: IRootState) => state.deepseekSlice.balance) ?? 0;
    return deepseekBalance;
}