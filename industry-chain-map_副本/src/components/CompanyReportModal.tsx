'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Document, Packer, Paragraph, HeadingLevel, AlignmentType } from 'docx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { toast } from 'react-hot-toast';

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

interface BasicInfo {
  companyName: string;
  industry?: string;
  basicInfo: {
    established: string;
    headquarters: string;
    type: string;
    scale: string;
    mainBusiness: string;
    keyMetrics: {
      revenue: string;
      employees: string;
      marketPosition: string;
    }
  };
  keyHighlights: string[];
}

interface AnalysisResult {
  basic: BasicInfo | null;
  markdown: string;
  html: string;
}

// 报告生成阶段
type ReportGenerationStage = 
  | 'collecting' 
  | 'analyzing' 
  | 'drafting' 
  | 'reviewing' 
  | 'finalizing' 
  | 'complete';

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

export default function CompanyReportModal({ 
  isOpen, 
  onClose, 
  companyName,
  industryName
}: CompanyReportModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState<ReportGenerationStage>('collecting');
  const [stageMessage, setStageMessage] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [generatingHTML, setGeneratingHTML] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef<string>('');
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 添加进度模拟功能
  const startProgressSimulation = useCallback(() => {
    // 停止任何现有的模拟
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    // 设置初始阶段和进度
    setProgress(0);
    setGenerationStage('collecting');
    let currentProgress = 0;
    
    // 创建进度模拟定时器
    progressIntervalRef.current = setInterval(() => {
      // 根据不同阶段设置不同的进度增加速度
      let increment = 0;
      
      if (currentProgress < 25) {
        // 收集阶段 (0-25%)
        increment = 0.5;
        setGenerationStage('collecting');
      } else if (currentProgress < 50) {
        // 分析阶段 (25-50%)
        increment = 0.3;
        setGenerationStage('analyzing');
      } else if (currentProgress < 75) {
        // 草拟阶段 (50-75%)
        increment = 0.2;
        setGenerationStage('drafting');
      } else if (currentProgress < 90) {
        // 审查阶段 (75-90%)
        increment = 0.1;
        setGenerationStage('reviewing');
      } else if (currentProgress < 99) {
        // 完成阶段 (90-99%)
        increment = 0.05;
        setGenerationStage('finalizing');
      } else {
        // 保持在99%，等待实际完成
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      }
      
      currentProgress = Math.min(currentProgress + increment, 99);
      setProgress(Math.round(currentProgress));
    }, 200);
  }, []);
  
  const stopProgressSimulation = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);
  
  // 报告生成阶段状态
  const stages = useMemo(() => ({
    collecting: {
      title: '收集数据',
      messages: [
        '正在收集公司基础信息...',
        '搜索相关新闻和公告...',
        '获取行业数据...',
        '分析市场趋势...',
        '整合竞争对手信息...'
      ],
      duration: 8000, // 8秒
      progressStart: 0,
      progressEnd: 20
    },
    analyzing: {
      title: '分析数据',
      messages: [
        '正在分析公司业务模式...',
        '正在评估竞争优势...',
        '正在分析市场地位...',
        '正在评估技术实力...',
        '正在分析财务状况...'
      ],
      duration: 10000,  // 10秒
      progressStart: 20,
      progressEnd: 40
    },
    drafting: {
      title: '撰写报告',
      messages: [
        '正在撰写公司概览...',
        '正在撰写业务分析...',
        '正在撰写产品评估...',
        '正在撰写财务分析...',
        '正在撰写风险评估...'
      ],
      duration: 15000,  // 15秒
      progressStart: 40,
      progressEnd: 70
    },
    reviewing: {
      title: '审核内容',
      messages: [
        '正在校对数据准确性...',
        '正在优化报告结构...',
        '正在完善分析逻辑...',
        '正在补充关键信息...',
        '正在检查专业术语...'
      ],
      duration: 10000,  // 10秒
      progressStart: 70,
      progressEnd: 85
    },
    finalizing: {
      title: '完善报告',
      messages: [
        '正在格式化报告...',
        '正在生成图表...',
        '正在添加参考资料...',
        '正在优化排版...',
        '正在最终检查...'
      ],
      duration: 8000,  // 8秒
      progressStart: 85,
      progressEnd: 100
    },
    complete: {
      title: '报告完成',
      messages: ['报告已生成完毕'],
      duration: 0,
      progressStart: 100,
      progressEnd: 100
    }
  }), []);

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

  // 定义获取公司分析的函数
  const fetchCompanyAnalysis = useCallback(async () => {
    const fetchAnalysis = async () => {
      if (!companyName) return;
      
      setLoading(true);
      setError('');
      setGenerationStage('collecting');
      setProgress(0);
      
      try {
        // 设置模拟的进度更新
        startProgressSimulation();
        
        // 改为使用新的提交API，接收请求ID
        const submitResponse = await fetch('/api/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyName,
            industryName
          }),
        });
        
        if (!submitResponse.ok) {
          throw new Error(`请求失败, 状态码: ${submitResponse.status}`);
        }
        
        const submitData = await submitResponse.json();
        
        if (!submitData.success) {
          throw new Error(submitData.error || '分析请求提交失败');
        }

        // 获取请求ID
        const requestId = submitData.requestId;
        
        if (!requestId) {
          throw new Error('服务器没有返回有效的请求ID');
        }
        
        // 保存请求ID到引用
        requestIdRef.current = requestId;
        
        // 提示用户请求已提交，正在处理中
        toast.success('企业分析请求已提交，正在处理中', { 
          duration: 5000,
          icon: '🚀'
        });
        
        console.log(`分析请求已提交，请求ID: ${requestId}`);

        // 开始轮询检查结果
        await pollForResults(requestId);
        
      } catch (err) {
        console.error('获取分析失败:', err);
        setError(err instanceof Error ? err.message : '获取分析失败，请稍后重试');
        toast.error(`获取企业分析失败: ${err instanceof Error ? err.message : '未知错误'}`);
      } finally {
        // 确保进度模拟停止
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
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
      // 清除轮询定时器
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [companyName, industryName, toast, startProgressSimulation, stopProgressSimulation]);

  // 轮询检查结果状态
  const pollForResults = useCallback(async (requestId: string) => {
    // 清除已有的轮询
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    // 检查结果的函数
    const checkResult = async () => {
      try {
        // 检查是否已经有结果
        const statusResponse = await fetch(`/api/status?requestId=${requestId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!statusResponse.ok) {
          console.warn(`状态检查失败, 状态码: ${statusResponse.status}, 继续轮询...`);
          return;
        }
        
        const statusData = await statusResponse.json();
        
        if (!statusData.success) {
          console.warn(`状态检查返回错误: ${statusData.error}, 继续轮询...`);
          return;
        }
        
        // 检查状态
        if (statusData.status === 'completed' && statusData.result) {
          // 请求已完成，有结果
          console.log('✅ 分析已完成，获取到结果');
          
          // 停止轮询
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          
          // 停止进度模拟
          stopProgressSimulation();
          
          // 设置结果
          setResult(statusData.result);
          
          // 更新UI状态
          setProgress(100);
          setGenerationStage('complete');
          
          toast.success('企业分析完成！', {
            duration: 3000,
            icon: '✨'
          });
          
        } else if (statusData.status === 'failed') {
          // 请求失败
          console.error('❌ 分析失败:', statusData.error);
          
          // 停止轮询
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          
          // 停止进度模拟
          stopProgressSimulation();
          
          // 设置错误
          setError(statusData.error || '分析生成失败');
          
          toast.error(`分析失败: ${statusData.error || '未知错误'}`, {
            duration: 5000
          });
          
          setLoading(false);
        } else {
          // 仍在处理中，继续轮询
          console.log(`⏳ 分析仍在处理中，状态: ${statusData.status}`);
        }
        
      } catch (error) {
        console.error('轮询过程中发生错误:', error);
        // 不中断轮询，继续检查
      }
    };
    
    // 立即执行一次
    await checkResult();
    
    // 设置轮询间隔 (5秒)
    pollIntervalRef.current = setInterval(checkResult, 5000);
    
    // 设置最大轮询时间 (15分钟)
    setTimeout(() => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        
        // 如果到了这里还没有结果，显示超时
        if (loading && !result) {
          setError('分析请求超时，请稍后重试');
          toast.error('分析请求超时，请稍后重试');
          setLoading(false);
          stopProgressSimulation();
        }
      }
    }, 15 * 60 * 1000); // 15分钟
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [loading, result, toast, stopProgressSimulation]);

  // 初始化时获取公司分析
  useEffect(() => {
    if (isOpen && !result && !loading) {
      fetchCompanyAnalysis();
    }
  }, [isOpen, fetchCompanyAnalysis, result, loading]);

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      setResult(null);
      setError(null);
      setGenerationStage('collecting');
      setProgress(0);
      setStageMessage('');
      // 重置请求ID
      requestIdRef.current = '';
    }
  }, [isOpen]);
  
  // 添加调试代码
  useEffect(() => {
    if (result) {
      console.log('分析结果:', result);
      console.log('章节数量:', result.sections?.length || 0);
      console.log('章节标题:', result.sections?.map(s => s.title) || []);
    }
  }, [result]);
  
  // 处理进度条动画
  useEffect(() => {
    if (!loading || generationStage === 'complete') return;
    
    const currentStage = stages[generationStage];
    
    // 确保消息不会循环重复
    // 计算每条消息的显示时间，确保所有消息在阶段结束前都能显示
    const messageCount = currentStage.messages.length;
    const messageInterval = currentStage.duration / messageCount;
    
    // 更新消息 - 每条消息只显示一次
    let messageIndex = 0;
    const messageTimer = setInterval(() => {
      if (messageIndex < messageCount) {
        setStageMessage(currentStage.messages[messageIndex]);
        messageIndex++;
      } else {
        clearInterval(messageTimer);
      }
    }, messageInterval);
    
    // 更新进度 - 平滑过渡
    const progressRange = currentStage.progressEnd - currentStage.progressStart;
    const progressSteps = 100; // 将进度条分为100个小步骤，使动画更平滑
    const stepInterval = currentStage.duration / progressSteps;
    const progressIncrement = progressRange / progressSteps;
    
    let stepCount = 0;
    const progressTimer = setInterval(() => {
      if (stepCount < progressSteps) {
        const newProgress = currentStage.progressStart + (progressIncrement * stepCount);
        setProgress(Math.round(newProgress));
        stepCount++;
      } else {
        clearInterval(progressTimer);
        
        // 进入下一阶段
        const stagesList: ReportGenerationStage[] = ['collecting', 'analyzing', 'drafting', 'reviewing', 'finalizing', 'complete'];
        const currentIndex = stagesList.indexOf(generationStage);
        if (currentIndex < stagesList.length - 1) {
          setGenerationStage(stagesList[currentIndex + 1]);
        }
      }
    }, stepInterval);
    
    return () => {
      clearInterval(messageTimer);
      clearInterval(progressTimer);
    };
  }, [loading, generationStage, stages]);

  const downloadAsDocx = async () => {
    if (!result) return;
    
    setDownloadingDocx(true);
    
    try {
      // 创建文档对象
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // 添加标题
            new Paragraph({
              text: `${companyName} 公司研究报告`,
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER
            }),
            
            // 添加行业信息
            new Paragraph({
              text: `行业: ${industryName || '未指定'}`,
              alignment: AlignmentType.CENTER,
              spacing: {
                before: 120,
                after: 120
              }
            }),
            
            // 添加日期
            new Paragraph({
              text: `报告日期: ${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}`,
              alignment: AlignmentType.CENTER,
              spacing: {
                before: 120,
                after: 240
              }
            }),
            
            // 添加目录标题
            new Paragraph({
              text: "目录",
              heading: HeadingLevel.HEADING_1,
              spacing: {
                before: 240,
                after: 120
              }
            }),
            
            // 添加目录内容
            ...result.sections.map((section, index) => 
              new Paragraph({
                text: `${index + 1}. ${section.title}`,
                spacing: {
                  before: 80,
                  after: 80
                }
              })
            ),
            
            // 添加分页符
            new Paragraph({
              text: "",
              pageBreakBefore: true
            }),
            
            // 添加报告内容
            ...result.sections.flatMap((section, index) => {
              const cleanedContent = cleanMarkdownForDocx(section.content);
              const paragraphs = splitContentIntoParagraphs(cleanedContent);
              
              return [
                // 添加章节标题
                new Paragraph({
                  text: `${index + 1}. ${section.title.replace(/^\d+\.\s*/, '')}`,
                  heading: HeadingLevel.HEADING_1,
                  spacing: {
                    before: 240,
                    after: 120
                  }
                }),
                
                // 添加章节内容
                ...paragraphs
              ];
            })
          ]
        }]
      });
      
      // 生成并下载文档
      Packer.toBlob(doc).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${companyName}-公司研究报告.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('Word文档生成失败:', error);
      alert('Word文档生成失败，请稍后重试');
    } finally {
      setDownloadingDocx(false);
    }
  };
  
  // 增强Markdown清理函数，确保完全移除所有Markdown标记
  const cleanMarkdownForDocx = (markdown: string): string => {
    return markdown
      .replace(/\*\*(.*?)\*\*/g, '$1')  // 移除加粗标记
      .replace(/\*(.*?)\*/g, '$1')      // 移除斜体标记
      .replace(/~~(.*?)~~/g, '$1')      // 移除删除线标记
      .replace(/`(.*?)`/g, '$1')        // 移除行内代码标记
      .replace(/```[\s\S]*?```/g, '')   // 移除代码块
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // 移除链接，只保留文本
      .replace(/!\[(.*?)\]\((.*?)\)/g, '图片：$1') // 将图片替换为文本描述
      .replace(/#{1,6}\s+(.*?)$/gm, '$1') // 移除标题标记
      .replace(/^\s*[-*+]\s+/gm, '• ')  // 将无序列表项转换为简单的项目符号
      .replace(/^\s*\d+\.\s+/gm, '• ')  // 将有序列表项转换为简单的项目符号
      .replace(/\|/g, ' ')              // 移除表格分隔符
      .replace(/\n\s*\n/g, '\n\n')      // 保留段落间的空行
      .replace(/\n---+\n/g, '\n\n')     // 移除水平分隔线
      .replace(/&gt;/g, '')             // 移除引用符号
      .replace(/&lt;/g, '<')            // 转换HTML实体
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  };
  
  // 将内容分割为段落并转换为Word段落对象
  const splitContentIntoParagraphs = (content: string): Paragraph[] => {
    // 按空行分割段落
    const paragraphTexts = content.split(/\n\s*\n/).filter(p => p.trim() !== '');
    
    return paragraphTexts.map(text => {
      // 处理Markdown格式
      const cleanedText = text
        .replace(/\*\*(.*?)\*\*/g, '$1')  // 移除加粗标记
        .replace(/\*(.*?)\*/g, '$1')      // 移除斜体标记
        .replace(/`(.*?)`/g, '$1')        // 移除代码标记
        .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // 移除链接，只保留文本
        .trim();
      
      // 检查是否为表格行（简单检测）
      if (cleanedText.includes('|') && cleanedText.trim().startsWith('|')) {
        // 将表格行转换为普通文本
        return new Paragraph({
          text: cleanedText.replace(/\|/g, ' ').trim(),
          spacing: {
            before: 120,
            after: 120
          }
        });
      }
      
      // 检查是否为项目符号列表
      if (cleanedText.trim().startsWith('• ')) {
        return new Paragraph({
          text: cleanedText.trim(),
          bullet: {
            level: 0
          },
          spacing: {
            before: 120,
            after: 120
          }
        });
      }
      
      // 普通段落
      return new Paragraph({
        text: cleanedText,
        spacing: {
          before: 120,
          after: 120
        }
      });
    });
  };

  const generateHTMLReport = async () => {
    try {
      setGeneratingHTML(true);
      
      // 检查是否有分析结果
      if (!result || result.sections.length === 0) {
        toast.error('无法生成报告：分析结果为空');
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
          companyName,
          industryName,
          analysisResult: result
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
        
        toast.success(`已从${cacheType}缓存加载报告`, { 
          duration: 3000,
          icon: '📦'
        });
        console.log(`报告来自${cacheType}缓存，生成于: ${cacheDate}`);
      } else if (result.fallback) {
        // 如果使用了备选方案，通知用户
        toast.error('使用了模板生成报告（API生成失败）', {
          duration: 5000,
          icon: '⚠️'
        });
      } else {
        toast.success('报告生成成功！', {
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
          toast.error('无法打开新窗口，请检查您的浏览器是否阻止了弹出窗口');
        }
      } catch (error) {
        console.error('打开新窗口显示HTML失败:', error);
        toast.error('无法显示HTML报告，请检查浏览器设置');
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
        
        toast.success(`HTML报告已下载为: ${fileName}`, {
          duration: 4000,
          icon: '💾'
        });
      } catch (downloadError) {
        console.error('下载HTML文件失败:', downloadError);
        toast.error('无法下载HTML文件');
      }
      
    } catch (error) {
      console.error('生成HTML报告失败:', error);
      // 特别处理网络中断错误
      const errorMessage = error instanceof Error && 
                          error.message.includes('Premature close') ? 
                          '网络连接中断，请检查您的网络并重试' : 
                          `生成HTML报告失败: ${error instanceof Error ? error.message : '未知错误'}`;
      toast.error(errorMessage);
    } finally {
      setGeneratingHTML(false);
    }
  };

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
              {companyName} 企业画像
            </Dialog.Title>
            
            <div className="flex items-center space-x-4">
              {result && !loading && (
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
            ) : error ? (
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
                    setError(null);
                    fetchCompanyAnalysis();
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  重试
                </button>
              </div>
            ) : result ? (
              <div className="space-y-8">
                {/* 基础信息 */}
                {result.basic && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">基本信息</h2>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">成立时间</dt>
                        <dd className="mt-1 text-sm text-gray-900">{result.basic.basicInfo.established}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">总部位置</dt>
                        <dd className="mt-1 text-sm text-gray-900">{result.basic.basicInfo.headquarters}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">公司类型</dt>
                        <dd className="mt-1 text-sm text-gray-900">{result.basic.basicInfo.type}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">公司规模</dt>
                        <dd className="mt-1 text-sm text-gray-900">{result.basic.basicInfo.scale}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-sm font-medium text-gray-500">主营业务</dt>
                        <dd className="mt-1 text-sm text-gray-900">{result.basic.basicInfo.mainBusiness}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-sm font-medium text-gray-500">核心亮点</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          <ul className="list-disc pl-5 space-y-1">
                            {result.basic.keyHighlights.map((highlight, index) => (
                              <li key={index}>{highlight}</li>
                            ))}
                          </ul>
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}

                {/* Markdown报告 */}
                {result.markdown && (
                  <div className="prose max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]} 
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        // 添加自定义组件渲染
                        table: ({...props}) => (
                          <div className="overflow-x-auto my-6">
                            <table className="min-w-full divide-y divide-gray-300" {...props} />
                          </div>
                        ),
                        th: ({...props}) => (
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 bg-gray-50" {...props} />
                        ),
                        td: ({...props}) => (
                          <td className="px-3 py-4 text-sm text-gray-500" {...props} />
                        )
                      }}
                    >
                      {result.markdown}
                    </ReactMarkdown>
                  </div>
                )}

                {/* HTML报告 */}
                {result.html && (
                  <div 
                    className="mt-8"
                    dangerouslySetInnerHTML={{ __html: result.html }} 
                  />
                )}
              </div>
            ) : null}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 