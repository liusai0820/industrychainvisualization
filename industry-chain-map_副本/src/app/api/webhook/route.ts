import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';
import { kv } from '@vercel/kv';

// 环境变量
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// 分析结果类型定义
interface AnalysisSection {
  title: string;
  content: string;
}

interface AnalysisResult {
  rawMarkdown: string;
  sections: AnalysisSection[];
}

// 请求状态类型定义
interface RequestStatus {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  companyName: string;
  industryName?: string;
  createdAt: number;
  result?: AnalysisResult | null;
  error?: string;
}

export async function POST(request: NextRequest) {
  console.log('\n=== 收到Dify webhook回调 ===');
  
  try {
    // 获取和验证请求数据
    const requestData = await request.json();
    console.log('📝 收到webhook数据，正在处理...');
    
    // 验证Webhook密钥
    const secret = request.headers.get('x-webhook-secret') || '';
    if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
      console.error('❌ Webhook密钥验证失败');
      return NextResponse.json(
        { success: false, error: '无效的Webhook密钥' },
        { status: 401 }
      );
    }
    
    // 提取请求ID和分析结果
    const { 
      request_id: requestId,
      company_name: companyName,
      industry_name: industryName,
      result,
      error
    } = requestData.meta || {};
    
    if (!requestId) {
      console.error('❌ 缺少请求ID');
      return NextResponse.json(
        { success: false, error: '缺少请求ID' },
        { status: 400 }
      );
    }

    console.log(`📥 处理请求ID: ${requestId} 的webhook回调`);
    
    // 获取当前请求状态
    const requestCacheKey = `request:${requestId}`;
    let currentStatus: RequestStatus | null = null;
    
    try {
      currentStatus = await redis.get<RequestStatus>(requestCacheKey);
    } catch (redisError) {
      console.error('⚠️ 读取Redis请求状态错误:', redisError);
    }
    
    if (!currentStatus) {
      console.warn(`⚠️ 找不到请求状态: ${requestId}`);
      // 如果找不到状态，我们仍然继续处理，但会重新创建一个状态
      currentStatus = {
        id: requestId,
        status: 'pending',
        companyName: companyName || '未知企业',
        industryName: industryName || undefined,
        createdAt: Date.now()
      };
    }
    
    // 分析结果处理逻辑
    let analysisResult: AnalysisResult | null = null;
    
    if (error) {
      // 处理失败的情况
      console.error(`❌ 请求处理失败: ${requestId}`, error);
      
      // 更新请求状态
      currentStatus.status = 'failed';
      currentStatus.error = typeof error === 'string' ? error : JSON.stringify(error);
    } else if (result) {
      // 处理成功的情况
      console.log(`✅ 请求处理成功: ${requestId}`);
      
      try {
        // 解析和处理Dify返回的结果
        analysisResult = processAnalysisResult(result);
        
        // 更新请求状态
        currentStatus.status = 'completed';
        currentStatus.result = analysisResult;
        
        // 缓存分析结果到KV存储
        if (companyName) {
          const analysisCacheKey = `analysis:${companyName}:${industryName || ''}`;
          try {
            await kv.set(analysisCacheKey, analysisResult, { ex: 60 * 60 * 24 * 15 }); // 15天过期
            console.log('📦 分析结果已缓存到KV存储，键:', analysisCacheKey);
          } catch (kvError) {
            console.error('⚠️ KV缓存存储错误:', kvError);
          }
        }
      } catch (processError) {
        console.error('❌ 处理分析结果错误:', processError);
        currentStatus.status = 'failed';
        currentStatus.error = processError instanceof Error ? processError.message : '处理分析结果失败';
      }
    } else {
      // 未知状态
      console.warn(`⚠️ 收到的webhook没有结果或错误: ${requestId}`);
      currentStatus.status = 'failed';
      currentStatus.error = '收到的webhook回调没有包含结果或错误信息';
    }
    
    // 更新Redis中的请求状态
    try {
      await redis.set(requestCacheKey, currentStatus, { ex: 60 * 60 * 24 }); // 24小时过期
      console.log(`📦 已更新请求状态 ${requestId} 为: ${currentStatus.status}`);
    } catch (redisError) {
      console.error('⚠️ 更新Redis请求状态错误:', redisError);
    }
    
    return NextResponse.json({
      success: true,
      message: `Webhook处理成功: ${requestId}`,
      status: currentStatus.status
    });
    
  } catch (error) {
    console.error('❌ Webhook处理错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Webhook处理失败'
      },
      { status: 500 }
    );
  }
}

// 处理分析结果
function processAnalysisResult(result: unknown): AnalysisResult {
  // 这里应根据Dify返回的实际结构进行解析
  // 假设Dify返回的是Markdown文本，我们需要处理成分析结果对象
  
  let markdownText: string;
  
  // 尝试从不同可能的Dify返回结构中获取Markdown文本
  if (typeof result === 'string') {
    markdownText = result;
  } else if (
    result !== null && 
    typeof result === 'object' && 
    'answer' in result && 
    typeof result.answer === 'string'
  ) {
    markdownText = result.answer;
  } else if (
    result !== null && 
    typeof result === 'object' && 
    'response' in result && 
    typeof result.response === 'string'
  ) {
    markdownText = result.response;
  } else if (
    result !== null && 
    typeof result === 'object' && 
    'content' in result && 
    typeof result.content === 'string'
  ) {
    markdownText = result.content;
  } else {
    // 尝试将结果转为字符串
    try {
      markdownText = JSON.stringify(result);
    } catch {
      throw new Error('无法解析Dify返回的结果');
    }
  }
  
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