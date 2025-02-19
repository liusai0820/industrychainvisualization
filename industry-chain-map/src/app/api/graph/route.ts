import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { PRESET_INDUSTRIES } from '@/data/preset-industries';
import { loadIndustryChainData } from '@/utils/dataLoader';

const DIFY_BASE_URL = process.env.DIFY_BASE_URL || "https://api.dify.ai/v1";
const INDUSTRY_CHAIN_API_KEY = process.env.DIFY_API_KEY;

async function callDifyApi(industryName: string) {
    if (!INDUSTRY_CHAIN_API_KEY) {
        throw new Error('Dify API Key not configured');
    }

    try {
        const headers = {
            "Authorization": `Bearer ${INDUSTRY_CHAIN_API_KEY}`,
            "Content-Type": "application/json"
        };
        
        const payload = {
            "inputs": {
                "value_chain": industryName
            },
            "response_mode": "blocking",
            "user": "default"
        };

        console.log('Sending request to Dify API:', {
            url: `${DIFY_BASE_URL}/workflows/run`,
            payload
        });

        const response = await fetch(`${DIFY_BASE_URL}/workflows/run`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(`Dify API request failed: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log('Raw API Response:', JSON.stringify(result, null, 2));
        
        if (!result.data?.outputs?.text) {
            console.error('Invalid API Response Structure:', result);
            throw new Error('Invalid response format from Dify API');
        }

        try {
            // 去掉 markdown 代码块标记，然后解析 JSON
            const jsonText = result.data.outputs.text.replace(/```json\n|```/g, '').trim();
            console.log('Cleaned JSON text:', jsonText);
            
            let data;
            try {
                data = JSON.parse(jsonText);
            } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                console.error('Invalid JSON text:', jsonText);
                throw new Error('Failed to parse JSON response from Dify API');
            }
            
            // 检查数据结构
            if (!data.产业链 || !Array.isArray(data.环节)) {
                console.error('Data structure validation failed:', data);
                throw new Error('Invalid data structure - missing required fields');
            }

            return transformToTree(data);
        } catch (error) {
            console.error('Error processing Dify API response:', error);
            if (error instanceof Error) {
                throw new Error(`Failed to process Dify API response: ${error.message}`);
            } else {
                throw new Error('Failed to process Dify API response: Unknown error');
            }
        }
    } catch (error) {
        console.error('Error in callDifyApi:', error);
        if (error instanceof Error) {
            throw error;
        } else {
            throw new Error('Unknown error in callDifyApi');
        }
    }
}

// 修改 transformToTree 函数的类型定义
interface RawData {
    产业链: string;
    环节: Array<{
        环节名称: string;
        子环节: Array<{
            子环节名称: string;
            代表公司?: string[];  // 添加可选的代表公司属性
            '子-子环节': Array<{
                '子-子环节名称': string;
                代表公司: string[];
            }>;
        }>;
    }>;
}

interface TransformedData {
    name: string;
    children: Array<{
        name: string;
        children: Array<{
            name: string;
            children: Array<{
                name: string;
                children?: Array<{
                    name: string;
                    children?: Array<{
                        name: string;
                    }>;
                }>;
            }>;
        }>;
    }>;
}

function transformToTree(data: RawData): TransformedData {
    try {
        // 数据基础验证
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid input data structure');
        }

        if (!data.产业链 || !Array.isArray(data.环节)) {
            throw new Error('Missing required fields in data structure');
        }

        const transformed = {
            name: data.产业链,
            children: data.环节.map(segment => {
                // 验证环节数据
                if (!segment.环节名称 || !Array.isArray(segment.子环节)) {
                    console.warn(`Invalid segment structure: ${JSON.stringify(segment)}`);
                    return {
                        name: segment.环节名称 || '未知环节',
                        children: []
                    };
                }

                return {
                    name: segment.环节名称,
                    children: segment.子环节.map(subSegment => {
                        // 验证子环节数据
                        if (!subSegment.子环节名称) {
                            console.warn(`Invalid subSegment structure: ${JSON.stringify(subSegment)}`);
                            return {
                                name: '未知子环节',
                                children: []
                            };
                        }

                        // 处理特殊情况：直接包含代表公司的子环节
                        if (Array.isArray(subSegment.代表公司)) {
                            return {
                                name: subSegment.子环节名称,
                                children: subSegment.代表公司.map(company => ({
                                    name: company
                                }))
                            };
                        }

                        // 处理常规情况：包含子-子环节的结构
                        const subSubSegments = Array.isArray(subSegment['子-子环节']) 
                            ? subSegment['子-子环节']
                            : [];

                        return {
                            name: subSegment.子环节名称,
                            children: subSubSegments.map(subSubSegment => {
                                if (!subSubSegment['子-子环节名称'] || !Array.isArray(subSubSegment.代表公司)) {
                                    console.warn(`Invalid subSubSegment structure: ${JSON.stringify(subSubSegment)}`);
                                    return {
                                        name: subSubSegment['子-子环节名称'] || '未知子-子环节',
                                        children: []
                                    };
                                }

                                return {
                                    name: subSubSegment['子-子环节名称'],
                                    children: subSubSegment.代表公司.map(company => ({
                                        name: company
                                    }))
                                };
                            })
                        };
                    })
                };
            })
        };

        // 验证转换后的数据结构
        if (!transformed.name || !Array.isArray(transformed.children)) {
            throw new Error('Transformed data structure is invalid');
        }

        console.log('Data transformation successful:', {
            name: transformed.name,
            childrenCount: transformed.children.length
        });

        return transformed;
    } catch (error) {
        console.error('Error in transformToTree:', error);
        // 返回一个基础的错误数据结构，而不是抛出错误
        return {
            name: '数据处理出错',
            children: [{
                name: '错误信息',
                children: [{
                    name: error instanceof Error ? error.message : '未知错误',
                    children: []
                }]
            }]
        };
    }
}

export async function POST(request: NextRequest) {
    console.log('Received POST request to /api/graph');
    
    try {
        const body = await request.json();
        const { industryName } = body;

        if (!industryName) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: '请输入产业链名称',
                    data: null
                },
                { status: 400 }
            );
        }

        let data;
        try {
            // 检查是否是预设产业
            const presetIndustry = PRESET_INDUSTRIES.flatMap(category => 
                category.industries
            ).find(ind => ind.name === industryName || ind.id === industryName);

            if (presetIndustry) {
                console.log('Loading preset data for:', presetIndustry.id);
                data = await loadIndustryChainData(presetIndustry.id);
            } else {
                console.log('Calling Dify API for:', industryName);
                data = await callDifyApi(industryName);
            }

            return NextResponse.json({ 
                success: true, 
                data: data
            });
        } catch (error) {
            console.error('Error processing data:', error);
            // 返回一个用户友好的错误响应
            return NextResponse.json({ 
                success: false, 
                error: '生成产业链图谱时出现错误，请稍后重试',
                data: {
                    name: industryName,
                    children: [{
                        name: '暂无数据',
                        children: []
                    }]
                }
            }, { status: 200 }); // 使用 200 状态码，让前端能够正常处理
        }
    } catch (error) {
        console.error('Error processing request:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: '请求处理失败，请检查输入格式是否正确',
                data: null
            },
            { status: 400 }
        );
    }
} 