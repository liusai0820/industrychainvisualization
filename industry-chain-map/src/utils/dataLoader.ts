import { IndustryChainData } from '@/types';
import { PRESET_INDUSTRIES } from '@/data/preset-industries';

// 定义原始数据结构的类型
interface RawIndustryData {
    产业链: string;
    环节: Array<{
        环节名称: string;
        子环节: Array<{
            子环节名称: string;
            '子-子环节': Array<{
                '子-子环节名称': string;
                代表公司: string[];
            }>;
        }>;
    }>;
}

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
const validateData = (data: unknown): data is RawIndustryData => {
    try {
        if (!data || typeof data !== 'object') return false;
        const rawData = data as RawIndustryData;
        
        if (!rawData.产业链 || !Array.isArray(rawData.环节)) return false;
        
        return rawData.环节.every(segment => 
            segment.环节名称 && 
            Array.isArray(segment.子环节) &&
            segment.子环节.every(sub => 
                sub.子环节名称 && 
                Array.isArray(sub['子-子环节']) &&
                sub['子-子环节'].every(subSub => 
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
const transformData = (rawData: RawIndustryData): IndustryChainData => {
    try {
        if (!validateData(rawData)) {
            throw new Error('Invalid data structure');
        }

        return {
            name: rawData.产业链,
            children: rawData.环节.map(segment => ({
                name: segment.环节名称,
                children: segment.子环节.map(subSegment => ({
                    name: subSegment.子环节名称,
                    children: subSegment['子-子环节'].map(subSubSegment => ({
                        name: subSubSegment['子-子环节名称'],
                        children: subSubSegment.代表公司.map(company => ({
                            name: company
                        }))
                    }))
                }))
            }))
        };
    } catch (error) {
        console.error('Error transforming data:', error);
        throw new Error(`Failed to transform industry data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

// 从 Dify API 获取数据
const fetchFromDifyApi = async (industryName: string): Promise<IndustryChainData> => {
    const maxRetries = 3;
    const baseDelay = 3000; // 增加到3秒

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                // 指数退避策略，增加等待时间
                const delay = baseDelay * Math.pow(2, attempt);
                console.log(`Retry attempt ${attempt + 1}, waiting ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            const response = await fetch('/api/graph', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ industryName }),
                // 添加更多的 fetch 选项
                cache: 'no-cache',
                keepalive: true,
                // 设置前端请求超时为90秒
                signal: AbortSignal.timeout(90000)
            });

            // 检查是否是超时或服务器错误
            if (response.status >= 500 || response.status === 408) {
                console.log(`Received error status ${response.status}, will retry`);
                if (attempt === maxRetries - 1) {
                    throw new Error('服务暂时不可用，请稍后重试');
                }
                continue;
            }

            let result;
            try {
                result = await response.json();
            } catch (error) {
                console.error('Failed to parse response as JSON:', error);
                throw new Error('服务响应格式错误，请稍后重试');
            }

            // 检查响应状态
            if (!response.ok) {
                console.error('API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    result
                });
                throw new Error(result.error || `请求失败: ${response.status}`);
            }

            // 检查响应数据
            if (!result.success || !result.data) {
                console.error('Invalid API Response:', result);
                const errorMessage = result.error || '获取数据失败，请稍后重试';
                if (attempt < maxRetries - 1) {
                    console.log(`Retrying due to invalid response (attempt ${attempt + 1})`);
                    continue;
                }
                throw new Error(errorMessage);
            }

            // 添加数据验证
            if (!result.data.name || !Array.isArray(result.data.children)) {
                console.error('Invalid data structure:', result.data);
                throw new Error('数据格式错误，请稍后重试');
            }

            return result.data;
        } catch (error) {
            console.error(`Attempt ${attempt + 1} failed:`, error);
            
            // 如果是最后一次尝试，抛出错误
            if (attempt === maxRetries - 1) {
                throw new Error(`生成产业链数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
            }
        }
    }

    // 这行代码理论上永远不会执行，因为在最后一次重试失败时会抛出错误
    throw new Error('所有重试都失败了');
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
                const cachedData = getFromCache(presetId);
                if (!cachedData) {
                    throw new Error('Cache data not found');
                }
                return cachedData;
            }

            console.log('Loading preset industry from file:', presetId);
            // 动态导入数据文件
            const moduleData = await import(`@/data/industries/${presetId}.json`);
            const rawData = moduleData.default || moduleData;
            
            // 验证数据
            if (!validateData(rawData)) {
                throw new Error('Invalid data structure in preset data');
            }
            
            // 转换数据结构
            const transformedData = transformData(rawData);
            
            // 添加到缓存
            addToCache(presetId, transformedData);
            
            return transformedData;
        } else {
            // 非预设产业，调用 Dify API
            console.log('Generating data from Dify API:', industryNameOrId);
            return await fetchFromDifyApi(industryNameOrId);
        }
    } catch (error) {
        console.error('Error loading industry data:', error);
        throw new Error(`Failed to load data for industry: ${error instanceof Error ? error.message : 'Unknown error'}`);
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