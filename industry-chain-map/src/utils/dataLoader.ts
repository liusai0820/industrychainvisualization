import { IndustryChainData } from '@/types';
import { PRESET_INDUSTRIES } from '@/data/preset-industries';

// 内存缓存
const dataCache: { [key: string]: IndustryChainData } = {};

// 检查是否是预设产业
export const isPresetIndustry = (industryName: string): string | null => {
    for (const category of PRESET_INDUSTRIES) {
        const industry = category.industries.find(
            ind => ind.name === industryName || ind.id === industryName
        );
        if (industry) {
            return industry.id;
        }
    }
    return null;
};

// 检查数据是否已缓存
export const isCached = (industryId: string): boolean => {
    return !!dataCache[industryId];
};

// 从缓存获取数据
export const getFromCache = (industryId: string): IndustryChainData | null => {
    return dataCache[industryId] || null;
};

// 添加数据到缓存
export const addToCache = (industryId: string, data: IndustryChainData): void => {
    dataCache[industryId] = data;
};

// 验证数据结构
const validateData = (data: any): boolean => {
    try {
        if (!data || typeof data !== 'object') return false;
        if (!data.产业链 || !Array.isArray(data.环节)) return false;
        
        return data.环节.every((segment: any) => 
            segment.环节名称 && 
            Array.isArray(segment.子环节) &&
            segment.子环节.every((sub: any) => 
                sub.子环节名称 && 
                Array.isArray(sub['子-子环节']) &&
                sub['子-子环节'].every((subSub: any) => 
                    subSub['子-子环节名称'] && 
                    Array.isArray(subSub.代表公司)
                )
            )
        );
    } catch (error) {
        console.error('Error validating data:', error);
        return false;
    }
};

// 转换数据结构
const transformData = (rawData: any): IndustryChainData => {
    try {
        if (!validateData(rawData)) {
            throw new Error('Invalid data structure');
        }

        return {
            name: rawData.产业链,
            children: rawData.环节.map((segment: any) => ({
                name: segment.环节名称,
                children: segment.子环节.map((subSegment: any) => ({
                    name: subSegment.子环节名称,
                    children: subSegment['子-子环节'].map((subSubSegment: any) => ({
                        name: subSubSegment['子-子环节名称'],
                        children: subSubSegment.代表公司.map((company: string) => ({
                            name: company
                        }))
                    }))
                }))
            }))
        };
    } catch (error) {
        console.error('Error transforming data:', error);
        throw new Error(`Failed to transform industry data: ${error.message}`);
    }
};

// 从 Dify API 获取数据
const fetchFromDifyApi = async (industryName: string): Promise<IndustryChainData> => {
    try {
        const response = await fetch('/api/graph', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ industryName }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch data from API');
        }

        const result = await response.json();
        if (!result.success || !result.data) {
            throw new Error(result.error || 'API request failed');
        }

        // 检查转换后的数据结构
        if (!result.data.name || !Array.isArray(result.data.children)) {
            console.error('Invalid transformed data structure:', result.data);
            throw new Error('Invalid data structure received from API');
        }

        return result.data;
    } catch (error) {
        console.error('Error fetching from Dify API:', error);
        throw new Error(`Failed to generate industry chain data: ${error.message}`);
    }
};

// 加载产业链数据
export const loadIndustryChainData = async (industryNameOrId: string): Promise<IndustryChainData> => {
    try {
        // 检查是否是预设产业
        const presetId = isPresetIndustry(industryNameOrId);
        
        if (presetId) {
            // 是预设产业，检查缓存
            if (isCached(presetId)) {
                console.log('Loading from cache:', presetId);
                return getFromCache(presetId)!;
            }

            console.log('Loading preset industry from file:', presetId);
            // 动态导入数据文件
            const module = await import(`@/data/industries/${presetId}.json`);
            const rawData = module.default || module;
            
            // 验证数据
            if (!validateData(rawData)) {
                throw new Error('Invalid data structure');
            }
            
            // 转换数据结构
            const transformedData = transformData(rawData);
            
            // 添加到缓存
            addToCache(presetId, transformedData);
            
            return transformedData;
        } else {
            // 非预设产业，调用 Dify API
            console.log('Generating data from Dify API:', industryNameOrId);
            const data = await fetchFromDifyApi(industryNameOrId);
            return data;
        }
    } catch (error) {
        console.error('Error loading industry data:', error);
        throw new Error(`Failed to load data for industry: ${industryNameOrId}`);
    }
};

// 预加载指定产业的数据
export const preloadIndustryData = async (industryIds: string[]): Promise<void> => {
    const promises = industryIds.map(id => {
        if (!isCached(id)) {
            return loadIndustryChainData(id).catch(error => {
                console.error(`Failed to preload data for industry ${id}:`, error);
            });
        }
        return Promise.resolve();
    });

    await Promise.all(promises);
}; 