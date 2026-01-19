import { useSelector, useDispatch } from 'react-redux';
import { IRootState } from '@/src/store';
import { toggleDrawerVisible } from '@/src/store/navigatorSlice';

export function useAppState() {
    const navigatorSlice = useSelector((state: IRootState) => state.navigatorSlice);
    const difySlice = useSelector((state: IRootState) => state.difySlice);

    const dispatch = useDispatch();

    return {
        drawerVisible: navigatorSlice.drawerVisible,
        difyFrontHost: difySlice.frontHost,
        toggleDrawerVisible: () => {
            dispatch(toggleDrawerVisible() as any);
        }
    }
}