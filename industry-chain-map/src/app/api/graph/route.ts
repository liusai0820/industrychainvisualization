import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { PRESET_INDUSTRIES } from '@/data/preset-industries';
import { loadIndustryChainData } from '@/utils/dataLoader';

const DIFY_BASE_URL = process.env.DIFY_BASE_URL || "https://api.dify.ai/v1";
const INDUSTRY_CHAIN_API_KEY = process.env.DIFY_API_KEY;

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
                }>;
            }>;
        }>;
    }>;
}

interface DifyResponse {
    data: {
        outputs: {
            text: string;
        };
    };
}

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
            headers: {
                ...headers,
                Authorization: 'Bearer [HIDDEN]'
            },
            payload: JSON.stringify(payload, null, 2)
        });

        const response = await fetch(`${DIFY_BASE_URL}/workflows/run`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        console.log('Raw API Response Status:', response.status);
        console.log('Raw API Response Headers:', Object.fromEntries(response.headers.entries()));
        console.log('Raw API Response Text:', responseText);

        if (!response.ok) {
            console.error('API Error Response:', responseText);
            throw new Error(`Dify API request failed: ${response.status} ${responseText}`);
        }

        let difyResponse: DifyResponse;
        try {
            // 检查responseText是否为空
            if (!responseText.trim()) {
                throw new Error('Empty response from API');
            }
            
            difyResponse = JSON.parse(responseText) as DifyResponse;
            console.log('Successfully parsed response as JSON:', JSON.stringify(difyResponse, null, 2));
        } catch (error) {
            const parseError = error as Error;
            console.error('Failed to parse API response as JSON:', parseError);
            console.error('Response text that failed to parse:', responseText);
            throw new Error(`Invalid JSON response from API: ${parseError.message}`);
        }

        if (!difyResponse.data?.outputs?.text) {
            console.error('Invalid API Response Structure:', difyResponse);
            throw new Error('Invalid response format from Dify API - missing data.outputs.text field');
        }

        try {
            // 处理Dify返回的数据格式
            const rawText = difyResponse.data.outputs.text;
            console.log('Raw answer text:', rawText);

            // 检查是否包含JSON代码块
            const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/);
            const jsonText = jsonMatch ? jsonMatch[1].trim() : rawText.trim();
            
            console.log('Extracted JSON text:', jsonText);
            
            let data: RawData;
            try {
                data = JSON.parse(jsonText) as RawData;
                console.log('Successfully parsed JSON data:', JSON.stringify(data, null, 2));
            } catch (error) {
                const parseError = error as Error;
                console.error('JSON Parse Error:', parseError);
                console.error('Invalid JSON text:', jsonText);
                throw new Error(`Failed to parse JSON from text: ${parseError.message}`);
            }
            
            // 检查数据结构
            if (!data.产业链 || !Array.isArray(data.环节)) {
                console.error('Data structure validation failed:', data);
                throw new Error(`Invalid data structure - missing required fields. Got: ${JSON.stringify(data)}`);
            }

            const transformedResult = transformToTree(data);
            console.log('Final transformed result:', JSON.stringify(transformedResult, null, 2));
            return transformedResult;
        } catch (error) {
            console.error('Error processing Dify API response:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error in callDifyApi:', error);
        throw error;
    }
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

        const transformed: TransformedData = {
            name: data.产业链,
            children: data.环节.map(segment => ({
                name: segment.环节名称 || '未知环节',
                children: Array.isArray(segment.子环节) ? segment.子环节.map(subSegment => ({
                    name: subSegment.子环节名称 || '未知子环节',
                    children: Array.isArray(subSegment['子-子环节']) ? subSegment['子-子环节'].map(subSubSegment => ({
                        name: subSubSegment['子-子环节名称'] || '未知子-子环节',
                        children: Array.isArray(subSubSegment.代表公司) ? subSubSegment.代表公司.map(company => ({
                            name: company
                        })) : []
                    })) : []
                })) : []
            }))
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
    
    // 添加CORS头
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // 处理预检请求
    if (request.method === 'OPTIONS') {
        return new NextResponse(null, { status: 200, headers });
    }
    
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
                { status: 400, headers }
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
            }, { headers });
        } catch (error) {
            console.error('Error processing data:', error);
            // 返回一个用户友好的错误响应
            return NextResponse.json({ 
                success: false, 
                error: error instanceof Error ? error.message : '生成产业链图谱时出现错误，请稍后重试',
                data: {
                    name: industryName,
                    children: [{
                        name: '暂无数据',
                        children: []
                    }]
                }
            }, { status: 200, headers }); // 使用 200 状态码，让前端能够正常处理
        }
    } catch (error) {
        console.error('Error processing request:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: '请求处理失败，请检查输入格式是否正确',
                data: null
            },
            { status: 400, headers }
        );
    }
} 