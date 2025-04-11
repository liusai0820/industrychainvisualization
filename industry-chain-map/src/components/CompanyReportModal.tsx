'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { toast } from 'react-hot-toast';
import { generateDocx, downloadDocx } from '@/utils/docxGenerator';

// 内联缓存工具函数，避免依赖外部模块
const CACHE_KEY_PREFIX = 'industry-chain-map:company-analysis:';
const CACHE_EXPIRY = 60 * 60 * 1000; // 1小时过期

function saveToCache<T>(key: string, data: T): void {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${key}`;
    const cacheItem = {
      timestamp: Date.now(),
      data
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
    console.log(`缓存数据已保存: ${key}`);
  } catch (error) {
    console.warn('保存缓存失败:', error);
    // 静默失败 - 缓存失败不应影响主要功能
  }
}

function getFromCache<T>(key: string): T | null {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${key}`;
    const cachedValue = localStorage.getItem(cacheKey);
    
    if (!cachedValue) return null;
    
    const cacheItem = JSON.parse(cachedValue) as {timestamp: number, data: T};
    const now = Date.now();
    
    // 检查是否过期
    if (now - cacheItem.timestamp > CACHE_EXPIRY) {
      console.log(`缓存已过期: ${key}`);
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    console.log(`使用缓存数据: ${key}`);
    return cacheItem.data;
  } catch (error) {
    console.warn('读取缓存失败:', error);
    return null;
  }
}

interface CompanyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  industryName?: string;
}

interface AnalysisSection {
  title: string;
  content: string;
}

interface AnalysisResult {
  rawMarkdown: string;
  sections: AnalysisSection[];
}

// 检测是否为SWOT分析章节
const isSwotSection = (title: string): boolean => {
  const swotKeywords = ['swot', '优势', '劣势', '机遇', '威胁', 'strengths', 'weaknesses', 'opportunities', 'threats'];
  const titleLower = title.toLowerCase();
  
  // 检查标题是否包含SWOT关键词
  return swotKeywords.some(keyword => titleLower.includes(keyword));
};

// 检测是否为竞争分析章节
const isCompetitionAnalysisSection = (title: string): boolean => {
  const competitionKeywords = ['竞争', '对比', '比较', 'vs', '产品竞争力', '竞争对手'];
  const titleLower = title.toLowerCase();
  
  // 检查标题是否包含竞争分析关键词
  return competitionKeywords.some(keyword => titleLower.includes(keyword));
};

// 竞争分析表格组件
const CompetitionAnalysis = ({ content }: { content: string }) => {
  // 提取表格内容
  const extractTables = (text: string) => {
    // 使用正则表达式匹配表格内容
    const tableRegex = /\|.*\|[\s\S]*?\n\s*\|[-|:]+\|[\s\S]*?\n\s*\|.*\|/g;
    const tableMatches = text.match(tableRegex);
    
    if (!tableMatches) return [];
    
    return tableMatches.map(tableContent => {
      // 分割表格行
      const rows = tableContent.split('\n').filter(row => row.trim().startsWith('|'));
      
      // 检查是否有足够的行
      if (rows.length < 3) return null; // 至少需要表头、分隔行和一行数据
      
      // 处理表头
      const headerRow = rows[0];
      const headers = headerRow
        .split('|')
        .filter(cell => cell.trim() !== '')
        .map(cell => cell.trim());
      
      // 跳过分隔行
      // 处理数据行
      const data = rows.slice(2).map(row => {
        return row
          .split('|')
          .filter(cell => cell.trim() !== '')
          .map(cell => cell.trim());
      });
      
      return { headers, data };
    }).filter(table => table !== null);
  };
  
  const tables = extractTables(content);
  
  if (tables.length === 0) {
    // 如果没有找到表格，返回 null 而不是显示默认表格
    return null;
  }
  
  return (
    <div className="my-8">
      {tables.map((table, tableIndex) => (
        <div key={tableIndex} className="overflow-x-auto mb-8">
          <table className="min-w-full divide-y divide-gray-300 border border-gray-200 rounded-lg shadow-md">
            <thead className="bg-gray-50">
              <tr>
                {table.headers.map((header, index) => (
                  <th 
                    key={index} 
                    className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900 border-r last:border-r-0"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {table.data.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {row.map((cell, cellIndex) => (
                    <td 
                      key={cellIndex} 
                      className={`px-4 py-3 text-sm ${cellIndex === 0 ? 'font-medium text-gray-900' : 'text-gray-500'} border-r last:border-r-0`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

// SWOT分析组件
const SwotAnalysis = ({ content }: { content: string }) => {
  // 提取SWOT各部分内容
  const extractSwotItems = (text: string) => {
    // 定义正则表达式来匹配各部分
    const strengthsRegex = /(?:优势|strengths)[^]*?(?=(?:劣势|weaknesses)|(?:机遇|opportunities)|(?:威胁|threats)|$)/i;
    const weaknessesRegex = /(?:劣势|weaknesses)[^]*?(?=(?:机遇|opportunities)|(?:威胁|threats)|$)/i;
    const opportunitiesRegex = /(?:机遇|opportunities)[^]*?(?=(?:威胁|threats)|$)/i;
    const threatsRegex = /(?:威胁|threats)[^]*?(?=$)/i;
    
    // 提取各部分内容
    const strengthsMatch = text.match(strengthsRegex);
    const weaknessesMatch = text.match(weaknessesRegex);
    const opportunitiesMatch = text.match(opportunitiesRegex);
    const threatsMatch = text.match(threatsRegex);
    
    // 提取列表项
    const extractItems = (match: RegExpMatchArray | null) => {
      if (!match) return [];
      
      const content = match[0];
      // 移除标题行
      const contentWithoutTitle = content.replace(/^.*?(?:优势|strengths|劣势|weaknesses|机遇|opportunities|威胁|threats).*$/im, '');
      
      // 提取列表项
      const items = contentWithoutTitle.match(/[-*•]\s+([^\n]+)/g) || [];
      
      return items.map(item => 
        item.replace(/^[-*•]\s+/, '')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .trim()
      );
    };
    
    return {
      strengths: extractItems(strengthsMatch),
      weaknesses: extractItems(weaknessesMatch),
      opportunities: extractItems(opportunitiesMatch),
      threats: extractItems(threatsMatch)
    };
  };
  
  const swotItems = extractSwotItems(content);
  
  // 如果没有足够的SWOT内容，创建默认内容
  if (swotItems.strengths.length === 0 && swotItems.weaknesses.length === 0 && 
      swotItems.opportunities.length === 0 && swotItems.threats.length === 0) {
    return null;
  }
  
  return (
    <div className="grid grid-cols-2 gap-4 max-w-3xl mx-auto">
      {/* 优势 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm">
        <h4 className="text-blue-700 font-bold mb-2 text-center">优势</h4>
        <ul className="list-disc pl-5 text-blue-800 font-kai">
          {swotItems.strengths.length > 0 ? (
            swotItems.strengths.map((item, index) => (
              <li key={index} className="mb-1">{item}</li>
            ))
          ) : (
            <li className="mb-1">暂无数据</li>
          )}
        </ul>
      </div>
      
      {/* 劣势 */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
        <h4 className="text-red-700 font-bold mb-2 text-center">劣势</h4>
        <ul className="list-disc pl-5 text-red-800 font-kai">
          {swotItems.weaknesses.length > 0 ? (
            swotItems.weaknesses.map((item, index) => (
              <li key={index} className="mb-1">{item}</li>
            ))
          ) : (
            <li className="mb-1">暂无数据</li>
          )}
        </ul>
      </div>
      
      {/* 机遇 */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-sm">
        <h4 className="text-green-700 font-bold mb-2 text-center">机遇</h4>
        <ul className="list-disc pl-5 text-green-800 font-kai">
          {swotItems.opportunities.length > 0 ? (
            swotItems.opportunities.map((item, index) => (
              <li key={index} className="mb-1">{item}</li>
            ))
          ) : (
            <li className="mb-1">暂无数据</li>
          )}
        </ul>
      </div>
      
      {/* 威胁 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-sm">
        <h4 className="text-yellow-700 font-bold mb-2 text-center">威胁</h4>
        <ul className="list-disc pl-5 text-yellow-800 font-kai">
          {swotItems.threats.length > 0 ? (
            swotItems.threats.map((item, index) => (
              <li key={index} className="mb-1">{item}</li>
            ))
          ) : (
            <li className="mb-1">暂无数据</li>
          )}
        </ul>
      </div>
    </div>
  );
};

// 为ReactMarkdown组件定义适当的类型
interface MarkdownComponentProps {
  node?: React.ReactNode;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown; // 使用unknown代替any
}

// 类型声明 (添加或移动到文件上部)
type GenerationStage = 'collecting' | 'analyzing' | 'drafting' | 'reviewing' | 'finalizing' | 'complete';

interface Stage {
  title: string;
  messages: string[];
  duration: number;
  progressStart: number;
  progressEnd: number;
}

// 拆分出加载状态显示组件
const LoadingState = ({ 
  progress, 
  stageMessage, 
  stages, 
  generationStage 
}: { 
  progress: number; 
  stageMessage: string; 
  stages: Record<string, Stage>; 
  generationStage: GenerationStage; 
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      {/* 精美的进度指示器 */}
      <div className="w-full max-w-md mb-8">
        <div className="relative pt-1">
          <div className="flex items-center justify-between mb-2">
            <div className="text-lg font-bold text-indigo-700">
              {stages[generationStage].title}
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold inline-block text-indigo-700">
                {progress}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-gray-200">
            <div 
              style={{ width: `${progress}%` }} 
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
            ></div>
          </div>
        </div>
        <div className="text-center text-indigo-600 font-medium">
          {stageMessage}
        </div>
      </div>
      <div className="animate-pulse flex space-x-4 items-center">
        <div className="rounded-full bg-indigo-100 h-12 w-12 flex items-center justify-center">
          <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <div className="h-4 bg-indigo-100 rounded w-48"></div>
          <div className="h-3 bg-indigo-50 rounded w-32 mt-2"></div>
        </div>
      </div>
    </div>
  );
};

// 拆分出错误状态显示组件
const ErrorState = ({ 
  error, 
  fetchCompanyAnalysis 
}: { 
  error: string | null; 
  fetchCompanyAnalysis: () => void; 
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="text-red-500 mb-4">
        <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">生成报告时出错</h3>
      <p className="text-gray-600 mb-6 text-center max-w-md">{error}</p>
      <button
        onClick={() => {
          fetchCompanyAnalysis();
        }}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
      >
        重试
      </button>
    </div>
  );
};

// 拆分出报告目录组件
const TableOfContents = ({ sections }: { sections: AnalysisSection[] }) => {
  if (!sections || sections.length === 0) return null;
  
  return (
    <div className="report-toc mb-12 bg-gray-50 p-6 rounded-lg max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">目录</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ul className="space-y-2">
          {sections.slice(0, Math.ceil(sections.length / 2)).map((section, index) => (
            <li key={index} className="flex items-center">
              <span className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-full mr-2 text-sm font-bold">
                {index + 1}
              </span>
              <a 
                href={`#section-${index}`} 
                className="text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                {section.title.replace(/^\d+\.\s*/, '')}
              </a>
            </li>
          ))}
        </ul>
        <ul className="space-y-2">
          {sections.slice(Math.ceil(sections.length / 2)).map((section, index) => (
            <li key={index + Math.ceil(sections.length / 2)} className="flex items-center">
              <span className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-full mr-2 text-sm font-bold">
                {index + 1 + Math.ceil(sections.length / 2)}
              </span>
              <a 
                href={`#section-${index + Math.ceil(sections.length / 2)}`} 
                className="text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                {section.title.replace(/^\d+\.\s*/, '')}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// 拆分出报告内容组件
const ReportContent = ({ sections }: { sections: AnalysisSection[] }) => {
  return (
    <div className="report-content mx-8 mb-12 font-kai">
      {sections?.map((section, index) => (
        <ReportSection key={index} section={section} index={index} />
      ))}
    </div>
  );
};

// 拆分出报告章节组件
const ReportSection = ({ section, index }: { section: AnalysisSection; index: number }) => {
  return (
    <div id={`section-${index}`} className="mb-12">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-full mr-3 text-lg font-bold shadow-md">
          {index + 1}
        </div>
        <h2 className="text-2xl font-bold text-gray-800">
          {section.title.replace(/^#+\s*/, '').replace(/^\d+\.\s*/, '')}
        </h2>
      </div>
      <div className="pl-14">
        <div className="prose prose-lg prose-indigo max-w-none font-kai">
          {/* 检测并显示竞争分析 */}
          {isCompetitionAnalysisSection(section.title) && (
            <CompetitionAnalysis content={section.content} />
          )}
          
          {/* 检测并显示SWOT分析 */}
          {isSwotSection(section.title) && (
            <>
              <h3 className="text-xl font-bold text-center mb-4">SWOT分析</h3>
              <SwotAnalysis content={section.content} />
            </>
          )}
          
          {/* 显示原始内容 */}
          <MarkdownRenderer content={section.content} />
        </div>
      </div>
    </div>
  );
};

// 拆分出Markdown渲染组件
const MarkdownRenderer = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        // @ts-expect-error - ReactMarkdown类型定义问题
        table: ({...props}: MarkdownComponentProps) => (
          <div className="overflow-x-auto my-6 rounded-lg shadow-md border border-gray-200">
            <table className="min-w-full divide-y divide-gray-300" {...props} />
          </div>
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        thead: ({...props}: MarkdownComponentProps) => (
          <thead className="bg-indigo-50" {...props} />
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        th: ({...props}: MarkdownComponentProps) => (
          <th className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900 border-r last:border-r-0" {...props} />
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        tr: ({...props}: MarkdownComponentProps) => (
          <tr className="border-b last:border-b-0 hover:bg-gray-50" {...props} />
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        td: ({...props}: MarkdownComponentProps) => (
          <td className="px-4 py-3 text-sm text-gray-500 border-r last:border-r-0" {...props} />
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        code: ({inline, className, children, ...props}: MarkdownComponentProps) => {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={tomorrow}
              language={match[1]}
              PreTag="div"
              className="rounded-lg shadow-sm my-4"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={`${className} px-1.5 py-0.5 bg-gray-100 text-indigo-700 rounded text-sm`} {...props}>
              {children}
            </code>
          );
        },
        // @ts-expect-error - ReactMarkdown类型定义问题
        p: ({...props}: MarkdownComponentProps) => (
          <p className="my-4 leading-relaxed text-gray-700 font-kai" {...props} />
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        h3: ({...props}: MarkdownComponentProps) => (
          <h3 className="text-xl font-bold text-gray-800 mt-6 mb-3" {...props} />
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        h4: ({...props}: MarkdownComponentProps) => (
          <h4 className="text-lg font-semibold text-gray-800 mt-5 mb-2" {...props} />
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        ul: ({...props}: MarkdownComponentProps) => (
          <ul className="list-disc pl-6 my-4 space-y-2 text-gray-700" {...props} />
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        ol: ({...props}: MarkdownComponentProps) => (
          <ol className="list-decimal pl-6 my-4 space-y-2 text-gray-700" {...props} />
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        li: ({...props}: MarkdownComponentProps) => (
          <li className="pl-1 py-0.5 font-kai" {...props} />
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        blockquote: ({...props}: MarkdownComponentProps) => (
          <blockquote className="border-l-4 border-indigo-300 pl-4 py-1 my-4 text-gray-600 italic font-kai" {...props} />
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        a: ({...props}: MarkdownComponentProps) => (
          <a className="text-indigo-600 hover:text-indigo-800 hover:underline" {...props} />
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        strong: ({...props}: MarkdownComponentProps) => (
          <strong className="font-bold text-indigo-700" {...props} />
        )
      }}
    >
      {content.replace(/^\d+\.\s*/, '')}
    </ReactMarkdown>
  );
};

// 修改 ReportHeader 组件接受非空字符串
const ReportHeader = ({ companyName }: { companyName: string }) => {
  return (
    <div className="report-header mb-12 text-center">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        {companyName} 公司研究报告
      </h1>
      <p className="text-gray-500">
        报告生成日期: {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  );
};

// 创建全局请求记录，确保同一个公司不会重复请求
// 但不要拦截有效的首次请求
const requestedCompanies = new Map<string, {
  timestamp: number,
  result: any
}>();

// 添加锁定和清理机制，防止数据持续累积
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestedCompanies.entries()) {
    // 清理超过1小时的请求记录
    if (now - value.timestamp > 60 * 60 * 1000) {
      requestedCompanies.delete(key);
    }
  }
}, 5 * 60 * 1000); // 每5分钟清理一次

// 抽离为自定义hook，管理报告生成状态和进度模拟
const useReportGeneration = (companyName: string, industryName: string, toastApi: typeof toast) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stageMessage, setStageMessage] = useState('');
  const [generationStage, setGenerationStage] = useState<GenerationStage>('collecting');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const apiResponseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 定义报告生成阶段
  const stages = useMemo<Record<string, Stage>>(() => ({
    collecting: {
      title: '收集数据',
      messages: ['正在收集公司基本信息...', '检索行业数据...', '获取市场动态...', '分析企业财务状况...'],
      duration: 15000, // 增加持续时间
      progressStart: 0,
      progressEnd: 15
    },
    analyzing: {
      title: '分析数据',
      messages: ['进行SWOT分析...', '分析企业竞争态势...', '评估公司商业模式...', '审视企业发展战略...'],
      duration: 20000, // 增加持续时间
      progressStart: 15,
      progressEnd: 30
    },
    drafting: {
      title: '起草报告',
      messages: ['撰写公司概况...', '整理运营分析...', '汇总财务数据...', '编写发展战略报告...'],
      duration: 30000, // 增加持续时间
      progressStart: 30,
      progressEnd: 50
    },
    reviewing: {
      title: '审核内容',
      messages: ['检查信息准确性...', '校对分析结论...', '优化报告结构...', '完善数据呈现...'],
      duration: 40000, // 增加持续时间
      progressStart: 50,
      progressEnd: 70
    },
    finalizing: {
      title: '等待AI响应',
      messages: [
        '等待AI生成报告内容...',
        '报告生成中，请耐心等待...',
        '大型模型正在处理您的请求...',
        '生成详细分析可能需要一些时间...',
        '正在等待AI响应，这可能需要几分钟...',
        '长时间处理中，复杂的分析可能需要5-10分钟...',
        '仍在等待模型响应，请耐心等待...',
        '生成深度分析需要更多时间，请继续等待...'
      ],
      duration: 480000, // 延长最后阶段的持续时间到8分钟
      progressStart: 70,
      progressEnd: 95 // 最大只到95%，留出一点空间
    },
    complete: {
      title: '报告完成',
      messages: ['报告已生成完毕'],
      duration: 0,
      progressStart: 95,
      progressEnd: 100
    }
  }), []);
  
  // 开始进度模拟
  const startProgressSimulation = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    let currentStage: GenerationStage = 'collecting';
    let startTime = Date.now();
    let stageIndex = 0;
    const stageOrder: GenerationStage[] = ['collecting', 'analyzing', 'drafting', 'reviewing', 'finalizing'];
    
    progressIntervalRef.current = setInterval(() => {
      const currentTime = Date.now();
      const stageDuration = stages[currentStage].duration;
      const elapsedTime = currentTime - startTime;
      
      // 如果当前阶段已完成，进入下一阶段
      if (elapsedTime >= stageDuration && currentStage !== 'finalizing') {
        stageIndex++;
        if (stageIndex < stageOrder.length) {
          currentStage = stageOrder[stageIndex];
          setGenerationStage(currentStage);
          startTime = currentTime;
        }
      }
      
      // 计算当前阶段的进度百分比，但对于finalizing阶段，限制最大进度
      const stageProgress = Math.min(elapsedTime / stageDuration, currentStage === 'finalizing' ? 0.9 : 1);
      const startProgress = stages[currentStage].progressStart;
      const endProgress = stages[currentStage].progressEnd;
      const currentProgress = startProgress + (endProgress - startProgress) * stageProgress;
      
      setProgress(Math.floor(currentProgress));
    }, 200);
    
    // 设置安全超时，如果4分钟后仍无响应，显示提示消息
    apiResponseTimeoutRef.current = setTimeout(() => {
      if (progressIntervalRef.current) {
        // 更新消息，告知用户API响应延迟
        setStageMessage('AI响应较慢，请继续等待...');
        toastApi('生成报告需要较长时间，请耐心等待', {
          duration: 5000,
          icon: '⏳'
        });
      }
    }, 240000); // 4分钟
    
    // 设置更长的超时提示，如果8分钟后仍无响应
    setTimeout(() => {
      if (progressIntervalRef.current) {
        setStageMessage('复杂分析正在进行中，可能需要10分钟...');
        toastApi('复杂分析可能需要较长时间（5-10分钟），我们仍在等待结果', {
          duration: 8000,
          icon: '⏳'
        });
      }
    }, 480000); // 8分钟
  }, [stages, toastApi]);
  
  // 停止进度模拟
  const stopProgressSimulation = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    if (apiResponseTimeoutRef.current) {
      clearTimeout(apiResponseTimeoutRef.current);
      apiResponseTimeoutRef.current = null;
    }
    
    // 设置为"complete"阶段
    setGenerationStage('complete');
    // 确保进度达到100%
    setProgress(100);
  }, []);
  
  // 定义获取公司分析的函数
  const fetchCompanyAnalysis = useCallback(async () => {
    // 创建请求标识符
    const requestKey = `${companyName}:${industryName || ''}`;
    
    // 先检查本地存储缓存
    const cachedData = getFromCache<AnalysisResult>(requestKey);
    if (cachedData) {
      console.log('从本地存储使用缓存的企业分析结果:', requestKey);
      
      // 设置结果但仍显示简短的加载状态，以提供更好的用户体验
      setLoading(true);
      setError('');
      setGenerationStage('collecting');
      setProgress(0);
      
      // 模拟简短的加载过程
      startProgressSimulation();
      
      // 短暂延迟后显示结果
      setTimeout(() => {
        stopProgressSimulation();
        setAnalysisResult(cachedData);
        setProgress(100);
        setGenerationStage('complete');
        setLoading(false);
        
        toastApi.success('快速加载企业分析完成！', {
          duration: 3000,
          icon: '⚡'
        });
      }, 500);
      
      return;
    }
    
    // 检查是否有内存缓存结果
    const cachedRequest = requestedCompanies.get(requestKey);
    if (cachedRequest?.result) {
      console.log('使用内存缓存的企业分析结果:', requestKey);
      
      // 设置结果但仍显示简短的加载状态
      setLoading(true);
      setError('');
      setGenerationStage('collecting');
      setProgress(0);
      
      // 模拟简短的加载过程
      startProgressSimulation();
      
      // 短暂延迟后显示结果
      setTimeout(() => {
        stopProgressSimulation();
        setAnalysisResult(cachedRequest.result);
        setProgress(100);
        setGenerationStage('complete');
        setLoading(false);
        
        toastApi.success('快速加载企业分析完成！', {
          duration: 3000,
          icon: '⚡'
        });
      }, 500);
      
      return;
    }
    
    const fetchAnalysis = async () => {
      if (!companyName) return;
      
      setLoading(true);
      setError('');
      setGenerationStage('collecting');
      setProgress(0);

      // 前端请求级别的超时保护
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error('请求超时，服务器响应时间过长'));
        }, 10 * 60 * 1000); // 提高到10分钟超时
      });
      
      try {
        // 设置模拟的进度更新
        startProgressSimulation();
        
        // 直接使用company-analysis API，不再使用旧的submit/status流程
        console.log('开始请求企业分析API，公司名称:', companyName);

        // 添加随机查询参数防止浏览器缓存
        const cacheBuster = Date.now();
        
        // 创建fetch请求，可以被超时中断
        const fetchPromise = (async () => {
          const analysisResponse = await fetch(`/api/company-analysis?_=${cacheBuster}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store',
              'X-Request-ID': `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
            },
            body: JSON.stringify({
              companyName: companyName || '',
              industryName: industryName || ''
            }),
          });
          
          const responseData = await analysisResponse.json();
          
          // 处理429状态码 (请求过多)
          if (analysisResponse.status === 429) {
            console.warn('⚠️ 请求频率过高:', responseData);
            
            // 如果返回了锁定时间，显示具体的等待时间
            const lockTimeLeft = responseData.lockTimeLeft || 5;
            const errorMessage = responseData.error || `请求频率过高，请等待${lockTimeLeft}秒后再试`;
            
            // 停止进度模拟
            stopProgressSimulation();
            setProgress(0);
            setError(errorMessage);
            
            // 显示友好的提示
            toastApi.error(errorMessage, {
              duration: 5000,
              icon: '⏱️'
            });
            
            // 如果锁定时间较长，显示一个倒计时
            if (lockTimeLeft > 5) {
              toastApi(`将在${lockTimeLeft}秒后自动重试`, {
                duration: lockTimeLeft * 1000,
                icon: '⌛'
              });
              
              // 设置自动重试定时器
              setTimeout(() => {
                toastApi.success('正在重新尝试获取分析结果', {
                  duration: 3000,
                  icon: '🔄'
                });
                fetchCompanyAnalysis();
              }, lockTimeLeft * 1000);
            }
            
            setLoading(false);
            return;
          }
          
          // 检查是否是备用结果
          const isFallback = analysisResponse.headers.get('X-Fallback') === 'true' || responseData.fallbackReason;
          
          if (!analysisResponse.ok) {
            const errorMessage = responseData.error || `请求失败, 状态码: ${analysisResponse.status}`;
            throw new Error(errorMessage);
          }
          
          if (!responseData.success) {
            throw new Error(responseData.error || '分析请求失败');
          }

          // 停止进度模拟
          stopProgressSimulation();
          
          // 同时更新内存缓存和本地存储缓存
          requestedCompanies.set(requestKey, {
            timestamp: Date.now(),
            result: responseData.data
          });
          
          // 保存到本地存储以便持久化
          saveToCache(requestKey, responseData.data);
          
          // 设置结果
          setAnalysisResult(responseData.data);
          
          // 更新UI状态
          setProgress(100);
          setGenerationStage('complete');
          
          console.log('✅ 企业分析完成！');
          
          // 显示不同的成功消息
          if (isFallback) {
            // 对于备用结果显示特殊提示
            toastApi.success('已生成简要分析，点击刷新可重试完整分析', {
              duration: 5000,
              icon: '📝'
            });
          } else if (responseData.reused) {
            toastApi.success('快速加载企业分析完成！', {
              duration: 3000,
              icon: '⚡'
            });
          } else {
            toastApi.success('企业分析完成！', {
              duration: 3000,
              icon: '✨'
            });
          }
        })();
        
        // 竞争fetch和超时
        await Promise.race([fetchPromise, timeoutPromise]);
        
      } catch (error: unknown) {
        console.error('获取分析失败:', error);
        
        // 尝试创建一个本地备用结果，以确保UI可用
        const localFallbackResult: AnalysisResult = {
          rawMarkdown: `# ${companyName}临时分析报告\n\n无法连接服务器，这是本地生成的临时报告。\n\n## 基本信息\n${companyName}是${industryName || '行业'}中的企业。\n\n## 请重试\n请点击刷新按钮重新获取完整分析。`,
          sections: [
            { title: '基本信息', content: `${companyName}是${industryName || '行业'}中的企业。无法从服务器获取完整信息，这是本地生成的临时数据。` },
            { title: '请重试', content: '请点击刷新按钮重新获取完整分析。' }
          ]
        };
        
        // 如果是超时错误，提供临时分析结果而不是显示错误
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('超时')) {
          setAnalysisResult(localFallbackResult);
          setGenerationStage('complete');
          setProgress(100);
          
          toastApi.error('服务器响应超时，已生成简要信息，请点击刷新重试', {
            duration: 5000,
            icon: '⏱️'
          });
        } else {
          setError(error instanceof Error ? error.message : '获取分析失败，请稍后重试');
          toastApi.error(`获取企业分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
        
        // 停止进度模拟
        stopProgressSimulation();
      } finally {
        // 确保进度模拟停止
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        if (apiResponseTimeoutRef.current) {
          clearTimeout(apiResponseTimeoutRef.current);
          apiResponseTimeoutRef.current = null;
        }
        setLoading(false);
      }
    };
    
    fetchAnalysis();
    
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (apiResponseTimeoutRef.current) {
        clearTimeout(apiResponseTimeoutRef.current);
        apiResponseTimeoutRef.current = null;
      }
    };
  }, [companyName, industryName, toastApi, startProgressSimulation, stopProgressSimulation]);
  
  // 模拟消息更新，为用户提供更好的反馈
  useEffect(() => {
    if (!loading) return;
    
    const currentStage = stages[generationStage];
    const messages = currentStage.messages;
    let messageIndex = 0;
    
    const messageInterval = setInterval(() => {
      setStageMessage(messages[messageIndex]);
      messageIndex = (messageIndex + 1) % messages.length;
    }, Math.floor(currentStage.duration / (messages.length * 2))); // 更频繁地更新消息
    
    return () => {
      clearInterval(messageInterval);
    };
  }, [loading, generationStage, stages]);
  
  return {
    loading,
    error,
    setError,
    progress,
    stageMessage,
    generationStage,
    analysisResult,
    setAnalysisResult,
    stages,
    fetchCompanyAnalysis
  };
};

// 抽离为自定义hook，管理下载和HTML生成功能
const useReportExport = (companyName: string, industryName: string, analysisResult: AnalysisResult | null, toastApi: typeof toast) => {
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [generatingHTML, setGeneratingHTML] = useState(false);
  
  const downloadAsDocx = async () => {
    if (!analysisResult) return;
    
    setDownloadingDocx(true);
    
    try {
      // 使用新的docxGenerator工具生成Word文档
      const docBlob = await generateDocx({
        companyName,
        industryName,
        analysisResult
      });
      
      // 下载生成的文档
      downloadDocx(companyName, docBlob);
      
      toastApi.success('Word文档生成成功！', {
        duration: 3000,
        icon: '📄'
      });
      
    } catch (error) {
      console.error('Word文档生成失败:', error);
      toastApi.error('Word文档生成失败，请稍后重试');
    } finally {
      setDownloadingDocx(false);
    }
  };

  const generateHTMLReport = async () => {
    try {
      setGeneratingHTML(true);
      
      // 检查是否有分析结果
      if (!analysisResult || analysisResult.sections.length === 0) {
        toastApi.error('无法生成报告：分析结果为空');
        setGeneratingHTML(false);
        return;
      }
      
      // 发送请求生成HTML报告
      const response = await fetch('/api/company-analysis-html', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: companyName || '',
          industryName: industryName || '',
          analysisResult
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP错误，状态码: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '生成HTML报告失败');
      }
      
      // 检查是否从缓存获取
      if (result.fromCache) {
        const cacheType = result.cacheSource === 'memory' ? '本地内存' : '云端';
        const cacheDate = new Date(result.cachedAt).toLocaleString();
        
        toastApi.success(`已从${cacheType}缓存加载报告`, { 
          duration: 3000,
          icon: '📦'
        });
        console.log(`报告来自${cacheType}缓存，生成于: ${cacheDate}`);
      } else if (result.fallback) {
        // 如果使用了备选方案，通知用户
        toastApi.error('使用了模板生成报告（API生成失败）', {
          duration: 5000,
          icon: '⚠️'
        });
      } else {
        toastApi.success('报告生成成功！', {
          duration: 3000
        });
      }
      
      // 获取HTML数据
      const htmlContent = result.data;
      
      // 在新窗口中打开HTML
      try {
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(htmlContent);
          newWindow.document.close();
        } else {
          toastApi.error('无法打开新窗口，请检查您的浏览器是否阻止了弹出窗口');
        }
      } catch (error) {
        console.error('打开新窗口显示HTML失败:', error);
        toastApi.error('无法显示HTML报告，请检查浏览器设置');
      }
      
      // 自动下载HTML文件
      try {
        // 获取当前日期并格式化为 YYYY-MM-DD
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        const fileName = `${companyName}深度研究报告${dateString}.html`;
        
        // 创建一个Blob对象
        const blob = new Blob([htmlContent], { type: 'text/html' });
        
        // 创建一个下载链接
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = fileName;
        
        // 触发下载
        document.body.appendChild(downloadLink);
        downloadLink.click();
        
        // 清理
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(downloadLink.href);
        
        toastApi.success(`HTML报告已下载为: ${fileName}`, {
          duration: 4000,
          icon: '💾'
        });
      } catch (downloadError) {
        console.error('下载HTML文件失败:', downloadError);
        toastApi.error('无法下载HTML文件');
      }
      
    } catch (error) {
      console.error('生成HTML报告失败:', error);
      // 特别处理网络中断错误
      const errorMessage = error instanceof Error && 
                          error.message.includes('Premature close') ? 
                          '网络连接中断，请检查您的网络并重试' : 
                          `生成HTML报告失败: ${error instanceof Error ? error.message : '未知错误'}`;
      toastApi.error(errorMessage);
    } finally {
      setGeneratingHTML(false);
    }
  };
  
  return {
    downloadingDocx,
    generatingHTML,
    downloadAsDocx,
    generateHTMLReport
  };
};

// 拆分出操作按钮组件
const ActionButtons = ({ 
  generateHTMLReport, 
  downloadAsDocx, 
  generatingHTML, 
  downloadingDocx 
}: { 
  generateHTMLReport: () => void;
  downloadAsDocx: () => void;
  generatingHTML: boolean;
  downloadingDocx: boolean;
}) => {
  // 渲染报告操作按钮
  return (
    <div className="flex space-x-2">
      <button
        onClick={generateHTMLReport}
        disabled={generatingHTML}
        className="flex items-center px-3 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-md hover:from-green-700 hover:to-green-800 transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:shadow-none"
        title="生成可视化报告"
      >
        {generatingHTML ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            生成中...
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
            可视化报告
          </>
        )}
      </button>
      
      <button
        onClick={downloadAsDocx}
        disabled={downloadingDocx}
        className="flex items-center px-3 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-md hover:from-green-700 hover:to-green-800 transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:shadow-none"
        title="下载Word文档"
      >
        {downloadingDocx ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            处理中...
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
            下载Word文档
          </>
        )}
      </button>
    </div>
  );
};

// 主组件，现在更精简
const CompanyReportModal: React.FC<CompanyReportModalProps> = ({
  isOpen,
  onClose,
  companyName,
  industryName,
}) => {
  // 确保companyName和industryName不为undefined
  const safeCompanyName = companyName || '';
  const safeIndustryName = industryName || '';
  const reportRef = useRef<HTMLDivElement>(null);
  
  // 使用自定义hooks
  const {
    loading,
    error,
    setError,
    progress,
    stageMessage,
    generationStage,
    analysisResult,
    setAnalysisResult,
    stages,
    fetchCompanyAnalysis
  } = useReportGeneration(safeCompanyName, safeIndustryName, toast);
  
  const {
    downloadingDocx,
    generatingHTML,
    downloadAsDocx,
    generateHTMLReport
  } = useReportExport(safeCompanyName, safeIndustryName, analysisResult, toast);

  // 添加全局CSS样式
  useEffect(() => {
    // 添加楷体字体样式
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'Kai';
        src: local('KaiTi'), local('楷体'), local('STKaiti');
      }
      .font-kai {
        font-family: 'Kai', KaiTi, 楷体, STKaiti, serif;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // 初始化时获取公司分析
  useEffect(() => {
    // 仅在模态框打开且没有结果和不在加载中时请求
    if (isOpen && !analysisResult && !loading) {
      console.log('模态框打开，开始获取分析:', safeCompanyName);
      fetchCompanyAnalysis();
    }
  }, [isOpen, analysisResult, loading, fetchCompanyAnalysis, safeCompanyName]);

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      setAnalysisResult(null);
      setError(null);
    }
  }, [isOpen, setAnalysisResult, setError]);
  
  // 添加调试代码
  useEffect(() => {
    if (analysisResult) {
      console.log('分析结果:', analysisResult);
      console.log('章节数量:', analysisResult.sections?.length || 0);
      console.log('章节标题:', analysisResult.sections?.map(s => s.title) || []);
    }
  }, [analysisResult]);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-xl">
          <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
            <Dialog.Title className="text-xl font-semibold text-gray-900">
              {safeCompanyName} 企业画像
            </Dialog.Title>
            
            <div className="flex items-center space-x-4">
              {analysisResult && !loading && (
                <ActionButtons 
                  generateHTMLReport={generateHTMLReport}
                  downloadAsDocx={downloadAsDocx}
                  generatingHTML={generatingHTML}
                  downloadingDocx={downloadingDocx}
                />
              )}
              
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-1 rounded-full transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
          
          <div className="overflow-y-auto p-6 max-h-[calc(90vh-80px)]">
            {loading ? (
              <LoadingState 
                progress={progress} 
                stageMessage={stageMessage}
                stages={stages}
                generationStage={generationStage}
              />
            ) : error ? (
              <ErrorState 
                error={error} 
                fetchCompanyAnalysis={fetchCompanyAnalysis}
              />
            ) : analysisResult ? (
              <div ref={reportRef} className="report-container">
                <ReportHeader companyName={safeCompanyName} />
                <TableOfContents sections={analysisResult.sections} />
                <ReportContent sections={analysisResult.sections} />
              </div>
            ) : null}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default CompanyReportModal; 