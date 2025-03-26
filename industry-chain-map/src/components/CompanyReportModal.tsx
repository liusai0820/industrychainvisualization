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

interface AnalysisResult {
  rawMarkdown: string;
  sections: AnalysisSection[];
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
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [generatingHTML, setGeneratingHTML] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef<string>('');
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
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
        
        const response = await fetch('/api/company-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyName,
            industryName
          }),
        });
        
        if (!response.ok) {
          throw new Error(`请求失败, 状态码: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || '分析生成失败');
        }

        // 检查是否从缓存获取
        if (data.fromCache) {
          toast.success('已从缓存加载分析结果', { 
            duration: 3000,
            icon: '📦'
          });
          console.log(`分析结果来自缓存`);
          
          // 立即设置进度为100%并完成
          setProgress(100);
          setGenerationStage('complete');
          stopProgressSimulation();
        }
        
        setAnalysisResult(data.data);
        
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
    };
  }, [companyName, industryName, toast, startProgressSimulation, stopProgressSimulation]);

  // 初始化时获取公司分析
  useEffect(() => {
    if (isOpen && !analysisResult && !loading) {
      fetchCompanyAnalysis();
    }
  }, [isOpen, fetchCompanyAnalysis, analysisResult, loading]);

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      setAnalysisResult(null);
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
    if (analysisResult) {
      console.log('分析结果:', analysisResult);
      console.log('章节数量:', analysisResult.sections?.length || 0);
      console.log('章节标题:', analysisResult.sections?.map(s => s.title) || []);
    }
  }, [analysisResult]);
  
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
    if (!analysisResult) return;
    
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
            ...analysisResult.sections.map((section, index) => 
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
            ...analysisResult.sections.flatMap((section, index) => {
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
      if (!analysisResult || analysisResult.sections.length === 0) {
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
              {analysisResult && !loading && (
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
            ) : analysisResult ? (
              <div ref={reportRef} className="report-container">
                {/* 报告头部 */}
                <div className="report-header mb-12 text-center">
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    {companyName} 公司研究报告
                  </h1>
                  <p className="text-gray-500">
                    报告生成日期: {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                
                {/* 目录 */}
                <div className="report-toc mb-12 bg-gray-50 p-6 rounded-lg max-w-3xl mx-auto">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">目录</h2>
                  {analysisResult?.sections && analysisResult.sections.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ul className="space-y-2">
                        {analysisResult.sections.slice(0, Math.ceil(analysisResult.sections.length / 2)).map((section, index) => (
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
                        {analysisResult.sections.slice(Math.ceil(analysisResult.sections.length / 2)).map((section, index) => (
                          <li key={index + Math.ceil(analysisResult.sections.length / 2)} className="flex items-center">
                            <span className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-full mr-2 text-sm font-bold">
                              {index + 1 + Math.ceil(analysisResult.sections.length / 2)}
                            </span>
                            <a 
                              href={`#section-${index + Math.ceil(analysisResult.sections.length / 2)}`} 
                              className="text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                              {section.title.replace(/^\d+\.\s*/, '')}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                {/* 报告内容 */}
                <div className="report-content mx-8 mb-12 font-kai">
                  {analysisResult?.sections?.map((section, index) => (
                    <div key={index} id={`section-${index}`} className="mb-12">
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
                            {section.content.replace(/^\d+\.\s*/, '')}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 