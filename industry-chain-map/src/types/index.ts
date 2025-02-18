// 产业链数据类型
export interface Company {
    name: string;
}

export interface SubSubSection {
    name: string;
    children?: Company[];
}

export interface SubSection {
    name: string;
    children?: SubSubSection[];
}

export interface MainSection {
    name: string;
    children?: SubSection[];
}

export interface IndustryChainData {
    name: string;
    children?: MainSection[];
}

// 进度状态类型
export interface ProgressStage {
    name: string;
    progress: number;
    detail: string;
}

// API响应类型
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// 预设产业类型
export interface PresetIndustry {
    id: string;
    name: string;
    category: 'strategic' | 'future';
    icon: string;
    description: string;
}

// 产业分类
export interface IndustryCategory {
    id: string;
    name: string;
    description: string;
    industries: PresetIndustry[];
} 