import { NextRequest, NextResponse } from 'next/server';
import { getIndustryStyle, IndustryStyle } from '@/utils/industryStyles';
import fetch from 'node-fetch';
import { redis } from '@/lib/redis';
import { generateCompanyAnalysisHTMLPrompt } from '@/prompts/companyAnalysisHTML';

// OpenRouter配置
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
// 从环境变量获取模型配置
const HTML_REPORT_MODEL = process.env.HTML_REPORT_MODEL || "google/gemini-2.5-pro-exp-03-25:free";
// 从环境变量获取温度配置
const HTML_REPORT_TEMPERATURE = parseFloat(process.env.HTML_REPORT_TEMPERATURE || "0.7");

// 缓存配置
interface CacheItem {
  html: string;
  method: 'llm' | 'template';
  generatedAt: number;
  fallback?: boolean;
}

// LRU缓存实现
class LRUCache {
  private capacity: number;
  private cache: Map<string, CacheItem>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key: string): CacheItem | undefined {
    if (!this.cache.has(key)) return undefined;
    
    // 获取后移到最近使用
    const value = this.cache.get(key);
    if (value) {
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  put(key: string, value: CacheItem): void {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // 如果缓存已满，删除最不常用的项
    else if (this.cache.size >= this.capacity) {
      // 安全地获取第一个键
      const firstKey = this.cache.keys().next();
      if (!firstKey.done && firstKey.value) {
        this.cache.delete(firstKey.value);
      }
    }
    // 添加到缓存
    this.cache.set(key, value);
  }

  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// 创建一个容量为50的缓存（最多存储50个公司的HTML报告）
const htmlReportCache = new LRUCache(50);

// 分析结果类型定义
interface AnalysisSection {
  title: string;
  content: string;
}

interface AnalysisResult {
  rawMarkdown: string;
  sections: AnalysisSection[];
}

// OpenRouter响应类型
interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
    index: number;
    finish_reason: string;
  }>;
  model: string;
  id: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// API错误类型
type FetchError = Error & { 
  type?: string;
  code?: string;
  errno?: string;
  syscall?: string;
};

// 辅助函数：判断标题是否为竞争分析章节
function isCompetitionAnalysisSection(title: string): boolean {
  // 检查标题是否包含竞争分析相关关键词
  const competitionKeywords = ['竞争', '对标', '对手', '竞品', '市场格局', '市场竞争', '行业竞争', '对比'];
  return competitionKeywords.some(keyword => title.includes(keyword));
}

// 生成缓存键
function generateCacheKey(companyName: string, industryName: string, analysisResultHash: string): string {
  const safeName = companyName || 'unknown';
  const safeIndustry = industryName || '';
  const safeHash = analysisResultHash || 'empty';
  return `html:${safeName}|${safeIndustry}|${safeHash}`;
}

// 为分析结果生成简单哈希
function generateSimpleHash(analysisResult: AnalysisResult): string {
  if (!analysisResult || !analysisResult.sections) {
    return 'empty_result';
  }
  
  // 简单地使用章节数量和各章节标题的长度组合
  const sectionCount = analysisResult.sections.length;
  const titleLengths = analysisResult.sections.map(section => section.title.length);
  const contentLength = analysisResult.rawMarkdown?.length || 0;
  return `${sectionCount}_${titleLengths.join('_')}_${contentLength}`;
}

export async function POST(request: NextRequest) {
  console.log('\n=== 收到企业HTML分析请求 ===');
  
  try {
    const { companyName, industryName, analysisResult } = await request.json();
    console.log('📝 解析请求参数:', { companyName, industryName });

    if (!companyName) {
      console.warn('⚠️ 企业名称为空');
      return NextResponse.json(
        { success: false, error: '企业名称不能为空' },
        { status: 400 }
      );
    }

    if (!analysisResult) {
      console.warn('⚠️ 分析结果为空');
      return NextResponse.json(
        { success: false, error: '分析结果不能为空' },
        { status: 400 }
      );
    }

    // 生成缓存键
    const analysisResultHash = generateSimpleHash(analysisResult);
    const cacheKey = generateCacheKey(companyName, industryName || '', analysisResultHash);
    
    // 1. 检查内存缓存
    const cachedReport = htmlReportCache.get(cacheKey);
    if (cachedReport) {
      console.log('📦 命中内存缓存！使用已缓存的HTML报告');
      console.log(`缓存生成时间: ${new Date(cachedReport.generatedAt).toLocaleString()}`);
      console.log(`缓存生成方式: ${cachedReport.method}${cachedReport.fallback ? ' (降级)' : ''}`);
      
      return NextResponse.json({
        success: true,
        data: cachedReport.html,
        method: cachedReport.method,
        fallback: cachedReport.fallback,
        fromCache: true,
        cacheSource: 'memory',
        cachedAt: cachedReport.generatedAt
      });
    }
    
    // 2. 检查KV缓存
    try {
      const kvCachedReport = await redis.get<CacheItem>(cacheKey);
      if (kvCachedReport) {
        console.log('📦 命中Redis缓存！使用云端缓存的HTML报告');
        console.log(`缓存生成时间: ${new Date(kvCachedReport.generatedAt).toLocaleString()}`);
        console.log(`缓存生成方式: ${kvCachedReport.method}${kvCachedReport.fallback ? ' (降级)' : ''}`);
        
        // 同时更新内存缓存
        htmlReportCache.put(cacheKey, kvCachedReport);
        
        return NextResponse.json({
          success: true,
          data: kvCachedReport.html,
          method: kvCachedReport.method,
          fallback: kvCachedReport.fallback,
          fromCache: true,
          cacheSource: 'redis',
          cachedAt: kvCachedReport.generatedAt
        });
      }
    } catch (kvError) {
      console.error('⚠️ Redis缓存检索错误:', kvError);
      // 继续流程，不中断
    }
    
    console.log('🚀 开始生成HTML企业分析...');
    
    // 获取行业样式，用于输入给LLM
    const industryStyle = getIndustryStyle(industryName || '');
    console.log('💅 应用行业样式:', industryName || '其他', '→', industryStyle.primaryColor);
    
    try {
      // 首先尝试使用LLM生成HTML
      if (OPENROUTER_API_KEY) {
        console.log('🤖 使用LLM生成HTML报告...');
        
        // 调用LLM生成HTML，使用从@/prompts/companyAnalysisHTML导入的函数
        const htmlContent = await callOpenRouterForHTML(
          generateCompanyAnalysisHTMLPrompt({
            companyName,
            industryName,
            analysisResult,
            industryStyle
          })
        );
        
        // 创建缓存项
        const cacheItem: CacheItem = {
          html: htmlContent,
          method: 'llm',
          generatedAt: Date.now()
        };
        
        // 更新内存缓存
        htmlReportCache.put(cacheKey, cacheItem);
        console.log(`📦 HTML报告已缓存到内存，当前内存缓存报告数量: ${htmlReportCache.size()}`);
        
        // 更新KV缓存
        try {
          // 设置KV缓存，30天过期
          await redis.set(cacheKey, cacheItem, { ex: 60 * 60 * 24 * 30 });
          console.log('📦 HTML报告已缓存到Redis存储（30天有效期）');
        } catch (kvError) {
          console.error('⚠️ Redis缓存存储错误:', kvError);
          // 继续流程，不中断
        }
        
        return NextResponse.json({
          success: true,
          data: htmlContent,
          method: 'llm'
        });
      } else {
        // 如果没有API密钥，降级到模板渲染
        console.log('⚠️ 未配置OpenRouter API密钥，使用模板生成HTML');
        throw new Error('未配置API密钥');
      }
    } catch (llmError) {
      // LLM生成失败，使用模板渲染作为备选
      console.log('⚠️ LLM生成HTML失败，降级到模板渲染:', llmError);
      
      // 使用传统模板生成HTML
      const htmlResult = generateTemplateHTML(companyName, industryName || '', analysisResult, industryStyle);
      console.log('✅ 使用模板生成HTML企业分析完成\n');
      
      // 创建缓存项
      const cacheItem: CacheItem = {
        html: htmlResult,
        method: 'template',
        generatedAt: Date.now(),
        fallback: true
      };
      
      // 更新内存缓存
      htmlReportCache.put(cacheKey, cacheItem);
      console.log(`📦 模板HTML报告已缓存到内存，当前内存缓存报告数量: ${htmlReportCache.size()}`);
      
      // 更新KV缓存
      try {
        // 设置KV缓存，30天过期
        await redis.set(cacheKey, cacheItem, { ex: 60 * 60 * 24 * 30 });
        console.log('📦 模板HTML报告已缓存到Redis存储（30天有效期）');
      } catch (kvError) {
        console.error('⚠️ Redis缓存存储错误:', kvError);
        // 继续流程，不中断
      }
      
      return NextResponse.json({
        success: true,
        data: htmlResult,
        method: 'template',
        fallback: true
      });
    }
  } catch (error) {
    console.error('❌ 企业HTML分析API错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '企业HTML分析失败，请稍后重试' 
      },
      { status: 500 }
    );
  }
}

// LLM生成HTML的提示词函数
function generateHTMLPrompt(companyName: string, industryName: string, analysisResult: AnalysisResult, industryStyle: IndustryStyle): string {
  // 将分析结果处理为LLM可理解的格式
  const sections = analysisResult.sections.map(section => ({
    title: section.title,
    content: section.content
  }));

  return `
我需要你将以下企业分析报告转化为美观漂亮的中文可视化网页。

## 基本信息

- 公司名称: ${companyName}
- 行业: ${industryName}

## 内容要求

- 所有页面内容必须为简体中文
- 保持原文件的核心信息，但以更易读、可视化的方式呈现
- 在页面底部添加版权信息和生成时间，版权所有者为"智绘链图"
- 为数据和信息设计适合的可视化图表和组件
- 突出显示重要的数据点和关键发现
- 对比表格必须美观且易读，使用现代化的卡片式比较组件替代传统表格，每个公司用一张独立卡片表示，卡片之间有明显视觉差异
- **严格禁止使用传统的HTML表格**，必须使用现代卡片组件设计，并且每个比较项使用图标+文本的组合方式
- 请使用Font Awesome图标库，通过CDN引入：https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css

## 设计风格

- 整体风格参考高端咨询公司（如麦肯锡、波士顿咨询）的专业报告设计
- 使用清晰的视觉层次结构，突出重要内容
- 配色方案应基于以下行业专属颜色:
  - 主色: ${industryStyle.primaryColor}
  - 辅色: ${industryStyle.secondaryColor}
  - 强调色: ${industryStyle.accentColor}
  - 背景色: ${industryStyle.backgroundColor}
  - 文本色: ${industryStyle.textColor}

## 技术规范

- 使用HTML5、TailwindCSS 3.0+（通过CDN引入）和必要的JavaScript
- 使用CDN引入Chart.js或D3.js用于数据可视化
- 实现完整的深色/浅色模式切换功能，默认跟随系统设置
- 代码结构清晰，便于理解和维护
- 实现目录高亮功能：当用户滚动到某个章节时，左侧目录中对应的项目应自动高亮

## CSS规范

- **文本排版规则**：为所有文本元素应用以下CSS样式：
  \`\`\`css
  p, h1, h2, h3, h4, h5, h6, li, td, th, div, span {
    word-break: keep-all;
    overflow-wrap: break-word;
    text-align: justify; /* 文本两端对齐 */
    hyphens: auto;
    line-height: 1.6;
  }
  \`\`\`
- 确保响应式设计在所有设备上都能正确显示中文文本
- 使用\`font-family\`优先选择"Noto Sans SC"等适合中文显示的字体
- 段落间需保持适当间距，改善长文本的可读性

## 响应式设计

- 页面必须在所有设备上（手机、平板、桌面）完美展示
- 针对不同屏幕尺寸优化布局和字体大小
- 卡片式比较组件在桌面端横向排列，在移动端要优雅地转为垂直堆叠

## 图表与视觉元素

- 根据内容自动选择合适的图表类型（饼图、柱状图、折线图、雷达图等）
- **图表尺寸控制**：
  - 所有图表的最大高度不应超过50vh（视口高度的50%）
  - 图表容器宽度在移动设备上为100%，在桌面设备上最大为75%
  - 使用响应式设计确保图表在各种屏幕尺寸下合理显示
  - 避免使用固定像素大小，改用相对单位（%, vh, em等）
- 对于SWOT分析，使用四象限图表
- 对于竞争分析，使用精美的卡片式比较组件，每个公司一张卡片，卡片顶部有标题和背景颜色区分，内容区域使用图标+文本的方式列出特点
- 对于财务分析，使用趋势图和KPI卡片
- 对于风险分析，使用热力图或等级指示器
- 为每个图表添加简洁的标题和必要的数据标签，确保信息清晰可读
- 使用Chart.js的响应式选项，设置maintainAspectRatio:false和适当的高度控制

## 图片和图标处理

- **公司Logo处理**：
  - 优先尝试使用Clearbit API获取公司logo: \`https://logo.clearbit.com/{公司英文名称}.com\`
  - 如果无法通过Clearbit获取logo，则使用Font Awesome的\`fa-building\`图标或公司名称首字母作为替代
  - 添加适当的错误处理，确保logo加载失败时显示替代内容而不影响整体页面
- **文本中的图片**：对于内容中提到但无法获取的图片，使用相应的Font Awesome图标替代
- **章节图标**：根据章节内容智能选择合适的Font Awesome图标，例如：
  - 公司概述：\`fa-info-circle\`
  - 产品服务：\`fa-cube\`
  - 市场分析：\`fa-chart-line\`
  - 竞争分析：\`fa-users\`
  - 财务分析：\`fa-dollar-sign\`
  - 风险分析：\`fa-exclamation-triangle\`

## 交互体验

- 添加适当的微交互效果提升用户体验
- 页面滚动时有平滑过渡效果
- 内容区块加载时有优雅的淡入动画
- 提供目录导航，方便用户跳转到不同章节
- 当用户滚动到特定章节时，相应的目录项应该自动高亮
- 对比卡片添加悬停效果，如轻微上浮和阴影加深

## 输出要求

- 提供完整可运行的单一HTML文件，包含所有必要的CSS和JavaScript
- 确保代码符合W3C标准，无错误警告
- 确保所有中文文本都能正确显示，不会出现单字换行的情况

## 报告内容

以下是需要展示的企业分析内容，请根据内容特点设计最合适的可视化表现形式:

${JSON.stringify(sections, null, 2)}

请基于以上要求和内容，创建一个完整的HTML文件。生成的HTML应当可以独立运行，不依赖外部服务器（除了CDN资源）。

特别注意：
1. 对比表格必须使用现代卡片式设计，完全避免使用HTML表格标签，确保手机端显示良好
2. 实现滚动同步高亮目录功能，使用Intersection Observer API
3. 页脚版权信息显示为"智绘链图"
4. 所有文本必须应用防止中文单字换行的CSS规则和两端对齐样式
5. 优先尝试使用Clearbit API获取公司logo，仅在无法获取时使用替代方案
6. 每个章节标题旁边添加一个与内容相关的Font Awesome图标
7. 图表大小不应超过视口高度的50%，确保美观且不占用过多屏幕空间
8. 实现"保存到本地"按钮，允许用户下载HTML文件，文件名格式为"公司名+深度研究报告+生成日期"
`;
}

// 调用OpenRouter API生成HTML
async function callOpenRouterForHTML(prompt: string) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API Key not configured');
  }

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
    "HTTP-Referer": "https://industry-chain-map.vercel.app",
    "X-Title": "Industry Chain Map",
    "X-Organization-ID": "industry-chain-map"
  };
  
  const payload = {
    "model": HTML_REPORT_MODEL,
    "messages": [
      {
        "role": "user",
        "content": prompt
      }
    ],
    "temperature": HTML_REPORT_TEMPERATURE,
    "top_p": 1,
    "frequency_penalty": 0,
    "presence_penalty": 0,
    "stream": false,
    "max_tokens": 100000 // 增加token限制，确保能生成完整的HTML
  };

  console.log('准备发送OpenRouter HTML生成请求:', {
    url: OPENROUTER_API_URL,
    model: payload.model,
    temperature: payload.temperature,
    promptLength: prompt.length,
    headers: {
      ...headers,
      "Authorization": "Bearer [HIDDEN]"
    }
  });

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`HTML生成重试 (${attempt + 1}/${maxRetries})...`);
        // 增加指数退避延迟
        await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, attempt)));
      }

      console.log(`开始请求OpenRouter API生成HTML... (尝试 ${attempt + 1}/${maxRetries})`);
      
      // 设置超时为10分钟
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('OpenRouter API请求超时')), 10 * 60 * 1000);
      });

      const fetchOptions = {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        redirect: 'follow' as const
      };

      try {
        // 使用普通的fetch请求，不使用AbortController（避免类型问题）
        const response = await Promise.race([
          fetch(OPENROUTER_API_URL, fetchOptions),
          timeoutPromise
        ]) as Response;

        console.log('收到OpenRouter HTML生成响应:', {
          status: response.status,
          statusText: response.statusText
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API错误响应 (${response.status}):`, errorText);
          throw new Error(`OpenRouter API请求失败: ${response.status} - ${errorText}`);
        }

        // 更安全地解析JSON
        let responseText;
        try {
          responseText = await response.text();
          console.log('响应文本长度:', responseText.length);
          console.log('响应文本前100个字符:', responseText.substring(0, 100) + '...');
        } catch (textError) {
          console.error('读取响应文本失败:', textError);
          throw new Error('无法读取API响应数据');
        }
        
        let responseData;
        try {
          responseData = JSON.parse(responseText) as OpenRouterResponse;
        } catch (jsonError) {
          console.error('JSON解析失败:', jsonError);
          console.error('收到的响应文本:', responseText.substring(0, 500) + '...');
          throw new Error('API返回了无效的JSON');
        }

        // 更安全地检查响应结构
        if (!responseData) {
          console.error('API响应为空');
          throw new Error('API响应为空');
        }
        
        // 检查choices是否存在
        if (!responseData.choices || !Array.isArray(responseData.choices) || responseData.choices.length === 0) {
          console.error('API响应中没有choices数组或为空:', JSON.stringify(responseData).substring(0, 500));
          throw new Error('API响应中缺少choices数据');
        }
        
        // 检查第一个choice是否有效
        const firstChoice = responseData.choices[0];
        if (!firstChoice || !firstChoice.message || typeof firstChoice.message.content !== 'string') {
          console.error('API响应中的第一个choice无效:', firstChoice);
          throw new Error('API响应中的消息内容无效');
        }

        const htmlContent = firstChoice.message.content;
        console.log('成功获取HTML内容，长度:', htmlContent.length);
        
        // 提取HTML代码块
        const htmlMatch = htmlContent.match(/```html\n([\s\S]*?)```/) || 
                        htmlContent.match(/```\n([\s\S]*?)```/) ||
                        { index: 0, '1': htmlContent };
        
        const extractedHTML = htmlMatch[1] || htmlContent;
        
        return extractedHTML;
      } catch (fetchError) {
        // 处理可能的超时或网络错误
        const error = fetchError as FetchError;
        console.error('请求执行错误:', error);
        if (attempt < maxRetries - 1) {
          console.log('将在短暂延迟后重试...');
        }
        throw error;
      }
    } catch (error) {
      console.error(`HTML生成尝试 ${attempt + 1}/${maxRetries} 失败:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 如果这是最后一次尝试，则抛出错误
      if (attempt === maxRetries - 1) {
        throw new Error(`HTML生成失败，已重试${maxRetries}次: ${lastError.message}`);
      }
      // 否则继续下一次重试
    }
  }
  
  // 这行代码理论上不会执行到，因为上面的循环会在最后一次失败时抛出错误
  throw lastError || new Error('HTML生成失败，原因未知');
}

// 使用预定义模板生成HTML（作为LLM失败时的备选方案）
function generateTemplateHTML(companyName: string, industryName: string, analysisResult: AnalysisResult, industryStyle: IndustryStyle): string {
  const { sections } = analysisResult;
  const { 
    primaryColor, 
    secondaryColor, 
    accentColor, 
    backgroundColor, 
    textColor, 
    fontFamily
  } = industryStyle;

  const currentDate = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // 生成目录
  const tableOfContents = sections.map((section, index) => {
    return `<a href="#section-${index + 1}" class="toc-item flex items-center py-2 px-4 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mb-2" data-section="section-${index + 1}">
      <div class="w-8 h-8 inline-flex items-center justify-center rounded-full mr-3" style="background-color: ${primaryColor}; color: white;">
        ${index + 1}
      </div>
      <span style="color: ${textColor};">${section.title}</span>
    </a>`;
  }).join('\n');

  // HTML模板
  const htmlTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${companyName} - 企业分析报告</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    :root {
      --primary-color: ${primaryColor};
      --secondary-color: ${secondaryColor};
      --accent-color: ${accentColor};
      --background-color: ${backgroundColor};
      --text-color: ${textColor};
    }
    
    body {
      font-family: ${fontFamily}, 'Noto Sans SC', sans-serif;
      color: ${textColor};
      background-color: ${backgroundColor};
      word-break: keep-all; /* 防止单字换行 */
      overflow-wrap: break-word;
    }
    
    /* 防止中文单字换行 */
    p, h1, h2, h3, h4, h5, h6, li, td, th, div, span {
      word-break: keep-all;
      overflow-wrap: break-word;
      text-align: justify; /* 文本两端对齐 */
      hyphens: auto;
      line-height: 1.6;
    }
    
    .reveal-section {
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.5s ease, transform 0.5s ease;
    }
    
    .reveal-section.active {
      opacity: 1;
      transform: translateY(0);
    }
    
    .toc-item {
      position: relative;
      transition: all 0.3s ease;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .toc-item.active {
      background-color: rgba(var(--primary-color-rgb), 0.1);
      font-weight: bold;
    }
    
    .toc-item.active::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background-color: var(--primary-color);
      border-radius: 0 2px 2px 0;
    }
    
    /* 段落样式 */
    p {
      margin-bottom: 1.2em;
      text-indent: 2em; /* 段落首行缩进 */
    }
    
    /* 图表大小控制 */
    .chart-container {
      width: 100%;
      max-width: 700px;
      max-height: 50vh;
      margin: 2em auto;
    }
    
    @media (max-width: 768px) {
      .chart-container {
        max-height: 40vh;
      }
    }
    
    /* 现代卡片式比较表格 */
    .comparison-card {
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      margin-bottom: 1.5rem;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .comparison-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
    }
    
    .comparison-header {
      padding: 1rem;
      color: white;
      font-weight: 600;
    }
    
    .company-card {
      border-top: 3px solid var(--primary-color);
    }
    
    .competitor-card {
      border-top: 3px solid var(--secondary-color);
    }
    
    .specialty-card {
      border-top: 3px solid var(--accent-color);
    }
    
    .comparison-content {
      padding: 1.5rem;
    }
    
    .comparison-item {
      display: flex;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    
    .icon-wrapper {
      width: 24px;
      margin-right: 12px;
      color: var(--primary-color);
      text-align: center;
    }
    
    @media print {
      .reveal-section {
        opacity: 1;
        transform: none;
      }
    }
  </style>
</head>
<body>
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <!-- 页眉 -->
    <header class="mb-10 text-center">
      <div class="flex justify-center items-center mb-4">
        <!-- 尝试使用Clearbit API获取公司logo，失败时显示图标 -->
        <div class="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center mr-4" style="background-color: ${primaryColor};">
          <img src="https://logo.clearbit.com/${companyName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '')}.com" 
               onerror="this.onerror=null; this.style.display='none'; this.parentNode.innerHTML='<i class=\'fas fa-building text-white text-3xl\'></i>';" 
               alt="${companyName} Logo" class="w-full h-full object-contain"/>
        </div>
        <h1 class="text-4xl font-bold" style="color: ${primaryColor};">${companyName}</h1>
      </div>
      <p class="text-xl mb-2">${industryName || '行业'} 分析报告</p>
      <p class="text-sm opacity-75">生成日期：${currentDate}</p>
    </header>

    <!-- 主体内容 -->
    <div class="flex flex-col lg:flex-row gap-8">
      <!-- 侧边栏目录 -->
      <div class="lg:w-1/4">
        <div class="sticky top-8 p-6 rounded-lg shadow-lg bg-white dark:bg-gray-800">
          <h3 class="text-lg font-bold mb-4" style="color: ${primaryColor};">目录</h3>
          <nav class="space-y-1" id="toc-navigation">
            ${tableOfContents}
          </nav>
        </div>
      </div>

      <!-- 主要内容 -->
      <main class="lg:w-3/4" id="report-content">
        ${generateReportContent(sections, primaryColor, textColor)}
      </main>
    </div>

    <!-- 页脚 -->
    <footer class="mt-16 pt-8 border-t text-center opacity-75">
      <p>© ${new Date().getFullYear()} 智绘链图 | 本报告由AI自动生成，仅供参考</p>
    </footer>
  </div>

  <!-- 固定位置的下载按钮 -->
  <div class="fixed bottom-6 right-6 z-50">
    <button 
      onclick="downloadHTML()" 
      class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-full shadow-lg flex items-center transition-all duration-300 hover:scale-105">
      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
      </svg>
      保存报告
    </button>
  </div>

  <script>
    // 更新CSS变量，允许JS访问主色调
    document.documentElement.style.setProperty('--primary-color-rgb', hexToRgb('${primaryColor}'));
    document.documentElement.style.setProperty('--secondary-color-rgb', hexToRgb('${secondaryColor}'));
    document.documentElement.style.setProperty('--accent-color-rgb', hexToRgb('${accentColor}'));
    
    // 辅助函数：将十六进制转换为RGB
    function hexToRgb(hex) {
      // 删除#前缀如果存在
      hex = hex.replace(/^#/, '');
      
      // 解析十六进制颜色值
      let bigint = parseInt(hex, 16);
      let r = (bigint >> 16) & 255;
      let g = (bigint >> 8) & 255;
      let b = bigint & 255;
      
      return r + "," + g + "," + b;
    }

    // 下载HTML功能
    function downloadHTML() {
      const htmlContent = document.documentElement.outerHTML;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const fileName = "${companyName}深度研究报告${currentDate.replace(/[年月日]/g, '').trim()}.html";
      
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(blob);
      downloadLink.download = fileName;
      
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(downloadLink.href);
    }

    // 页面滚动动画和目录同步高亮
    document.addEventListener('DOMContentLoaded', function() {
      const sections = document.querySelectorAll('.reveal-section');
      const tocItems = document.querySelectorAll('.toc-item');
      
      // 初始化Intersection Observer
      const observerOptions = {
        root: null, // 使用视口作为root
        rootMargin: '0px 0px -50% 0px', // 当元素的50%进入视口时触发
        threshold: 0 // 目标元素刚进入root的触发回调
      };
      
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          // 当章节进入视口
          if (entry.isIntersecting) {
            const id = entry.target.id;
            
            // 移除所有活动类
            tocItems.forEach(item => {
              item.classList.remove('active');
            });
            
            // 添加活动类到当前章节的目录项
            const activeTocItem = document.querySelector('.toc-item[data-section="' + id + '"]');
            if (activeTocItem) {
              activeTocItem.classList.add('active');
              
              // 确保活动项在视口内（如果目录很长）
              activeTocItem.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
              });
            }
            
            // 添加活动类到章节
            entry.target.classList.add('active');
          }
        });
      }, observerOptions);
      
      // 观察所有章节
      sections.forEach(section => {
        observer.observe(section);
        
        // 初始设置可见性检查（用于初始动画）
        const rect = section.getBoundingClientRect();
        const isVisible = (rect.top <= window.innerHeight * 0.8);
        if (isVisible) {
          section.classList.add('active');
        }
      });
      
      // 添加目录项点击事件
      tocItems.forEach(item => {
        item.addEventListener('click', function(event) {
          event.preventDefault();
          const targetId = this.getAttribute('data-section');
          const targetSection = document.getElementById(targetId);
          
          if (targetSection) {
            targetSection.scrollIntoView({
              behavior: 'smooth'
            });
          }
        });
      });
      
      // 窗口滚动时更新动画
      window.addEventListener('scroll', function() {
        sections.forEach(section => {
          const rect = section.getBoundingClientRect();
          const isVisible = (rect.top <= window.innerHeight * 0.8);
          if (isVisible) {
            section.classList.add('active');
          }
        });
      });
    });
  </script>
</body>
</html>`;

  return htmlTemplate;
}

// 辅助函数：生成报告内容HTML
function generateReportContent(sections: AnalysisSection[], primaryColor: string, textColor: string): string {
  return sections.map((section, index) => {
    // 检查是否为竞争分析章节，优化表格呈现
    let processedContent = section.content;
    
    // 特殊处理竞争分析类的内容
    if (isCompetitionAnalysisSection(section.title)) {
      // 提取表格内容，并转换为现代卡片式比较组件
      const tableRegex = /\|.*\|[\s\S]*?\n\s*\|[-|:]+\|[\s\S]*?\n\s*\|.*\|/g;
      const tableMatches = processedContent.match(tableRegex);
      
      if (tableMatches && tableMatches.length > 0) {
        // 处理每个找到的表格
        tableMatches.forEach(tableContent => {
          // 分割表格行
          const rows = tableContent.split('\n').filter(row => row.trim().startsWith('|'));
          
          if (rows.length < 3) return; // 忽略不完整的表格
          
          // 处理表头
          const headerRow = rows[0];
          const headers = headerRow
            .split('|')
            .filter(cell => cell.trim() !== '')
            .map(cell => cell.trim());
          
          // 跳过分隔行，处理数据行
          const dataRows = rows.slice(2);
          
          // 创建现代化的卡片式对比视图
          let comparisonView = `
<div class="grid grid-cols-1 md:grid-cols-${Math.min(headers.length, 3)} gap-6 my-8">`;
          
          // 为每个公司创建卡片
          headers.forEach((company, idx) => {
            let cardClass = 'company-card';
            let headerBgColor = primaryColor;
            
            // 根据位置使用不同的样式
            if (idx === 1) {
              cardClass = 'competitor-card';
              headerBgColor = '#4C51BF'; // 靛蓝色
            } else if (idx === 2) {
              cardClass = 'specialty-card';
              headerBgColor = '#ED64A6'; // 粉色
            }
            
            comparisonView += `
  <div class="comparison-card ${cardClass} bg-white dark:bg-gray-800">
    <div class="comparison-header" style="background-color: ${headerBgColor};">
      <h4 class="text-center font-semibold">${company}</h4>
    </div>
    <div class="comparison-content">`;
            
            // 提取该公司的每行数据并添加到卡片中
            dataRows.forEach(row => {
              const cells = row
                .split('|')
                .filter(cell => cell.trim() !== '')
                .map(cell => cell.trim());
              
              if (cells.length > idx) {
                const feature = cells[0];
                const value = cells[idx];
                
                comparisonView += `
      <div class="comparison-item">
        <div class="icon-wrapper">
          <i class="fas fa-check-circle"></i>
        </div>
        <div>
          <strong>${feature}:</strong> ${value}
        </div>
      </div>`;
              }
            });
            
            comparisonView += `
    </div>
  </div>`;
          });
          
          comparisonView += `
</div>`;
          
          // 用新的比较视图替换原始表格
          processedContent = processedContent.replace(tableContent, comparisonView);
        });
      }
    }
    
    // 处理常规Markdown内容
    processedContent = processedContent
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // 加粗
      .replace(/\*(.*?)\*/g, '<em>$1</em>')              // 斜体
      .replace(/\n\n/g, '</p><p class="indent-8 mb-4">')  // 段落，添加缩进和间距
      .replace(/\n- (.*)/g, '<li>$1</li>')               // 列表项
      .replace(/<li>.*<\/li>(\n<li>.*<\/li>)*/g, '<ul class="list-disc pl-5 space-y-2 my-4">$&</ul>');  // 列表包装
    
    // 确保内容被正确的段落标签包裹
    if (!processedContent.startsWith('<p')) {
      processedContent = `<p class="indent-8 mb-4">${processedContent}`;
    }
    if (!processedContent.endsWith('</p>')) {
      processedContent = `${processedContent}</p>`;
    }

    return `<section id="section-${index + 1}" class="mb-16 reveal-section">
      <div class="flex items-center mb-6">
        <div class="w-10 h-10 inline-flex items-center justify-center rounded-full mr-4" style="background-color: ${primaryColor}; color: white;">
          <i class="fas fa-${getSectionIcon(section.title)}"></i>
        </div>
        <h2 class="text-2xl font-bold" style="color: ${textColor};">${section.title}</h2>
      </div>
      <div class="pl-6 lg:pl-14">
        <div class="content text-justify">
          ${processedContent}
        </div>
      </div>
    </section>`;
  }).join('\n');
}

// 辅助函数：根据章节标题获取适当的图标
function getSectionIcon(title: string): string {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('概述') || titleLower.includes('简介') || titleLower.includes('概况')) {
    return 'info-circle';
  } else if (titleLower.includes('产品') || titleLower.includes('服务')) {
    return 'cube';
  } else if (titleLower.includes('市场') || titleLower.includes('行业')) {
    return 'chart-line';
  } else if (titleLower.includes('竞争') || titleLower.includes('对手')) {
    return 'users';
  } else if (titleLower.includes('战略') || titleLower.includes('发展')) {
    return 'chess';
  } else if (titleLower.includes('财务') || titleLower.includes('盈利')) {
    return 'dollar-sign';
  } else if (titleLower.includes('风险') || titleLower.includes('挑战')) {
    return 'exclamation-triangle';
  } else if (titleLower.includes('技术') || titleLower.includes('研发')) {
    return 'microchip';
  } else if (titleLower.includes('swot') || titleLower.includes('优势') || titleLower.includes('劣势')) {
    return 'balance-scale';
  } else if (titleLower.includes('前景') || titleLower.includes('趋势') || titleLower.includes('未来')) {
    return 'binoculars';
  } else {
    return 'file-alt'; // 默认图标
  }
} 