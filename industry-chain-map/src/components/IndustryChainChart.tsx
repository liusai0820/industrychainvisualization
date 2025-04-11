'use client';

import { useRef, useState, useEffect, useCallback, useReducer } from 'react';
import { createPortal } from 'react-dom';
import { IndustryChainData, MainSection, SubSection, SubSubSection, Company } from '@/types';
import { calculateOptimalLayout, LayoutConfig } from '@/utils/layoutCalculator';
import html2canvas from 'html2canvas';
import CompanyReportModal from './CompanyReportModal';

interface IndustryChainChartProps {
    data: IndustryChainData;
    options?: {
        tooltip?: {
            show?: boolean;
        };
    };
}

type Html2CanvasOptions = Parameters<typeof html2canvas>[1];

// 移动端头部组件
const MobileHeader = ({ title, onBackClick }: { title: string; onBackClick: () => void }) => (
  <div className="sticky top-0 left-0 right-0 z-40 bg-white border-b">
    <div className="flex items-center h-12">
      <button
        onClick={onBackClick}
        className="h-12 w-12 flex items-center justify-center hover:bg-gray-50 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
        </svg>
      </button>
      <h1 className="text-base font-medium flex-1 truncate pr-4">{title}产业链图谱</h1>
    </div>
  </div>
);

// 全局单例模式处理模态框状态，避免组件重渲染导致的多次触发
type ModalState = {
  isOpen: boolean;
  companyName: string;
  industryName: string;
} | null;

// 使用单例存储模态框状态
const globalModalState = {
  current: null as ModalState,
  pendingUpdate: false, // 防止重复更新
  setModalState(state: ModalState) {
    // 如果当前有打开的模态框且试图打开另一个，忽略请求
    if (this.current?.isOpen && state?.isOpen) {
      console.log('已有模态框打开，忽略打开请求');
      return;
    }
    
    // 如果状态没有变化，忽略请求
    if (JSON.stringify(this.current) === JSON.stringify(state)) {
      return;
    }
    
    // 更新状态并通知监听器
    this.current = state;
    // 使用setTimeout确保React事件循环完成
    setTimeout(() => {
      globalModalListeners.forEach(listener => listener(state));
    }, 0);
  },
  getModalState() {
    return this.current;
  }
};

// 全局监听器，用于模态框组件外部通信
const globalModalListeners: ((state: ModalState) => void)[] = [];

// 简化的点击处理 - 我们过度优化了导致出问题
// 记录上次点击的公司名称和时间戳
let lastClickInfo = { companyName: '', timestamp: 0 };
const CLICK_COOLDOWN = 500; // 500ms冷却时间

// 全局点击处理函数，与React组件生命周期完全分离
const safeOpenCompanyModal = (companyName: string, industryName: string) => {
  const now = Date.now();
  
  // 如果是同一家公司且点击间隔小于冷却时间，则忽略
  if (lastClickInfo.companyName === companyName && 
      now - lastClickInfo.timestamp < CLICK_COOLDOWN) {
    console.log('点击冷却中，忽略重复点击:', companyName);
    return;
  }
  
  // 更新上次点击信息
  lastClickInfo = { companyName, timestamp: now };
  
  // 设置模态框状态 - 这会触发模态框打开
  globalModalState.setModalState({
    isOpen: true,
    companyName,
    industryName
  });
  
  console.log('触发企业分析:', companyName, industryName);
};

// 确保模态框在DOM准备好时才渲染的Portal组件
const ModalPortal = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  return mounted ? createPortal(children, document.body) : null;
};

// 解耦的模态框控制器组件
const CompanyModalController = () => {
  const [modalState, setModalState] = useState<ModalState>(null);
  
  useEffect(() => {
    // 订阅全局模态框状态变化
    const handleModalChange = (newState: ModalState) => {
      setModalState(newState);
    };
    
    // 添加监听器
    globalModalListeners.push(handleModalChange);
    
    // 初始化时检查全局状态
    const initialState = globalModalState.getModalState();
    if (initialState) {
      setModalState(initialState);
    }
    
    return () => {
      // 移除监听器
      const index = globalModalListeners.indexOf(handleModalChange);
      if (index !== -1) {
        globalModalListeners.splice(index, 1);
      }
    };
  }, []);
  
  // 处理模态框关闭
  const handleClose = useCallback(() => {
    globalModalState.setModalState(null);
  }, []);
  
  // 无模态框状态则不渲染
  if (!modalState || !modalState.isOpen) {
    return null;
  }
  
  // 使用Portal渲染模态框，避免被父组件重渲染影响
  return (
    <ModalPortal>
      <CompanyReportModal
        isOpen={true}
        onClose={handleClose}
        companyName={modalState.companyName}
        industryName={modalState.industryName}
      />
    </ModalPortal>
  );
};

// 移动端视图组件重构
const MobileView = ({ data }: { data: IndustryChainData }) => {
  const [expandedSections, setExpandedSections] = useState<number[]>([]);
  const [expandedSubSections, setExpandedSubSections] = useState<string[]>([]);
  
  const getBackgroundColor = (index: number) => {
    switch (index) {
      case 0: return 'bg-indigo-50';
      case 1: return 'bg-green-50';
      default: return 'bg-red-50';
    }
  };

  const getSubBackgroundColor = (index: number) => {
    switch (index) {
      case 0: return 'bg-indigo-50/50';
      case 1: return 'bg-green-50/50';
      default: return 'bg-red-50/50';
    }
  };

  const toggleSection = (index: number) => {
    setExpandedSections(prev => {
      const isExpanded = prev.includes(index);
      if (isExpanded) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const toggleSubSection = (sectionIndex: number, subIndex: number) => {
    const key = `${sectionIndex}-${subIndex}`;
    setExpandedSubSections(prev => {
      const isExpanded = prev.includes(key);
      if (isExpanded) {
        return prev.filter(k => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };
  
  // 使用原生DOM事件处理点击，而非React合成事件
  const handleCompanyClick = (e: React.MouseEvent, companyName: string) => {
    // 阻止事件冒泡
    e.stopPropagation();
    
    // 使用全局处理函数打开模态框
    safeOpenCompanyModal(companyName, data.name);
  };

  return (
    <div className="min-h-screen bg-white">
      <MobileHeader 
        title={data.name} 
        onBackClick={() => window.history.back()} 
      />
      <div className="pb-24">
        {data.children?.map((section, index) => (
          <div key={section.name} className="mb-4 px-4">
            <div 
              className={`p-3 rounded-lg font-medium ${getBackgroundColor(index)} cursor-pointer`}
              onClick={() => toggleSection(index)}
            >
              {section.name}
              <span className="float-right">{expandedSections.includes(index) ? '▼' : '▶'}</span>
            </div>
            
            {expandedSections.includes(index) && section.children?.map((subSection, subIndex) => (
              <div key={subSection.name} className="ml-4 mt-2">
                <div 
                  className={`p-2 rounded-md ${getSubBackgroundColor(index)} cursor-pointer`}
                  onClick={() => toggleSubSection(index, subIndex)}
                >
                  {subSection.name}
                  <span className="float-right">
                    {expandedSubSections.includes(`${index}-${subIndex}`) ? '▼' : '▶'}
                  </span>
                </div>
                
                {expandedSubSections.includes(`${index}-${subIndex}`) && (
                  <div className="grid grid-cols-1 gap-2 mt-2 ml-4">
                    {subSection.children?.map(subSubSection => (
                      <div key={subSubSection.name} className="bg-white rounded-md p-2 shadow-sm">
                        <div className="font-medium text-sm mb-1">{subSubSection.name}</div>
                        <div className="grid grid-cols-2 gap-1">
                          {subSubSection.children?.map(company => (
                            <div 
                              key={company.name}
                              className="text-xs p-1 bg-gray-50 rounded text-blue-600 truncate"
                              onClick={(e) => handleCompanyClick(e, company.name)}
                            >
                              {company.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// 防抖函数增强版，添加立即执行选项和拒绝期
const debounce = (fn: Function, ms = 300, options: { leading?: boolean, trailing?: boolean } = {}) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  let lastExecTime = 0;
  const { leading = false, trailing = true } = options;
  
  return function(this: any, ...args: any[]) {
    const now = Date.now();
    const shouldCallNow = leading && (now - lastExecTime > ms);
    
    clearTimeout(timeoutId);
    
    if (shouldCallNow) {
      lastExecTime = now;
      return fn.apply(this, args);
    }
    
    if (trailing) {
      timeoutId = setTimeout(() => {
        lastExecTime = Date.now();
        fn.apply(this, args);
      }, ms);
    }
  };
};

// 全局点击锁定状态
let isClickLocked = false;
const GLOBAL_CLICK_LOCK_DURATION = 1000; // 1秒全局锁定

// 全局点击锁定函数
const withClickLock = (fn: Function) => {
  return function(this: any, ...args: any[]) {
    if (isClickLocked) {
      console.log('全局点击锁定中，忽略点击');
      return;
    }
    
    isClickLocked = true;
    setTimeout(() => {
      isClickLocked = false;
    }, GLOBAL_CLICK_LOCK_DURATION);
    
    return fn.apply(this, args);
  };
};

export default function IndustryChainChart({ data, options = {} }: IndustryChainChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [error] = useState<string | null>(null);
    const [, setLayout] = useState<LayoutConfig[]>([]);
    const [isMobile, setIsMobile] = useState(false);
    
    // 检测设备尺寸
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // 计算最佳布局
    useEffect(() => {
        if (data.children) {
            const optimalLayout = calculateOptimalLayout(data.children);
            setLayout(optimalLayout);
        }
    }, [data]);

    const downloadChart = async () => {
        try {
            // 获取容器元素
            if (!containerRef.current) return;

            // 保存原始样式
            const container = containerRef.current;
            const originalWidth = container.style.width;
            const originalHeight = container.style.height;
            const originalPosition = container.style.position;
            const originalTransform = container.style.transform;
            const originalClasses = container.className;
            
            // 临时调整容器样式以确保正确渲染
            container.style.width = `${container.offsetWidth}px`;
            container.style.height = `${container.offsetHeight}px`;
            container.style.position = 'relative';
            container.style.transform = 'none';
            container.style.margin = '0';
            container.style.padding = '0';
            
            // 创建临时包装容器以确保完整捕获
            const wrapper = document.createElement('div');
            wrapper.style.position = 'fixed';
            wrapper.style.top = '0';
            wrapper.style.left = '0';
            wrapper.style.width = `${container.offsetWidth}px`;
            wrapper.style.height = `${container.offsetHeight}px`;
            wrapper.style.backgroundColor = '#ffffff';
            wrapper.style.zIndex = '9999';
            wrapper.style.overflow = 'hidden';
            
            // 克隆并添加到临时容器
            const clone = container.cloneNode(true) as HTMLElement;
            wrapper.appendChild(clone);
            document.body.appendChild(wrapper);
            
            // 等待样式应用和重排完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const canvas = await html2canvas(wrapper, {
                backgroundColor: '#ffffff',
                useCORS: true,
                logging: false,
                scale: 2,
                allowTaint: true,
                foreignObjectRendering: true,
                width: wrapper.offsetWidth,
                height: wrapper.offsetHeight,
                x: 0,
                y: 0
            } as Html2CanvasOptions);

            // 清理临时元素
            document.body.removeChild(wrapper);

            // 恢复原始样式
            container.style.width = originalWidth;
            container.style.height = originalHeight;
            container.style.position = originalPosition;
            container.style.transform = originalTransform;
            container.style.margin = '';
            container.style.padding = '';
            container.className = originalClasses;

            // 创建下载链接
            const dataUrl = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `${data.name}产业链全景图谱.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('下载图谱失败:', error);
            alert('下载图谱失败，请稍后重试');
        }
    };

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        刷新页面
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <style jsx global>{`
                /* 移动端样式 */
                @media (max-width: 768px) {
                    html {
                        font-size: 14px;
                    }
                    
                    .mobile-section {
                        margin-bottom: 0.75rem;
                    }
                    
                    .mobile-company {
                        padding: 0.5rem 0.75rem;
                        font-size: 0.8125rem;
                    }

                    /* 隐藏默认的返回导航 */
                    nav[class*="back"],
                    nav[class*="nav"],
                    nav {
                        display: none !important;
                    }
                }
                
                /* 原有的导航样式，仅在非移动端显示 */
                @media (min-width: 769px) {
                    nav[class*="back"],
                    nav[class*="nav"],
                    nav {
                        all: unset !important;
                        position: fixed !important;
                        top: 12px !important;
                        left: 12px !important;
                        height: 40px !important;
                        width: auto !important;
                        display: flex !important;
                        align-items: center !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: transparent !important;
                        z-index: 100 !important;
                    }

                    nav > a,
                    nav[class*="back"] > a,
                    nav[class*="nav"] > a {
                        all: unset !important;
                        display: inline-flex !important;
                        align-items: center !important;
                        height: 36px !important;
                        padding: 0 16px !important;
                        background: #f8fafc !important;
                        border: 1px solid #e2e8f0 !important;
                        border-radius: 6px !important;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                        font-size: 13px !important;
                        font-weight: 500 !important;
                        letter-spacing: -0.01em !important;
                        color: #64748b !important;
                        cursor: pointer !important;
                        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
                        white-space: nowrap !important;
                    }

                    nav > a:hover,
                    nav[class*="back"] > a:hover,
                    nav[class*="nav"] > a:hover {
                        background: #f1f5f9 !important;
                        border-color: #cbd5e1 !important;
                        color: #334155 !important;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05) !important;
                    }

                    nav > a::before,
                    nav[class*="back"] > a::before,
                    nav[class*="nav"] > a::before {
                        content: "←" !important;
                        margin-right: 8px !important;
                        font-size: 15px !important;
                        position: relative !important;
                        top: 0px !important;
                    }
                }
            `}</style>

            {isMobile ? (
                <>
                    <MobileHeader 
                        title={data.name + "产业链图谱"} 
                        onBackClick={() => {
                            if (typeof window !== 'undefined') {
                                if (window.history.length > 1) {
                                    window.history.back();
                                } else {
                                    window.location.href = '/';
                                }
                            }
                        }} 
                    />
                    <MobileView data={data} />
                </>
            ) : (
                <div className="min-h-screen bg-white pt-16">
                    <div 
                        ref={containerRef} 
                        className="w-full h-full min-h-screen"
                    >
                        {/* 标题区域 */}
                        <div className="border-b bg-white">
                            <h1 className="text-2xl font-bold text-center py-4 px-4">
                                <span
                                    onClick={downloadChart}
                                    className="inline-block cursor-pointer text-gray-900 hover:text-blue-600 transition-colors duration-200"
                                >
                                    {data.name}产业链全景图谱
                                </span>
                            </h1>
                        </div>

                        {/* 主要内容区域 */}
                        <div className="flex flex-col lg:flex-row gap-6 p-6 w-full">
                            {data.children?.map((section, index) => (
                                <MainSectionCard
                                    key={section.name}
                                    section={section}
                                    index={index}
                                    className={`${
                                        index === 0 ? 'bg-indigo-50' :
                                        index === 1 ? 'bg-green-50' :
                                        'bg-red-50'
                                    }`}
                                    options={options}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 使用分离的模态框控制器组件 */}
            <CompanyModalController />
        </>
    );
}

interface MainSectionCardProps {
    section: MainSection;
    index: number;
    className?: string;
    options?: IndustryChainChartProps['options'];
}

function MainSectionCard({ section, index, className = '', options }: MainSectionCardProps) {
    const borderColor = index === 0 ? 'border-indigo-200' :
                       index === 1 ? 'border-green-200' :
                       'border-red-200';

    // 简化宽度计算
    const style = {
        width: '33.33%',
        minWidth: 0,
        maxWidth: '100%'
    };
    
    return (
        <section 
            className={`rounded-lg border ${borderColor} ${className} overflow-hidden min-w-0`}
            style={style}
        >
            <h2 className="text-base font-bold p-2 text-center border-b ${borderColor} truncate">
                {section.name}
            </h2>
            <div className="p-2 space-y-2 w-full min-w-0">
                {section.children?.map(subSection => (
                    <SubSectionCard 
                        key={subSection.name}
                        subSection={subSection} 
                        index={index}
                        options={options}
                    />
                ))}
            </div>
        </section>
    );
}

interface SubSectionCardProps {
    subSection: SubSection;
    index: number;
    options?: IndustryChainChartProps['options'];
}

function SubSectionCard({ subSection, index, options }: SubSectionCardProps) {
    const borderColor = index === 0 ? 'border-indigo-200' :
                       index === 1 ? 'border-green-200' :
                       'border-red-200';
    
    const bgColor = index === 0 ? 'bg-white hover:bg-indigo-50' :
                   index === 1 ? 'bg-white hover:bg-green-50' :
                   'bg-white hover:bg-red-50';

    // 简化布局策略
    const subSections = subSection.children || [];
    const isCompact = subSections.length <= 3 && subSections.every(sub => 
        (sub.children?.length || 0) <= 3);

    const layoutClass = isCompact ? 'grid grid-cols-3 gap-2' : 'flex flex-wrap gap-2';
    
    return (
        <div className={`rounded-lg border ${borderColor} ${bgColor} transition-colors w-full min-w-0`}>
            <h3 className="text-sm font-semibold p-2 border-b ${borderColor} truncate">
                {subSection.name}
            </h3>
            <div className={`p-2 ${layoutClass} w-full min-w-0`}>
                {subSections.map((subSubSection) => (
                    <SubSubSectionCard 
                        key={subSubSection.name}
                        subSubSection={subSubSection} 
                        isCompact={isCompact}
                        options={options}
                    />
                ))}
            </div>
        </div>
    );
}

interface SubSubSectionCardProps {
    subSubSection: SubSubSection;
    isCompact: boolean;
    options?: IndustryChainChartProps['options'];
}

function SubSubSectionCard({ subSubSection, isCompact, options }: SubSubSectionCardProps) {
    const companiesCount = subSubSection.children?.length || 0;
    
    // 简化卡片样式
    const cardStyle = {
        minWidth: isCompact ? '30%' : '200px',
        flex: isCompact ? '1 1 30%' : '1 1 200px'
    };

    // 简化网格列数计算
    const gridCols = companiesCount <= 2 ? 'grid-cols-1' : 'grid-cols-2';

    return (
        <div 
            className="rounded border border-gray-100 bg-white/50 flex flex-col p-2 min-w-0"
            style={cardStyle}
        >
            <h4 className="text-xs font-medium mb-2 whitespace-normal break-words">
                {subSubSection.name}
            </h4>
            <div className={`grid ${gridCols} gap-2 h-auto`}>
                {subSubSection.children?.map(company => (
                    <CompanyItem 
                        key={company.name} 
                        company={company}
                        isSingle={companiesCount === 1}
                        options={options}
                    />
                ))}
            </div>
        </div>
    );
}

interface CompanyItemProps {
    company: Company;
    isSingle?: boolean;
    options?: IndustryChainChartProps['options'];
}

function CompanyItem({ company, isSingle = false, options }: Omit<CompanyItemProps, 'onCompanyClick'>) {
    const showTooltip = options?.tooltip?.show ?? true;
    
    // 简化点击处理函数
    const handleItemClick = (e: React.MouseEvent) => {
        // 阻止冒泡
        e.stopPropagation();
        
        // 获取当前显示的产业链图谱名称
        const chartName = window.location.pathname.split('/').pop() || '';
        
        // 使用全局处理函数
        safeOpenCompanyModal(company.name, chartName);
    };
    
    return (
        <div 
            onClick={handleItemClick}
            className={`text-[11px] text-gray-600 relative h-7 flex items-center
                     transition-colors duration-200 hover:text-blue-600 group
                     ${isSingle ? 'text-center justify-center font-medium' : ''} 
                     px-1 min-w-0 cursor-pointer hover:bg-blue-50 rounded`}
        >
            <span className="block leading-none whitespace-normal break-words">{company.name}</span>
            {showTooltip && (
                <span className="absolute left-0 top-full mt-1 bg-white shadow-lg px-2 py-1 rounded 
                             invisible group-hover:visible z-10 whitespace-nowrap">
                    {company.name}
                </span>
            )}
        </div>
    );
}