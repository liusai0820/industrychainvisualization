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

interface TreeNode {
    name: string;
    children: TreeNode[];
}

async function callDifyApi(industryName: string) {
    if (!INDUSTRY_CHAIN_API_KEY) {
        console.error('Missing DIFY_API_KEY environment variable');
        throw new Error('Dify API Key not configured');
    }

    console.log('Environment check:', {
        DIFY_BASE_URL: DIFY_BASE_URL,
        API_KEY_EXISTS: !!INDUSTRY_CHAIN_API_KEY,
        API_KEY_LENGTH: INDUSTRY_CHAIN_API_KEY?.length
    });

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

        const requestUrl = `${DIFY_BASE_URL}/workflows/run`;
        console.log('Request details:', {
            url: requestUrl,
            method: 'POST',
            headers: {
                'Content-Type': headers['Content-Type'],
                'Authorization': 'Bearer [HIDDEN]'
            },
            payload: JSON.stringify(payload, null, 2)
        });

        // 添加超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 50000); // 25 秒超时

        try {
            const response = await fetch(requestUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const responseText = await response.text();
            console.log('API Response details:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                responseLength: responseText.length,
                responsePreview: responseText.substring(0, 200) // 只显示前200个字符
            });

            if (!response.ok) {
                console.error('API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    response: responseText
                });
                throw new Error(`Dify API request failed: ${response.status} ${responseText}`);
            }

            let difyResponse: DifyResponse;
            try {
                // 检查responseText是否为空或者是否包含错误信息
                if (!responseText.trim()) {
                    throw new Error('Empty response from API');
                }
                
                // 尝试检测是否是错误消息
                if (responseText.includes('An error occurred') || responseText.startsWith('An error')) {
                    throw new Error(responseText);
                }
                
                difyResponse = JSON.parse(responseText) as DifyResponse;
                console.log('Successfully parsed response as JSON:', JSON.stringify(difyResponse, null, 2));
            } catch (error) {
                const parseError = error as Error;
                console.error('Failed to parse API response as JSON:', parseError);
                console.error('Response text that failed to parse:', responseText);
                
                // 如果响应包含错误信息，直接抛出该错误
                if (responseText.includes('An error occurred') || responseText.startsWith('An error')) {
                    throw new Error(responseText);
                }
                
                throw new Error(`Invalid JSON response from API: ${parseError.message}`);
            }

            if (!difyResponse.data?.outputs?.text) {
                console.error('Invalid API Response Structure:', difyResponse);
                throw new Error('Invalid response format from Dify API - missing data.outputs.text field');
            }

            const rawText = difyResponse.data.outputs.text;
            console.log('Raw answer text:', rawText);

            // 尝试提取JSON部分
            let jsonText = '';
            const jsonBlockMatch = rawText.match(/```json\n([\s\S]*?)\n```/);
            if (jsonBlockMatch) {
                jsonText = jsonBlockMatch[1].trim();
            } else {
                // 如果没有JSON代码块标记，尝试直接解析整个文本
                jsonText = rawText.trim();
            }
            
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
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                console.error('Request timeout');
                throw new Error('请求超时，请稍后重试');
            }
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

        // 创建根节点
        const transformed: TransformedData = {
            name: data.产业链,
            children: []
        };

        // 处理每个环节
        transformed.children = data.环节.map(segment => {
            const segmentNode: TreeNode = {
                name: segment.环节名称,
                children: []
            };

            // 处理子环节
            if (Array.isArray(segment.子环节)) {
                segmentNode.children = segment.子环节.map(subSegment => {
                    const subSegmentNode: TreeNode = {
                        name: subSegment.子环节名称,
                        children: []
                    };

                    // 处理子-子环节
                    if (Array.isArray(subSegment['子-子环节'])) {
                        subSegmentNode.children = subSegment['子-子环节'].map(subSubSegment => {
                            const subSubSegmentNode: TreeNode = {
                                name: subSubSegment['子-子环节名称'],
                                children: []
                            };

                            // 处理代表公司
                            if (Array.isArray(subSubSegment.代表公司)) {
                                subSubSegmentNode.children = subSubSegment.代表公司.map(company => ({
                                    name: company,
                                    children: []
                                }));
                            }

                            return subSubSegmentNode;
                        });
                    }

                    return subSegmentNode;
                });
            }

            return segmentNode;
        });

        // 验证转换后的数据结构
        if (!transformed.name || !Array.isArray(transformed.children)) {
            console.error('Invalid transformed data:', transformed);
            throw new Error('Transformed data structure is invalid');
        }

        // 记录转换结果的统计信息
        console.log('Data transformation successful:', {
            name: transformed.name,
            topLevelNodes: transformed.children.length,
            structure: transformed.children.map(node => ({
                name: node.name,
                childCount: node.children.length
            }))
        });

        return transformed;
    } catch (error) {
        console.error('Error in transformToTree:', error);
        // 返回一个基础的错误数据结构
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

        console.log('Processing request for industry:', industryName);

        if (!industryName) {
            console.warn('No industry name provided in request');
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
                console.log('Successfully loaded preset data');
            } else {
                console.log('Calling Dify API for:', industryName);
                data = await callDifyApi(industryName);
                console.log('Successfully received and transformed Dify API response');
            }

            // 验证返回的数据结构
            if (!data || typeof data !== 'object' || !data.name || !Array.isArray(data.children)) {
                console.error('Invalid data structure returned:', data);
                throw new Error('Invalid data structure returned from processing');
            }

            console.log('Returning successful response with data structure:', {
                name: data.name,
                childrenCount: data.children.length,
                totalNodes: JSON.stringify(data).match(/"name":/g)?.length || 0
            });

            return NextResponse.json({ 
                success: true, 
                data: data
            }, { headers });
        } catch (error) {
            console.error('Error processing data:', error);
            // 返回一个用户友好的错误响应
            const errorMessage = error instanceof Error ? error.message : '生成产业链图谱时出现错误，请稍后重试';
            console.log('Returning error response:', errorMessage);
            
            return NextResponse.json({ 
                success: false, 
                error: errorMessage,
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