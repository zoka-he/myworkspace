import { createSlice } from '@reduxjs/toolkit';
import { useRouter } from 'next/router';
import navConfig from '../config/navigator';

interface INavigatorState {
  lv1Key: number,
  lv2Key: number,
}

function updateUrl(state: INavigatorState) {
  let { lv1Key, lv2Key } = state;
  if (!navConfig?.menu) {
    useRouter().push('/404');
    return;
  }

  let lv2Menu = navConfig.menu[lv1Key];
  if (!lv2Menu) {
    useRouter().push('/404');
    return;
  }

  if (!lv2Menu.menu) {
    if (lv2Menu.url) {
      useRouter().push(lv2Menu.url);
      return;
    } else {
      useRouter().push('/404');
      return;
    }
  }

  let lv2Item = lv2Menu.menu[lv2Key];
  if (!lv2Item?.url) {
    useRouter().push('/404');
    return;
  }

  useRouter().push(lv2Item.url);
}

const navigatorSlice = createSlice({
  name: 'navigator',
  initialState: {
    lv1Key: 0,
    lv2Key: 0
  },
  reducers: {
    setLv1Key: (state, { payload }) => {
      state.lv1Key = payload;
      state.lv2Key = 0;
    },

    setLv2Key: (state, { payload }) => {
      state.lv2Key = payload;
      // updateUrl(state);
    },

    setPage: (state, { payload }) => {
      if (payload instanceof Array) {
        state.lv1Key = payload[0];
        state.lv2Key = payload[1];
      } else if (payload.hasOwnProperty('lv1Key') && payload.hasOwnProperty('lv2Key')) {
        state.lv1Key = payload.lv1Key;
        state.lv2Key = payload.lv2Key;
      }

      // updateUrl(state);
    }
  }
});

const { setLv1Key, setLv2Key } = navigatorSlice.actions;

export default navigatorSlice;
export type {
  INavigatorState
};
export { 
  setLv1Key, 
  setLv2Key 
};