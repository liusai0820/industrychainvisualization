import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateCompanyAnalysisPrompt } from '@/prompts/companyAnalysis';
import fetch, { RequestInit } from 'node-fetch';

// OpenRouter配置
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

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

export async function POST(request: NextRequest) {
  console.log('\n=== 收到企业分析请求 ===');
  
  try {
    const { companyName, industryName } = await request.json();
    console.log('📝 解析请求参数:', { companyName, industryName });

    if (!companyName) {
      console.warn('⚠️ 企业名称为空');
      return NextResponse.json(
        { success: false, error: '企业名称不能为空' },
        { status: 400 }
      );
    }

    if (!OPENROUTER_API_KEY) {
      console.error('❌ 缺少OpenRouter API密钥');
      return NextResponse.json(
        { success: false, error: 'API配置错误' },
        { status: 500 }
      );
    }

    console.log('🚀 开始生成企业分析...');
    const analysisResult = await generateCompanyAnalysis(companyName, industryName);
    console.log('✅ 企业分析生成完成\n');
    
    return NextResponse.json({
      success: true,
      data: analysisResult
    });
  } catch (error) {
    console.error('❌ 企业分析API错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '企业分析失败，请稍后重试' 
      },
      { status: 500 }
    );
  }
}

async function generateCompanyAnalysis(companyName: string, industryName?: string) {
  if (!OPENROUTER_API_KEY) {
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
          maxTokens: 10000,
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
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('OpenRouter API请求超时')), 5 * 60 * 1000); // 5分钟超时
          });

          const fetchPromise = fetch(OPENROUTER_API_URL, fetchOptions);
          const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

          console.log('收到OpenRouter响应:', {
            status: response.status,
            statusText: response.statusText
          });

          // 获取响应内容（无论成功或失败）
          const responseText = await response.text();
          let responseData: OpenRouterResponse;

          // 尝试解析JSON响应
          try {
            responseData = JSON.parse(responseText) as OpenRouterResponse;
            console.log('成功解析API响应为JSON');
          } catch (parseError) {
            console.error('无法解析API响应为JSON:', parseError);
            console.error('原始响应:', responseText);
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
          
          const processedResult = processAnalysisResult(analysisText);
          console.log('处理完成，sections数量:', processedResult.sections.length);
          
          // 记录提取的章节标题，帮助调试
          if (processedResult.sections.length > 0) {
            console.log('提取的章节标题:', processedResult.sections.map(s => s.title));
          }
          
          return processedResult;
        } catch (error) {
          console.error('OpenRouter请求错误:', error);
          throw error;
        }
      } catch (error) {
        console.error(`模型 ${model} 第 ${attempt + 1} 次尝试失败:`, error);
        if (attempt === maxRetries - 1) {
          // 如果当前模型的所有尝试都失败了，继续尝试下一个模型
          console.log(`模型 ${model} 的所有尝试都失败了，将尝试下一个模型`);
          // 如果是最后一个模型，则抛出错误
          if (modelIndex === MODELS.length - 1) {
            throw new Error(`所有模型都失败了: ${error instanceof Error ? error.message : String(error)}`);
          }
          // 否则继续尝试下一个模型
          break;
        }
      }
    }
  }
  
  throw new Error('所有模型和重试尝试都失败了');
}

function processAnalysisResult(markdownText: string): AnalysisResult {
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
  
  console.log('最终处理得到章节数量:', sections.length);
  
  return {
    rawMarkdown: cleanedMarkdown,
    sections
  };
} 