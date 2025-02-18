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

        // 去掉 markdown 代码块标记，然后解析 JSON
        const jsonText = result.data.outputs.text.replace(/```json\n|```/g, '').trim();
        const data = JSON.parse(jsonText);
        
        // 检查数据结构
        if (!data.产业链 || !Array.isArray(data.环节)) {
            console.error('Data structure validation failed:', data);
            throw new Error('Invalid data structure - missing required fields');
        }

        return transformToTree(data);
    } catch (error) {
        console.error('Error in callDifyApi:', error);
        throw error;
    }
}

// 修改 transformToTree 函数的类型定义
interface RawData {
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

interface TransformedData {
    name: string;
    children: Array<{
        name: string;
        children: Array<{
            name: string;
            children: Array<{
                name: string;
                children: Array<{
                    name: string;
                }>;
            }>;
        }>;
    }>;
}

function transformToTree(data: RawData): TransformedData {
    try {
        const transformed = {
            name: data.产业链,
            children: data.环节.map(segment => ({
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

        // 验证转换后的数据结构
        console.log('Transformed data validation:', {
            hasName: !!transformed.name,
            hasChildren: Array.isArray(transformed.children),
            childrenCount: transformed.children?.length,
            firstChildStructure: transformed.children?.[0] ? {
                hasName: !!transformed.children[0].name,
                hasChildren: Array.isArray(transformed.children[0].children),
                childrenCount: transformed.children[0].children?.length
            } : null
        });

        return transformed;
    } catch (error) {
        console.error('Error in transformToTree:', error);
        throw new Error('Failed to transform data structure');
    }
}

export async function POST(request: NextRequest) {
    console.log('Received POST request to /api/graph');
    
    try {
        const body = await request.json();
        const { industryName } = body;

        if (!industryName) {
            console.log('Missing industry name in request');
            return NextResponse.json(
                { success: false, error: '请输入产业链名称' },
                { status: 400 }
            );
        }

        // 检查是否是预设产业
        const presetIndustry = PRESET_INDUSTRIES.flatMap(category => 
            category.industries
        ).find(ind => ind.name === industryName || ind.id === industryName);

        let data;
        if (presetIndustry) {
            // 使用预设数据
            console.log('Loading preset data for:', presetIndustry.id);
            data = await loadIndustryChainData(presetIndustry.id);
        } else {
            // 调用 Dify API
            console.log('Calling Dify API for:', industryName);
            data = await callDifyApi(industryName);
        }

        // 验证返回的数据结构
        if (!data || typeof data !== 'object' || !data.name || !Array.isArray(data.children)) {
            console.error('Invalid transformed data structure:', data);
            throw new Error('Invalid data structure after transformation');
        }

        return NextResponse.json({ 
            success: true, 
            data: {
                name: data.name,
                children: data.children
            }
        });
    } catch (error) {
        console.error('Error processing request:', error);
        const errorMessage = error instanceof Error ? error.message : '处理请求失败';
        
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
} 