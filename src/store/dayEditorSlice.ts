import { createSlice } from '@reduxjs/toolkit';

interface IDayEditorState {
    positions: any[]
}

const slice = createSlice({
    name: 'dayEditor',
    initialState: {
        positions: new Array(),
    },
    reducers: {
        addPosition: (state, { payload }) => {
            let arr = Array.from(state.positions);
            arr.unshift(payload);
            state.positions = arr;
        },
        removePosition: (state, { payload }) => {
            if (typeof payload === 'number') {
                let arr = Array.from(state.positions);
                arr.splice(payload, 1);
                state.positions = arr;
            }
        }
    }
});

const {
    addPosition,
    removePosition
} = slice.actions;

export default slice;
export {
    addPosition,
    removePosition
};
export type {
    IDayEditorState
}