import { useSelector } from 'react-redux';
import { IRootState } from '@/src/store';

/**
 * 自定义 hook，用于获取主题相关的状态
 * @returns 主题配置对象，包含当前主题名称、主题配置和常用颜色
 */
export function useTheme() {
    const themeSlice = useSelector((state: IRootState) => state.themeSlice);
    
    return {
        currentTheme: themeSlice.currentTheme,
        themeConfig: themeSlice.themeConfig,
        // 常用颜色快捷访问
        textColor: themeSlice.themeConfig.token.colorTextBase || '#000000',
        primaryColor: themeSlice.themeConfig.token.colorPrimary || '#1890ff',
        bgColor: themeSlice.themeConfig.token.colorBgBase || '#ffffff',
    };
}

