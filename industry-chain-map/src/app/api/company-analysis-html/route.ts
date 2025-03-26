import { NextRequest, NextResponse } from 'next/server';
import { getIndustryStyle, IndustryStyle } from '@/utils/industryStyles';
import fetch from 'node-fetch';
import { kv } from '@vercel/kv';

// OpenRouter配置
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

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
      const kvCachedReport = await kv.get<CacheItem>(cacheKey);
      if (kvCachedReport) {
        console.log('📦 命中KV缓存！使用云端缓存的HTML报告');
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
          cacheSource: 'kv',
          cachedAt: kvCachedReport.generatedAt
        });
      }
    } catch (kvError) {
      console.error('⚠️ KV缓存检索错误:', kvError);
      // 继续流程，不中断
    }
    
    console.log('🚀 开始生成HTML企业分析...');
    
    // 获取行业样式，用于输入给LLM
    const industryStyle = getIndustryStyle(industryName || '');
    console.log('💅 应用行业样式:', industryName || '其他', '→', industryStyle.primaryColor);
    
    try {
      // 首先尝试使用LLM生成HTML
      if (OPENROUTER_API_KEY) {
        console.log('📝 尝试使用LLM生成HTML报告...');
        
        // 创建请求LLM生成HTML的提示
        const htmlPrompt = generateHTMLPrompt(companyName, industryName || '', analysisResult, industryStyle);
        
        // 调用OpenRouter API生成HTML
        const htmlResult = await callOpenRouterForHTML(htmlPrompt);
        console.log('✅ LLM生成HTML企业分析成功\n');
        
        // 创建缓存项
        const cacheItem: CacheItem = {
          html: htmlResult,
          method: 'llm',
          generatedAt: Date.now()
        };
        
        // 更新内存缓存
        htmlReportCache.put(cacheKey, cacheItem);
        console.log(`📦 HTML报告已缓存到内存，当前内存缓存报告数量: ${htmlReportCache.size()}`);
        
        // 更新KV缓存
        try {
          // 设置KV缓存，30天过期
          await kv.set(cacheKey, cacheItem, { ex: 60 * 60 * 24 * 30 });
          console.log('📦 HTML报告已缓存到KV存储（30天有效期）');
        } catch (kvError) {
          console.error('⚠️ KV缓存存储错误:', kvError);
          // 继续流程，不中断
        }
        
        return NextResponse.json({
          success: true,
          data: htmlResult,
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
        await kv.set(cacheKey, cacheItem, { ex: 60 * 60 * 24 * 30 });
        console.log('📦 模板HTML报告已缓存到KV存储（30天有效期）');
      } catch (kvError) {
        console.error('⚠️ KV缓存存储错误:', kvError);
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
- 在页面底部添加版权信息和生成时间，版权所有者为"智绘链图"而不是"产业链地图"
- 为数据和信息设计适合的可视化图表和组件
- 突出显示重要的数据点和关键发现
- 对比表格必须美观且易读，使用现代化的表格设计，确保表格内容对齐整齐，有适当的间距和边框
- 尝试使用Clearbit API获取公司logo: https://logo.clearbit.com/{公司英文名称}.com，并显示在报告头部

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

## 响应式设计

- 页面必须在所有设备上（手机、平板、桌面）完美展示
- 针对不同屏幕尺寸优化布局和字体大小

## 图表与视觉元素

- 根据内容自动选择合适的图表类型（饼图、柱状图、折线图、雷达图等）
- 对于SWOT分析，使用四象限图表
- 对于竞争分析，使用精美的比较表格或雷达图，必须特别注意表格的美观性
- 对于财务分析，使用趋势图和KPI卡片
- 对于风险分析，使用热力图或等级指示器

## 交互体验

- 添加适当的微交互效果提升用户体验
- 页面滚动时有平滑过渡效果
- 内容区块加载时有优雅的淡入动画
- 提供目录导航，方便用户跳转到不同章节
- 当用户滚动到特定章节时，相应的目录项应该自动高亮

## 输出要求

- 提供完整可运行的单一HTML文件，包含所有必要的CSS和JavaScript
- 确保代码符合W3C标准，无错误警告

## 报告内容

以下是需要展示的企业分析内容，请根据内容特点设计最合适的可视化表现形式:

${JSON.stringify(sections, null, 2)}

请基于以上要求和内容，创建一个完整的HTML文件。生成的HTML应当可以独立运行，不依赖外部服务器（除了CDN资源）。

特别注意：
1. 对比表格的视觉呈现必须精美，使用线条、颜色和间距让表格内容清晰易读
2. 实现滚动同步高亮目录功能，使用Intersection Observer API
3. 页脚版权信息显示为"智绘链图"而非"产业链地图"
4. 尝试使用Clearbit API获取公司logo，如果无法获取则使用公司首字母作为替代图标
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
    "model": "anthropic/claude-3.7-sonnet",
    "messages": [
      {
        "role": "user",
        "content": prompt
      }
    ],
    "temperature": 0.7,
    "top_p": 1,
    "frequency_penalty": 0,
    "presence_penalty": 0,
    "stream": false,
    "max_tokens": 100000 // 增加token限制，确保能生成完整的HTML
  };

  console.log('准备发送OpenRouter HTML生成请求:', {
    url: OPENROUTER_API_URL,
    model: payload.model,
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

        if (!responseData.choices || !responseData.choices[0]?.message?.content) {
          console.error('无效的API响应结构:', JSON.stringify(responseData).substring(0, 500) + '...');
          throw new Error('API响应格式错误');
        }

        const htmlContent = responseData.choices[0].message.content;
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

  // 尝试使用公司英文名（如果没有提供，则使用中文名进行转换）
  const companyEnName = companyName.match(/\(([^)]+)\)/) ? 
    companyName.match(/\(([^)]+)\)/)?.[1] || '' : 
    companyName.replace(/[\u4e00-\u9fa5]/g, '').trim();
    
  const firstLetter = companyName.charAt(0);
  const safeFirstLetter = firstLetter.replace(/"/g, '\'');

  // 生成目录
  const tableOfContents = sections.map((section, index) => {
    return `<a href="#section-${index + 1}" class="toc-item flex items-center py-2 px-4 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mb-2" data-section="section-${index + 1}">
      <span class="w-8 h-8 inline-flex items-center justify-center rounded-full mr-3" style="background-color: ${primaryColor}; color: white;">
        ${index + 1}
      </span>
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
    .competition-table th, .competition-table td {
      border: 1px solid #e5e7eb;
      padding: 12px 16px;
    }
    .competition-table thead th {
      background-color: rgba(var(--primary-color-rgb), 0.1);
      color: var(--primary-color);
      font-weight: 600;
    }
    .competition-table tbody tr:nth-child(even) {
      background-color: rgba(var(--secondary-color-rgb), 0.05);
    }
    .competition-table tbody tr:hover {
      background-color: rgba(var(--accent-color-rgb), 0.05);
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
        <!-- 尝试加载公司logo -->
        <div class="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center mr-4 border border-gray-200" style="background-color: ${primaryColor};">
          <img 
            src="https://logo.clearbit.com/${companyEnName.replace(/\s+/g, '')}.com" 
            alt="${companyName}的Logo" 
            class="company-logo w-full h-full object-cover"
            onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22 fill=%22white%22><text x=%2250%%22 y=%2250%%22 style=%22dominant-baseline:middle;text-anchor:middle;font-size:50px%22>${safeFirstLetter}</text></svg>'; this.classList.add('fallback-logo');"
          />
        </div>
        <h1 class="text-4xl font-bold" style="color: ${primaryColor};">${companyName}</h1>
      </div>
      <p class="text-xl mb-2">${industryName} 行业分析报告</p>
      <p class="text-sm opacity-75">生成日期：${currentDate}</p>
    </header>

    <!-- 主体内容 -->
    <div class="flex flex-col lg:flex-row gap-8">
      <!-- 侧边栏目录 -->
      <div class="lg:w-1/4">
        <div class="sticky top-8 p-6 rounded-lg shadow-lg" style="background-color: white;">
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
      // 查找表格内容并为其添加特殊样式
      processedContent = processedContent.replace(
        /(\|.*\|)(\n\|[-:]+\|[-:]+\|.*\n)(\|.*\|(\n\|.*\|)*)/g, 
        (match) => {
          // 将原始表格标记转换为HTML表格
          const rows = match.split('\n').filter(row => row.trim().length > 0);
          if (rows.length < 2) return match; // 如果不是有效表格，保持原样
          
          // 第一行是表头
          const headerRow = rows[0];
          // 第二行是对齐符号
          // 其余行是数据
          const dataRows = rows.slice(2);
          
          // 解析表头
          const headers = headerRow.split('|')
            .filter(cell => cell.trim().length > 0)
            .map(cell => cell.trim());
          
          // 构建HTML表格
          let htmlTable = `
<div class="overflow-x-auto my-6">
  <table class="competition-table min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
    <thead class="bg-gray-50 dark:bg-gray-700">
      <tr>
        ${headers.map(header => `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">${header}</th>`).join('')}
      </tr>
    </thead>
    <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
`;
          
          // 添加数据行
          dataRows.forEach((row, rowIndex) => {
            const cells = row.split('|')
              .filter(cell => cell.trim().length > 0)
              .map(cell => cell.trim());
            
            const isOdd = rowIndex % 2 === 0;
            const rowClass = isOdd ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900';
            
            htmlTable += `      <tr class="${rowClass} hover:bg-gray-100 dark:hover:bg-gray-700">
        ${cells.map((cell, cellIndex) => {
          // 第一列通常是公司或特性名称，给予特殊样式
          if (cellIndex === 0) {
            return `<td class="px-6 py-4 whitespace-nowrap text-sm font-medium" style="color: ${primaryColor};">${cell}</td>`;
          }
          return `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${cell}</td>`;
        }).join('')}
      </tr>`;
          });
          
          htmlTable += `    </tbody>
  </table>
</div>`;
          
          return htmlTable;
        }
      );
    }
    
    // 处理常规Markdown内容
    processedContent = processedContent
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // 加粗
      .replace(/\*(.*?)\*/g, '<em>$1</em>')              // 斜体
      .replace(/\n\n/g, '</p><p>')                       // 段落
      .replace(/\n- (.*)/g, '<li>$1</li>')               // 列表项
      .replace(/<li>.*<\/li>(\n<li>.*<\/li>)*/g, '<ul>$&</ul>');  // 列表包装

    return `<section id="section-${index + 1}" class="mb-16 reveal-section">
      <div class="flex items-center mb-6">
        <div class="w-10 h-10 inline-flex items-center justify-center rounded-full mr-4" style="background-color: ${primaryColor}; color: white;">
          ${index + 1}
        </div>
        <h2 class="text-2xl font-bold" style="color: ${textColor};">${section.title}</h2>
      </div>
      <div class="pl-14">
        <p>${processedContent}</p>
      </div>
    </section>`;
  }).join('\n');
} 