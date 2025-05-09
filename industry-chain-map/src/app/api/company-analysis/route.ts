import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateCompanyAnalysisPrompt } from '@/prompts/companyAnalysis';
import fetch, { RequestInit } from 'node-fetch';

// 声明为Edge Function，避免60秒的超时限制
export const runtime = 'edge';

// OpenRouter配置
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// 定义超时配置
const API_TIMEOUT_SETTINGS = {
  ROUTE_TIMEOUT: 580 * 1000,  // 路由级别超时，9分40秒（接近Vercel Edge的10分钟限制）
  API_CALL_TIMEOUT: 15 * 60 * 1000, // API调用总超时，15分钟
  MODEL_TIMEOUT: 5 * 60 * 1000  // 单个模型请求超时，5分钟
};

// 添加多个模型选项
const MODELS = [
  process.env.COMPANY_ANALYSIS_MODEL || "google/gemini-2.5-pro-exp-03-25:free",
  "anthropic/claude-3-haiku-20240307",
  "anthropic/claude-3-sonnet-20240229",
  "openai/gpt-3.5-turbo"
];

// 从环境变量获取温度配置
const COMPANY_ANALYSIS_TEMPERATURE = parseFloat(process.env.COMPANY_ANALYSIS_TEMPERATURE || "0.5");

// 响应类型定义
interface OpenRouterResponse {
  choices?: Array<{
    message: {
      content: string;
    };
    index: number;
    finish_reason: string;
  }>;
  model?: string;
  id?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    message: string;
    code: number;
  };
  [key: string]: unknown; // 允许其他可能的字段
}

// 分析结果类型定义
interface AnalysisSection {
  title: string;
  content: string;
}

interface AnalysisResult {
  rawMarkdown: string;
  sections: AnalysisSection[];
}

// 定义一个简化的备用结果，以防API调用超时
const generateFallbackResult = (companyName: string, industryName?: string): AnalysisResult => {
  const content = `# ${companyName}企业分析报告

## 1. 公司概况
${companyName}是${industryName || '该行业'}中的重要企业。由于当前网络请求超时，暂时无法提供完整分析，这是一个自动生成的简要报告。

## 2. 行业地位
作为${industryName || '该行业'}的参与者，${companyName}在市场中扮演着重要角色。

## 3. 产品与服务
${companyName}的主要产品和服务面向市场需求，具有一定的竞争力。

## 4. 竞争分析
${companyName}的主要竞争对手包括行业内其他知名企业，各有优势。

## 5. SWOT分析

### 优势(Strengths)
- 品牌影响力
- 市场占有率
- 产品质量

### 劣势(Weaknesses)
- 有待提升的领域
- 市场挑战

### 机会(Opportunities)
- 市场扩张潜力
- 新兴市场机会

### 威胁(Threats)
- 市场竞争加剧
- 政策变化风险

*注：本报告为系统自动生成的简化版本，完整分析报告正在生成中，请稍后再试。*`;

  // 创建简化的章节
  const sections = [
    { title: '公司概况', content: '公司基本情况概述...' },
    { title: '行业地位', content: '在行业中的位置分析...' },
    { title: '产品与服务', content: '主要产品和服务介绍...' },
    { title: '竞争分析', content: '主要竞争对手分析...' },
    { title: 'SWOT分析', content: '优势、劣势、机会和威胁分析...' }
  ];

  return {
    rawMarkdown: content,
    sections: sections
  };
};

// 简单请求去重机制 - 创建一个基于内存的缓存，存储最近的请求
// 注意：这是一个基于内存的简单解决方案，重启服务器会清空此缓存
const recentRequests = new Map<string, { 
  timestamp: number, 
  processing: boolean, 
  responsePromise?: Promise<any>, 
  lockUntil?: number,
  requestIds: Set<string> // 记录关联的请求ID，用于识别实际的重复请求 
}>();

// 清理超过10分钟的请求记录
const CACHE_EXPIRY_MS = 10 * 60 * 1000; // 10分钟
// 设置锁定时间，防止短时间内重复请求
const REQUEST_LOCK_MS = 1000; // 降低到1秒内不允许重复请求
// 当遇到重复请求时的锁定时间递增 (指数退避)
const REQUEST_LOCK_BACKOFF_MS = 1000; // 每次递增1秒
// 请求ID缓存过期时间
const REQUEST_ID_EXPIRY_MS = 60 * 1000; // 1分钟内认为是同一个请求

// 定期清理过期的请求记录
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of recentRequests.entries()) {
    if (now - value.timestamp > CACHE_EXPIRY_MS) {
      recentRequests.delete(key);
    }
  }
}, 60 * 1000); // 每分钟清理一次

export async function POST(request: NextRequest) {
  console.log('\n=== 收到企业分析请求 ===');
  
  try {
    // 最外层超时控制
    const routeTimeoutPromise = new Promise<NextResponse>((resolve) => {
      setTimeout(() => {
        console.warn('⚠️ 路由处理整体超时，返回通用备用响应');
        resolve(NextResponse.json({
          success: true,
          data: generateFallbackResult('请求的企业', '所在行业'),
          fallbackReason: 'edge_timeout'
        }, { 
          status: 200,
          headers: {
            'Cache-Control': 'no-store, max-age=0',
            'X-Fallback': 'true'
          }
        }));
      }, API_TIMEOUT_SETTINGS.ROUTE_TIMEOUT);
    });
    
    // 实际处理逻辑
    const actualResponsePromise = (async () => {
      // 获取请求的唯一ID
      const requestId = request.headers.get('x-request-id') || 
                       request.headers.get('x-correlation-id') || 
                       Date.now().toString() + Math.random().toString(36).substring(2, 15);
      
      // 获取客户端IP作为额外标识
      const ip = request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown';
                 
      console.log(`📌 请求ID: ${requestId}, 客户端: ${ip}`);
      
      // 使用克隆请求体，以便可以多次读取
      const clonedRequest = request.clone();
      const { companyName, industryName } = await request.json();
      console.log('📝 解析请求参数:', { companyName, industryName });

      if (!companyName) {
        console.warn('⚠️ 企业名称为空');
        return NextResponse.json(
          { success: false, error: '企业名称不能为空' },
          { status: 400 }
        );
      }

      // 创建请求标识符（公司名+行业名）
      const requestKey = `${companyName}:${industryName || ''}`;
      
      // 检查是否有相同请求正在处理中
      const existingRequest = recentRequests.get(requestKey);
      const now = Date.now();
      
      // 如果存在请求记录，检查是否是同一请求的重复发送
      if (existingRequest) {
        // 添加新的请求ID到集合中
        existingRequest.requestIds.add(requestId);
        
        console.log(`该公司的请求记录已存在，当前请求数: ${existingRequest.requestIds.size}`);
        
        // 强制锁定检查 - 如果有锁定时间且当前时间小于锁定时间
        if (existingRequest.lockUntil && now < existingRequest.lockUntil) {
          const timeLeft = Math.ceil((existingRequest.lockUntil - now) / 1000);
          console.warn(`⚠️ 请求被锁定: ${requestKey}, 剩余锁定时间: ${timeLeft}秒, 已记录请求数: ${existingRequest.requestIds.size}`);
          return NextResponse.json(
            { 
              success: false, 
              error: `请勿频繁请求同一企业分析，请等待${timeLeft}秒后再试`,
              lockTimeLeft: timeLeft,
              requestCount: existingRequest.requestIds.size
            },
            { 
              status: 429,  // 使用 429 Too Many Requests 状态码
              headers: {
                'Retry-After': String(timeLeft),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(existingRequest.lockUntil),
                'X-Request-ID': requestId,
                'Access-Control-Expose-Headers': 'Retry-After, X-RateLimit-Remaining, X-RateLimit-Reset'
              }
            }
          );
        }
        
        // 检查是否在锁定期内，或者请求数超过阈值
        const isWithinLockPeriod = (now - existingRequest.timestamp < REQUEST_LOCK_MS);
        const hasExcessiveRequests = (existingRequest.requestIds.size > 3);
        
        // 只有在锁定期内或请求过多时才拦截请求
        if (isWithinLockPeriod && hasExcessiveRequests) {
          // 计算新的锁定时间 (指数退避策略)
          const repeatFactor = Math.min(existingRequest.requestIds.size, 5); // 最多锁定5秒
          const newLockTime = now + (REQUEST_LOCK_BACKOFF_MS * repeatFactor);
          
          console.warn(`⚠️ 检测到重复请求: ${requestKey}, 请求数: ${existingRequest.requestIds.size}, 锁定至: ${new Date(newLockTime).toISOString()}`);
          
          // 更新锁定时间
          recentRequests.set(requestKey, {
            ...existingRequest,
            lockUntil: newLockTime
          });
          
          const lockTimeSeconds = Math.ceil((newLockTime - now) / 1000);
          
          return NextResponse.json(
            { 
              success: false, 
              error: `请勿频繁请求，请等待${lockTimeSeconds}秒后再试`,
              lockTimeLeft: lockTimeSeconds,
              requestCount: existingRequest.requestIds.size
            },
            { 
              status: 429,  // 使用 429 Too Many Requests 状态码
              headers: {
                'Retry-After': String(lockTimeSeconds),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(newLockTime),
                'X-Request-ID': requestId,
                'Access-Control-Expose-Headers': 'Retry-After, X-RateLimit-Remaining, X-RateLimit-Reset'
              }
            }
          );
        }
        
        // 如果请求仍在处理中，且已经有响应Promise，则复用该Promise
        if (existingRequest.processing && existingRequest.responsePromise) {
          console.log(`🔄 复用正在处理的请求: ${requestKey}, 请求ID: ${requestId}`);
          try {
            const result = await existingRequest.responsePromise;
            
            // 清除锁定
            if (existingRequest.lockUntil) {
              recentRequests.set(requestKey, {
                ...existingRequest,
                lockUntil: undefined
              });
            }
            
            return NextResponse.json({
              success: true,
              data: result,
              reused: true  // 标记为复用的结果
            }, {
              headers: {
                'X-Request-ID': requestId,
                'Cache-Control': 'public, max-age=3600'
              }
            });
          } catch (error) {
            // 如果复用的Promise失败，则继续执行新的请求
            console.warn(`⚠️ 复用的请求失败，将创建新请求: ${error}`);
          }
        }
      }

      // 检查OPENROUTER_API_KEY是否配置
      if (!OPENROUTER_API_KEY) {
        console.error('❌ 缺少OpenRouter API密钥');
        return NextResponse.json(
          { success: false, error: 'API配置错误' },
          { status: 500 }
        );
      }
      
      // 创建一个Promise来处理请求，并保存在缓存中
      const responsePromise = generateCompanyAnalysis(companyName, industryName);
      
      // 标记请求为正在处理，并保存请求Promise
      recentRequests.set(requestKey, { 
        timestamp: now, 
        processing: true,
        responsePromise,
        lockUntil: undefined,
        requestIds: new Set([requestId]) // 初始化请求ID集合
      });

      try {
        console.log(`🚀 开始生成企业分析... 请求ID: ${requestId}`);
        const analysisResult = await responsePromise;
        console.log(`✅ 企业分析生成完成, 请求ID: ${requestId}\n`);
        
        // 更新请求状态为已完成但保留结果
        if (recentRequests.has(requestKey)) {
          recentRequests.set(requestKey, { 
            timestamp: Date.now(), // 更新时间戳
            processing: false,
            responsePromise, // 保留结果以便后续复用
            lockUntil: undefined,
            requestIds: recentRequests.get(requestKey)!.requestIds // 保留请求ID记录
          });
        }
        
        return NextResponse.json({
          success: true,
          data: analysisResult
        }, {
          headers: {
            'X-Request-ID': requestId,
            'Cache-Control': 'public, max-age=3600', // 允许客户端缓存结果1小时
            'X-Cache-Hit': 'false'
          }
        });
      } catch (error) {
        // 处理错误情况
        console.error(`❌ 企业分析生成失败, 请求ID: ${requestId}:`, error);
        
        // 移除失败的请求缓存
        if (recentRequests.has(requestKey)) {
          recentRequests.delete(requestKey);
        }
        
        // 返回一个备用结果而不是抛出错误
        console.warn('返回备用结果');
        return NextResponse.json({
          success: true,
          data: generateFallbackResult(companyName, industryName),
          error: error instanceof Error ? error.message : '企业分析失败，但已返回备用结果',
          fallbackReason: 'api_error'
        }, {
          headers: {
            'X-Request-ID': requestId,
            'Cache-Control': 'no-store',
            'X-Fallback': 'true'
          }
        });
      }
    })();
    
    // 竞争实际响应和超时响应
    return Promise.race([actualResponsePromise, routeTimeoutPromise]);
    
  } catch (error) {
    console.error('❌ 企业分析API错误:', error);
    
    // 返回备用结果而不是错误
    return NextResponse.json(
      { 
        success: true, 
        data: generateFallbackResult('未知企业', '未知行业'),
        error: error instanceof Error ? error.message : '企业分析失败，但已返回备用结果',
        fallbackReason: 'unhandled_error'
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
          'X-Fallback': 'true'
        }
      }
    );
  }
}

async function generateCompanyAnalysis(companyName: string, industryName?: string) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API Key not configured');
  }

  const maxRetries = 3;
  const baseDelay = 2000;
  
  // 创建全局API超时保护，确保函数一定会在规定时间内返回结果
  const timeoutPromise = new Promise<AnalysisResult>((resolve) => {
    setTimeout(() => {
      console.warn(`⚠️ API调用全局超时，使用备用结果: ${companyName}`);
      resolve(generateFallbackResult(companyName, industryName));
    }, API_TIMEOUT_SETTINGS.API_CALL_TIMEOUT);
  });

  // 创建实际API调用的Promise
  const apiCallPromise = (async () => {
    try {
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
            
            // 直接使用用户提供的参数，由模型自行判断处理行业信息
            const prompt = generateCompanyAnalysisPrompt({ 
              companyName, 
              industryName 
            });
            console.log('生成的prompt长度:', prompt.length);

            const payload = {
              "model": model,
              "messages": [
                {
                  "role": "user",
                  "content": prompt
                }
              ],
              "temperature": COMPANY_ANALYSIS_TEMPERATURE,
              "top_p": 1,
              "frequency_penalty": 0,
              "presence_penalty": 0,
              "stream": false
            };

            console.log('准备发送OpenRouter请求:', {
              url: OPENROUTER_API_URL,
              model: payload.model,
              temperature: payload.temperature,
              promptLength: prompt.length,
              maxTokens: 50000,
              headers: {
                ...headers,
                "Authorization": "Bearer [HIDDEN]"
              }
            });

            const fetchOptions: RequestInit = {
              method: 'POST',
              headers,
              body: JSON.stringify(payload),
              redirect: 'follow'
            };

            try {
              console.log('开始请求OpenRouter API...');
              
              // 单个模型请求的超时时间更短，确保有机会尝试其他模型
              const modelTimeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('单次模型请求超时')), API_TIMEOUT_SETTINGS.MODEL_TIMEOUT);
              });

              const fetchPromise = fetch(OPENROUTER_API_URL, fetchOptions);
              const response = await Promise.race([fetchPromise, modelTimeoutPromise]) as Response;

              console.log('收到OpenRouter响应:', {
                status: response.status,
                statusText: response.statusText
              });

              // 获取响应内容（无论成功或失败）
              console.log('尝试读取响应文本...');
              const responseText = await response.text();
              console.log('成功读取响应文本，长度:', responseText.length);
              console.log('响应文本前500字符:', responseText.substring(0, 500)); // 记录部分原始响应

              let responseData: OpenRouterResponse;

              // 尝试解析JSON响应
              try {
                console.log('尝试解析响应为JSON...');
                responseData = JSON.parse(responseText) as OpenRouterResponse;
                console.log('成功解析API响应为JSON');
              } catch (parseError) {
                console.error('无法解析API响应为JSON:', parseError);
                console.error('原始响应 (前500字符):', responseText.substring(0, 500)); // 在错误时也记录
                throw new Error(`无法解析API响应: ${responseText.substring(0, 200)}...`);
              }

              // 检查是否有错误
              if (!response.ok) {
                console.error('OpenRouter API错误:', {
                  status: response.status,
                  statusText: response.statusText,
                  error: responseData.error || '未知错误',
                  errorDetails: JSON.stringify(responseData)
                });
                
                // 构建详细的错误消息
                let errorMessage = `OpenRouter API请求失败: ${response.status} - `;
                if (responseData.error && responseData.error.message) {
                  errorMessage += responseData.error.message;
                } else {
                  errorMessage += JSON.stringify(responseData);
                }
                
                if (attempt === maxRetries - 1) {
                  throw new Error(errorMessage);
                }
                continue;
              }

              // 现在responseData是成功解析的JSON
              console.log('OpenRouter响应数据:', {
                model: responseData.model || '未知',
                usage: responseData.usage || '未知',
                finishReason: responseData.choices && responseData.choices.length > 0 
                  ? responseData.choices[0].finish_reason 
                  : 'N/A',
                choicesCount: responseData.choices ? responseData.choices.length : 0
              });
              
              // 检查响应是否包含所需的字段
              if (!responseData.choices || responseData.choices.length === 0 || !responseData.choices[0].message?.content) {
                console.error('无效的API响应结构或内容为空:', responseData);
                
                if (responseData.error) {
                  throw new Error(`API返回错误: ${JSON.stringify(responseData.error)}`);
                } else {
                  throw new Error('API响应格式错误或内容为空');
                }
              }

              const analysisText = responseData.choices[0].message.content;
              console.log('成功获取分析文本，长度:', analysisText.length);
              
              // 记录原始文本的前200个字符，帮助调试
              console.log('分析文本前200个字符:', analysisText.substring(0, 200));
              
              console.log('开始调用 processAnalysisResult 处理文本...');
              const processedResult = processAnalysisResult(analysisText);
              console.log('processAnalysisResult 处理完成。');
              console.log('处理完成，sections数量:', processedResult.sections.length);
              
              // 记录提取的章节标题，帮助调试
              if (processedResult.sections.length > 0) {
                console.log('提取的章节标题:', processedResult.sections.map(s => s.title));
              }
              
              return processedResult;
            } catch (error) {
              console.error('OpenRouter请求错误:', error);
              if (attempt === maxRetries - 1 && modelIndex === MODELS.length - 1) {
                // 只有在最后一次尝试的最后一个模型时才返回备用结果
                console.warn('所有模型尝试失败，但会继续执行全局Promise race');
                throw error; // 让全局Promise.race决定是否使用备用结果
              }
              throw error;
            }
          } catch (error) {
            console.error(`模型 ${model} 第 ${attempt + 1} 次尝试失败:`, error);
            if (attempt === maxRetries - 1) {
              // 当前模型的所有尝试都失败了
              console.log(`模型 ${model} 的所有尝试都失败了，将尝试下一个模型`);
              
              // 如果是最后一个模型的最后一次尝试，抛出错误让外层处理
              if (modelIndex === MODELS.length - 1) {
                throw error;
              }
              
              // 否则继续尝试下一个模型
              break;
            }
          }
        }
      }
      
      // 所有模型和尝试都失败，不返回备用结果，让外层Promise.race决定
      throw new Error('所有模型和重试尝试都失败了');
    } catch (error) {
      // 所有API调用都失败，返回备用结果
      console.warn('API调用过程中出现错误，使用备用结果:', error);
      return generateFallbackResult(companyName, industryName);
    }
  })();

  // 竞争两个Promise，无论哪个先完成都返回结果
  return Promise.race([apiCallPromise, timeoutPromise]);
}

function processAnalysisResult(markdownText: string): AnalysisResult {
  console.log('进入 processAnalysisResult 函数');
  // 移除可能的大模型生成声明
  const cleanedMarkdown = markdownText
    .replace(/\*\s*本报告由.*?AI.*?模型.*?生成.*?\*/g, '')
    .replace(/\*\s*报告生成时间.*?\*/g, '')
    .replace(/\n*$/, ''); // 移除末尾的空行

  console.log('开始处理Markdown文本，长度:', cleanedMarkdown.length);
  
  // 分割成章节
  const sections: AnalysisSection[] = [];
  
  // 尝试多种标题格式匹配
  // 1. 匹配 "## 1. 标题" 或 "## 标题" 格式
  const headingRegex = /(?:^|\n)#{1,3}\s*(?:\d+\.\s*)?(.+?)(?:\n|$)/g;
  let match;
  
  // 收集所有标题及其位置
  const headings: {title: string, index: number}[] = [];
  while ((match = headingRegex.exec(cleanedMarkdown)) !== null) {
    headings.push({
      title: match[1].trim(),
      index: match.index
    });
  }
  
  console.log('找到标题数量:', headings.length);
  
  // 如果找不到标题，尝试其他格式
  if (headings.length === 0) {
    // 尝试匹配 "1. 标题" 格式（数字+点+空格开头的行）
    const numberedHeadingRegex = /(?:^|\n)(\d+\.\s*.+?)(?:\n|$)/g;
    while ((match = numberedHeadingRegex.exec(cleanedMarkdown)) !== null) {
      headings.push({
        title: match[1].trim(),
        index: match.index
      });
    }
    
    console.log('使用备用格式找到标题数量:', headings.length);
  }
  
  // 如果仍然找不到标题，尝试使用粗体文本作为标题
  if (headings.length === 0) {
    const boldHeadingRegex = /(?:^|\n)\*\*(.+?)\*\*(?:\n|$)/g;
    while ((match = boldHeadingRegex.exec(cleanedMarkdown)) !== null) {
      headings.push({
        title: match[1].trim(),
        index: match.index
      });
    }
    
    console.log('使用粗体文本作为标题，找到数量:', headings.length);
  }
  
  // 如果找到了标题，处理每个章节
  if (headings.length > 0) {
    // 按位置排序标题
    headings.sort((a, b) => a.index - b.index);
    
    // 过滤掉重复的标题和公司报告标题
    const filteredHeadings = headings.filter((heading, index, self) => {
      // 检查是否是重复标题
      const isDuplicate = self.findIndex(h => h.title === heading.title) !== index;
      
      // 检查是否是报告标题（只过滤包含"研究报告"、"分析报告"等字样的标题）
      // 不再过滤包含"公司"、"企业"的标题，因为"公司概览"、"企业战略"等是有效标题
      const isReportTitle = /研究报告|分析报告|画像报告|报告概述/.test(heading.title);
      
      // 如果是第一个标题且是报告标题，或者是重复标题，则过滤掉
      return !(isDuplicate || (index === 0 && isReportTitle));
    });
    
    console.log('过滤后的标题数量:', filteredHeadings.length);
    
    // 提取每个章节的内容
    for (let i = 0; i < filteredHeadings.length; i++) {
      const currentHeading = filteredHeadings[i];
      const nextHeading = i < filteredHeadings.length - 1 ? filteredHeadings[i + 1] : null;
      
      const startIndex = currentHeading.index;
      const endIndex = nextHeading ? nextHeading.index : cleanedMarkdown.length;
      
      // 提取章节内容，包括标题行
      let sectionContent = cleanedMarkdown.substring(startIndex, endIndex).trim();
      
      // 从内容中移除标题行
      const titleLineEndIndex = sectionContent.indexOf('\n');
      if (titleLineEndIndex !== -1) {
        sectionContent = sectionContent.substring(titleLineEndIndex).trim();
      }
      
      sections.push({
        title: currentHeading.title,
        content: sectionContent
      });
    }
  } else {
    // 如果没有找到任何标题，将整个文本作为一个章节
    console.log('未找到任何标题格式，将整个文本作为一个章节');
    sections.push({
      title: '企业研究报告',
      content: cleanedMarkdown
    });
  }
  
  console.log('processAnalysisResult 函数即将返回');
  console.log('最终处理得到章节数量:', sections.length);
  
  return {
    rawMarkdown: cleanedMarkdown,
    sections
  };
} 