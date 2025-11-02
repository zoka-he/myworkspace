import { theme } from 'antd'

// 算法映射表
export const ALGORITHM_MAP = {
  default: theme.defaultAlgorithm,
  dark: theme.darkAlgorithm,
  compact: theme.compactAlgorithm,
} as const;

export type AlgorithmType = keyof typeof ALGORITHM_MAP;

// 根据算法名称获取算法函数
export const getAlgorithm = (algorithmName: AlgorithmType) => {
  return ALGORITHM_MAP[algorithmName] || ALGORITHM_MAP.default;
};

export const THEMES = {
    light: {
      name: 'light',
      algorithm: 'default' as AlgorithmType,
      token: {
        colorPrimary: '#1890ff',
        colorBgBase: '#ffffff',
        colorTextBase: '#000000',
      }
    },
    dark: {
      name: 'dark',
      algorithm: 'dark' as AlgorithmType,
      token: {
        colorPrimary: '#177ddc',
        colorBgBase: '#141414',
        colorTextBase: '#ffffff',
      }
    },
    compact: {
      name: 'compact',
      algorithm: 'compact' as AlgorithmType,
      token: {
        colorPrimary: '#1890ff',
      }
    }
  };
  
  export const DEFAULT_THEME = 'light';