import { createSlice } from '@reduxjs/toolkit';
import { THEMES, DEFAULT_THEME, AlgorithmType } from '@/src/config/theme';

interface IStyleState {
    currentTheme: string
    themeConfig: {
        name: string
        algorithm: AlgorithmType
        token: any
    }
}

let defaultTheme = DEFAULT_THEME;
if (typeof window !== 'undefined') {
    defaultTheme = window.localStorage.getItem('myworksite_theme') || DEFAULT_THEME;
}

const styleSlice = createSlice({
    name: 'style',
    initialState: {
        currentTheme: defaultTheme,
        themeConfig: THEMES[defaultTheme as keyof typeof THEMES] || THEMES.light
    },
    reducers: {
        setTheme: (state, action) => {
            const themeName = action.payload as string;
            if (!(themeName in THEMES)) {
                console.error(`Invalid theme name: ${themeName}`);
                return;
            }

            state.currentTheme = themeName;
            state.themeConfig = (THEMES[themeName as keyof typeof THEMES] || THEMES.light) as any;

            window.localStorage.setItem('myworksite_theme', themeName);
        },
        updateThemeToken: (state, action) => {
            state.themeConfig = {
                ...state.themeConfig,
                token: {
                    ...state.themeConfig.token,
                    ...action.payload
                }
            };
        }
    }
})

const { setTheme } = styleSlice.actions;

export default styleSlice;
export { setTheme };

export type { IStyleState };

