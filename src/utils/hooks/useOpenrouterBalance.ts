import { useSelector, useDispatch } from 'react-redux';
import { IRootState } from '@/src/store';


export function useOpenrouterBalance() {
    const openrouterBalance = useSelector((state: IRootState) => state.openrouterSlice.balance) ?? '0.00';
    return openrouterBalance;
}