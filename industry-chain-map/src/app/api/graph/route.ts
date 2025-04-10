import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateIndustryGraphPrompt } from '@/prompts/industryGraph';
import fetch from 'node-fetch';

const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// 添加多个模型选项
const MODELS = [
  process.env.INDUSTRY_GRAPH_MODEL || "google/gemini-2.5-pro-exp-03-25:free",
  "anthropic/claude-3-haiku-20240307",
  "anthropic/claude-3-sonnet-20240229",
  "openai/gpt-3.5-turbo"
];

const INDUSTRY_GRAPH_TEMPERATURE = parseFloat(process.env.INDUSTRY_GRAPH_TEMPERATURE || "0.3");

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

interface TreeNode {
    name: string;
    children: TreeNode[];
}

// OpenRouter API 响应接口定义
interface OpenRouterResponse {
    model?: string;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    choices?: Array<{
        finish_reason: string;
        message: {
            role: string;
            content: string;
        };
    }>;
    error?: {
        message: string;
        code: number;
    };
    [key: string]: unknown; // 允许其他可能的字段
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

// 正确验证RawData结构的函数
function isValidRawData(data: unknown): data is RawData {
  return (
    data !== null && 
    typeof data === 'object' && 
    '产业链' in data && 
    typeof (data as RawData).产业链 === 'string' && 
    '环节' in data && 
    Array.isArray((data as RawData).环节)
  );
}

async function generateGraphWithOpenRouter(industryName: string): Promise<RawData> {
    if (!OPENROUTER_API_KEY) {
        console.error('Missing OPENROUTER_API_KEY environment variable');
        throw new Error('OpenRouter API Key not configured');
    }

    const maxRetries = 3;
    const baseDelay = 2000;

    // 尝试不同的模型
    for (let modelIndex = 0; modelIndex < MODELS.length; modelIndex++) {
        const model = MODELS[modelIndex];
        console.log(`尝试使用模型 (${modelIndex + 1}/${MODELS.length}): ${model}`);

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = baseDelay * Math.pow(2, attempt);
                    console.log(`模型 ${model} 重试第 ${attempt + 1} 次, 等待 ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                const headers = {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "HTTP-Referer": "https://industry-chain-map.vercel.app",
                    "X-Title": "Industry Chain Map",
                    "X-Organization-ID": "industry-chain-map"
                };
                
                // 直接使用用户提供的产业链名称，由模型自行判断并进行标准化
                const prompt = generateIndustryGraphPrompt(industryName);
                console.log('Generated Graph Prompt length:', prompt.length);

                const payload = {
                    "model": model,
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "response_format": { "type": "json_object" },
                    "temperature": INDUSTRY_GRAPH_TEMPERATURE,
                    "top_p": 1,
                    "frequency_penalty": 0,
                    "presence_penalty": 0,
                    "stream": false
                };

                console.log('Sending OpenRouter Graph Request:', {
                    url: OPENROUTER_API_URL,
                    model: payload.model,
                    temperature: payload.temperature,
                    promptLength: prompt.length,
                    headers: { ...headers, "Authorization": "Bearer [HIDDEN]" }
                });

                const fetchOptions = {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload),
                    redirect: 'follow' as const
                };

                // 修改使用node-fetch的方式，避免AbortSignal类型问题
                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => reject(new Error('OpenRouter API request timeout')), 5 * 60 * 1000);
                });

                const fetchPromise = fetch(OPENROUTER_API_URL, fetchOptions);
                
                const response = await Promise.race([fetchPromise, timeoutPromise]);

                console.log('Received OpenRouter Graph Response:', {
                    status: response.status,
                    statusText: response.statusText
                });

                // 获取响应内容（无论成功或失败）
                const responseText = await response.text();
                let responseData: OpenRouterResponse;

                // 尝试解析JSON响应
                try {
                    responseData = JSON.parse(responseText) as OpenRouterResponse;
                    console.log('Successfully parsed API response as JSON');
                } catch (parseError) {
                    console.error('Failed to parse API response as JSON:', parseError);
                    console.error('Raw response:', responseText);
                    throw new Error(`Failed to parse API response: ${responseText.substring(0, 200)}...`);
                }

                if (!response.ok) {
                    console.error('OpenRouter API Error:', {
                        status: response.status,
                        statusText: response.statusText,
                        error: responseData.error || 'Unknown error',
                        errorDetails: JSON.stringify(responseData)
                    });
                    
                    // 构建详细的错误消息
                    let errorMessage = `OpenRouter API request failed: ${response.status} - `;
                    if (responseData.error && responseData.error.message) {
                        errorMessage += responseData.error.message;
                    } else {
                        errorMessage += JSON.stringify(responseData);
                    }
                    
                    if (attempt === maxRetries - 1) {
                        // 如果当前模型的最后一次尝试也失败，尝试下一个模型
                        console.log(`模型 ${model} 的所有尝试都失败了，将尝试下一个模型`);
                        console.error(`失败原因: ${errorMessage}`);
                        break; // 跳出当前模型的尝试循环
                    }
                    continue;
                }

                console.log('OpenRouter Graph Response Data:', {
                    model: responseData.model || 'Unknown',
                    usage: responseData.usage || 'Unknown',
                    finishReason: responseData.choices?.[0]?.finish_reason || 'N/A',
                    choicesCount: responseData.choices?.length || 0
                });

                if (!responseData.choices || responseData.choices.length === 0 || !responseData.choices[0].message?.content) {
                    console.error('Invalid OpenRouter response structure or empty content:', responseData);
                    
                    if (responseData.error) {
                        throw new Error(`API returned error: ${JSON.stringify(responseData.error)}`);
                    } else {
                        throw new Error('Invalid API response format or empty content from OpenRouter');
                    }
                }

                // 获取内容
                const jsonContent = responseData.choices[0].message.content;
                console.log('Received JSON content length:', jsonContent.length);
                console.log('Received JSON content preview:', jsonContent.substring(0, 200) + '...');
                
                try {
                    // 直接尝试解析JSON，不再使用extractJsonFromText
                    const parsedData = JSON.parse(jsonContent);
                    
                    // 使用新函数验证数据结构
                    if (!isValidRawData(parsedData)) {
                        console.error('Parsed JSON data does not match RawData structure:', parsedData);
                        throw new Error('LLM returned JSON does not match expected RawData structure.');
                    }
                    
                    console.log('Successfully parsed JSON data from OpenRouter.');
                    return parsedData;
                } catch (parseError) {
                    console.error('Failed to parse JSON response from OpenRouter:', parseError);
                    
                    // 如果不是最后一次尝试，继续重试
                    if (attempt < maxRetries - 1) {
                        console.log('Will retry with different settings...');
                        continue;
                    }
                    
                    // 如果是此模型的最后一次尝试，尝试下一个模型
                    console.log(`模型 ${model} 解析JSON失败，将尝试下一个模型`);
                    break;
                }
            } catch (error) {
                console.error(`模型 ${model} 第 ${attempt + 1} 次尝试失败:`, error);
                if (attempt === maxRetries - 1) {
                    // 如果是此模型的最后一次尝试，尝试下一个模型
                    console.log(`模型 ${model} 的所有尝试都失败了，将尝试下一个模型`);
                    // 如果是最后一个模型，则不抛出错误，而是继续到下一个模型
                    if (modelIndex === MODELS.length - 1) {
                        throw new Error(`所有模型都失败了: ${error instanceof Error ? error.message : String(error)}`);
                    }
                }
            }
        }
    }
    
    throw new Error('All OpenRouter model attempts failed.');
}

export async function POST(request: NextRequest) {
    console.log('Received POST request to /api/graph (Using OpenRouter)');
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
        return new NextResponse(null, { status: 200, headers });
    }
    
    try {
        const body = await request.json();
        const { industryName } = body;

        console.log('Processing graph request for industry:', industryName);

        if (!industryName) {
            console.warn('No industry name provided in request');
            return NextResponse.json(
                { success: false, error: '请输入产业链名称', data: null },
                { status: 400, headers }
            );
        }

        try {
            console.log('Calling OpenRouter API for:', industryName);
            
            const rawData = await generateGraphWithOpenRouter(industryName);
            console.log('Successfully received raw data from OpenRouter');
            
            // 如果能运行到这里，说明rawData已经通过了isValidRawData验证
            const transformedData = transformToTree(rawData);
            console.log('Successfully transformed data to tree structure');

            // 验证转换后的数据
            if (!transformedData || typeof transformedData !== 'object' || !transformedData.name || !Array.isArray(transformedData.children)) {
                console.error('Invalid transformed data structure returned:', transformedData);
                throw new Error('生成的数据结构无效，请稍后重试');
            }

            return NextResponse.json({ success: true, data: transformedData }, { headers });
            
        } catch (error) {
            console.error('Error generating graph data:', error);
            const errorMessage = error instanceof Error ? error.message : '生成产业链图谱时出现错误，请稍后重试';
            
            const userFriendlyMessage = errorMessage.includes('API Key not configured') 
                ? '系统配置错误，请联系管理员'
                : errorMessage;
            
            return NextResponse.json({ 
                success: false, 
                error: userFriendlyMessage,
                data: {
                    name: industryName,
                    children: [{
                        name: '生成失败',
                        children: []
                    }]
                }
            }, { status: 500, headers });
        }
    } catch (error) {
        console.error('Error processing graph request body:', error);
        return NextResponse.json(
            { success: false, error: '请求处理失败，请检查输入格式是否正确', data: null },
            { status: 400, headers }
        );
    }
} 