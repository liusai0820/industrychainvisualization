'use client';

import { useRef, useState, useEffect, useCallback, useReducer } from 'react';
import { createPortal } from 'react-dom';
import { IndustryChainData, MainSection, SubSection, SubSubSection, Company } from '@/types';
import { calculateOptimalLayout, LayoutConfig } from '@/utils/layoutCalculator';
import html2canvas from 'html2canvas';
import CompanyReportModal from './CompanyReportModal';

// Simple Download Icon SVG component
const DownloadIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className}
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 20 20" 
    fill="currentColor"
    aria-hidden="true"
  >
    <path 
      fillRule="evenodd"
      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" 
      clipRule="evenodd" 
    />
  </svg>
);

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
      <h1 className="text-base font-medium flex-1 truncate pr-4">{title}</h1>
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
                scale: 3,
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

                    /* Enhanced: Hide default nav more broadly on mobile */
                    body > nav,
                    nav[class*="back"],
                    nav[class*="nav"],
                    header nav,
                    div > nav,
                    nav {
                        display: none !important;
                    }
                }
                
                /* Enhanced: More modern and less intrusive nav style for desktop */
                @media (min-width: 769px) {
                    nav[class*="back"],
                    nav[class*="nav"],
                    nav { /* Apply to any nav, assuming it's for back/global navigation */
                        all: unset !important; /* Reset all styles first */
                        position: fixed !important;
                        top: 16px !important; /* Adjusted top position */
                        left: 16px !important; /* Adjusted left position */
                        display: flex !important;
                        align-items: center !important;
                        z-index: 1000 !important; /* Ensure it's above most content */
                        padding: 0 !important; 
                        margin: 0 !important;
                        background: transparent !important;
                    }

                    nav > a,
                    nav[class*="back"] > a,
                    nav[class*="nav"] > a {
                        all: unset !important;
                        display: inline-flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        height: 36px !important; /* Slightly smaller */
                        min-width: 36px !important;
                        padding: 0 12px !important; /* Adjusted padding */
                        background-color: rgba(255, 255, 255, 0.9) !important; /* Semi-transparent white */
                        border: 1px solid #e5e7eb !important; /* Light gray border */
                        border-radius: 18px !important; /* More rounded */
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                        font-size: 13px !important;
                        font-weight: 500 !important;
                        color: #4b5563 !important; /* Darker gray text */
                        cursor: pointer !important;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08) !important; /* Softer shadow */
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
                        text-decoration: none !important;
                        white-space: nowrap !important;
                    }

                    nav > a:hover,
                    nav[class*="back"] > a:hover,
                    nav[class*="nav"] > a:hover {
                        background-color: #f9fafb !important; /* Lighter hover */
                        border-color: #d1d5db !important;
                        color: #1f2937 !important; /* Darker text on hover */
                        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1) !important;
                    }

                    /* Optional: Style for a common back arrow, adjust if your icon is different */
                    nav > a::before,
                    nav[class*="back"] > a::before,
                    nav[class*="nav"] > a::before {
                        content: "←" !important;
                        margin-right: 6px !important; /* Space between arrow and text (if any) */
                        font-size: 16px !important;
                        line-height: 1 !important;
                    }
                    /* If the link ONLY contains an icon, you might want to remove ::before or adjust padding */
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
                <div className="min-h-screen bg-gray-100 pt-16"> {/* Overall page background */}
                    <div 
                        ref={containerRef} 
                        className="w-full h-full min-h-screen"
                    >
                        {/* 标题区域 */}
                        <div className="border-b bg-white sticky top-0 z-30 shadow-sm">
                            <h1 className="text-2xl lg:text-3xl font-bold text-center py-4 md:py-5 px-4 text-blue-700 group cursor-pointer" onClick={downloadChart}>
                                <span > {/* Removed onClick from here, moved to H1 */}
                                    {data.name}产业链全景图谱
                                </span>
                                <span className="text-sm text-gray-500 ml-2 font-normal group-hover:text-gray-700 transition-colors align-middle">
                                    (点击下载 <DownloadIcon className="inline h-4 w-4 relative -top-px" />)
                                </span>
                            </h1>
                        </div>

                        {/* 主环节垂直堆叠 */}
                        <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-6 lg:space-y-8 max-w-full mx-auto"> 
                            {data.children?.map((section, index) => (
                                <NewDesktopMainSection
                                    key={section.name}
                                    section={section}
                                    index={index} 
                                    options={options}
                                    chartName={data.name} 
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

// --- 完全重构的桌面端组件 --- 

interface NewDesktopMainSectionProps {
    section: MainSection;
    index: number; 
    options?: IndustryChainChartProps['options'];
    chartName: string;
}

// 1. 主环节块 (上游/中游/下游)
function NewDesktopMainSection({ section, index, options, chartName }: NewDesktopMainSectionProps) {
    const baseColorIndex = index % 3;
    
    const mainTitleBgClass = 
        baseColorIndex === 0 ? 'bg-blue-500' :  
        baseColorIndex === 1 ? 'bg-teal-500' : 
        'bg-slate-500';    // Explicitly changed: Downstream from red-700 to slate-500
    
    const mainTitleTextClass = 'text-white'; 
    
    const mainBorderClass = 
        baseColorIndex === 0 ? 'border-blue-500' :  
        baseColorIndex === 1 ? 'border-teal-500' : 
        'border-slate-500';    // Explicitly changed: Downstream from red-700 to slate-500

    const N = section.children?.length || 0;
    let numColsLg = 1;
    if (N === 2) {
        numColsLg = 2;
    } else if (N === 3) {
        numColsLg = 3; 
    } else if (N === 4) {
        numColsLg = 4;
    } else if (N === 5) {
        numColsLg = 5; 
    } else if (N === 6) {
        numColsLg = 3; 
    } else if (N === 7) {
        numColsLg = 4; 
    } else if (N >= 8) {
        const is4ColOrphan = (N % 4 === 1);
        const is3ColOrphan = (N % 3 === 1);
        if (!is4ColOrphan) {
            numColsLg = 4;
        } else if (!is3ColOrphan) {
            numColsLg = 3;
        } else {
            numColsLg = 4; 
        }
    }
    const gridColsLgClass = N > 1 ? `lg:grid-cols-${numColsLg}` : ''; 

    let subSectionContainerClasses = 'p-3 md:p-4 bg-white items-stretch'; 
    if (N === 1) {
        subSectionContainerClasses += ' flex justify-center'; 
    } else if (N > 1) {
        subSectionContainerClasses += ` grid grid-cols-1 sm:grid-cols-2 ${gridColsLgClass} gap-x-3 md:gap-x-4 gap-y-3 md:gap-y-4`; // Ensure y-gap too
    } else {
        subSectionContainerClasses += ' min-h-[50px]'; 
    }

    return (
        <section className={`rounded-lg border ${mainBorderClass} shadow-lg overflow-hidden bg-white`}>
            <h2 className={`text-lg md:text-xl font-semibold px-4 py-3 md:px-6 md:py-3 ${mainTitleBgClass} ${mainTitleTextClass} text-left`}>
                {section.name}
            </h2>
            {/* Sub-section columns will sit on this main white background */}
            <div className={subSectionContainerClasses}>
                {section.children?.map((subSection, subIndex) => (
                    <NewDesktopSubSectionColumn 
                        key={subSection.name}
                        subSection={subSection} 
                        baseColorIndex={baseColorIndex}
                        options={options}
                        chartName={chartName}
                        isSingleWithinParent={N === 1} // Pass new prop
                    />
                ))}
            </div>
        </section>
    );
}

interface NewDesktopSubSectionColumnProps {
    subSection: SubSection;
    baseColorIndex: number;
    options?: IndustryChainChartProps['options'];
    chartName: string;
    isSingleWithinParent?: boolean; // New optional prop
}

// 2. 子环节列 (如"显示面板"列)
function NewDesktopSubSectionColumn({ subSection, baseColorIndex, options, chartName, isSingleWithinParent = false }: NewDesktopSubSectionColumnProps) {
    const titleBgClass = 
        baseColorIndex === 0 ? 'bg-blue-500 text-white' :  
        baseColorIndex === 1 ? 'bg-teal-500 text-white' : 
        'bg-slate-500 text-white';    // Explicitly changed: Downstream from red-700 to slate-500
    
    // SubSectionColumn itself will NOT have a visible border or distinct background now.
    // It acts as a container for SubSubSectionEntries on the main white panel.
    // const columnBorderClass = ... removed ...

    const subSubEntryCount = subSection.children?.length || 0;
    const multiColumnThreshold = 5; 
    const subSubEntryContainerClasses = [
        'p-1 md:p-1.5', // Reduced padding for a tighter look within the column
        'flex-grow',
        subSubEntryCount > multiColumnThreshold ? 'md:columns-2 md:gap-x-3' : 'space-y-1' // Tighter gap for multi-col and space-y
    ].join(' ');

    let columnWidthSpecificClasses = '';
    if (isSingleWithinParent) { 
        columnWidthSpecificClasses = 'w-full md:max-w-md lg:max-w-lg'; 
    } else { 
        // When in a grid, it should take the grid cell's width.
        // Adding w-full ensures it tries to fill its cell.
        columnWidthSpecificClasses = 'w-full'; 
    }

    return (
        // Removed border, shadow, and explicit bg-white from this div.
        // It sits on the parent NewDesktopMainSection's white content area.
        <div className={`flex flex-col min-h-[100px] ${columnWidthSpecificClasses}`}> 
            <h3 className={`text-sm font-medium p-2 ${titleBgClass} text-center rounded-t-md`}>
                {subSection.name}
            </h3>
            {/* SubSubSectionEntries are on a white background inherited from parent */}
            <div className={subSubEntryContainerClasses}>
                {(subSection.children && subSection.children.length > 0) ? (
                    subSection.children.map(subSubSection => (
                        <NewDesktopSubSubSectionEntry
                            key={subSubSection.name}
                            subSubSection={subSubSection}
                            options={options}
                            chartName={chartName}
                            // baseColorIndex is not strictly needed here if sub-sub is always neutral
                        />
                    ))
                ) : (
                    <p className="text-xs text-gray-400 p-2 text-center italic">暂无具体条目</p>
                )}
            </div>
        </div>
    );
}

interface NewDesktopSubSubSectionEntryProps { 
    subSubSection: SubSubSection;
    options?: IndustryChainChartProps['options'];
    chartName: string;
}

// 3. 子子环节条目 (如"LCD面板" + 公司)
function NewDesktopSubSubSectionEntry({ subSubSection, options, chartName }: NewDesktopSubSubSectionEntryProps) {
    const companiesCount = subSubSection.children?.length || 0;

    return (
        <div className="pb-1 mb-1 border-b border-gray-200 last:border-b-0 last:mb-0 last:pb-0 break-inside-avoid">
            <h4 className="text-xs font-semibold text-gray-700 mb-0.5 flex items-center">
                <span className="inline-block w-1.5 h-1.5 bg-gray-600 rounded-full mr-1.5"></span> {/* Darker dot */}
                {subSubSection.name}
            </h4>
            {companiesCount > 0 ? (
                <div className="pl-3 flex flex-wrap gap-x-1.5 gap-y-0.5"> {/* Companies flow horizontally */}
                    {subSubSection.children?.map(company => (
                        <CompanyItem 
                            key={company.name} 
                            company={company}
                            options={options}
                            chartName={chartName}
                            isSmall={true} // Add a prop to make company item even more compact
                        />
                    ))}
                </div>
            ) : (
                <p className="pl-3 text-[10px] text-gray-400 italic">无代表公司</p>
            )}
        </div>
    );
}

interface CompanyItemProps {
    company: Company;
    isSingle?: boolean; 
    options?: IndustryChainChartProps['options'];
    chartName: string; 
    isSmall?: boolean; // New prop for compact version
}

function CompanyItem({ company, isSingle = false, options, chartName, isSmall = false }: CompanyItemProps) {
    const showTooltip = options?.tooltip?.show ?? true;
    
    const handleItemClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        safeOpenCompanyModal(company.name, chartName);
    };
    
    const textSizeClass = isSmall ? 'text-[10px]' : 'text-[11px]';
    const paddingClass = isSmall ? 'px-1 py-0.5' : 'px-1.5 py-1';

    return (
        <div 
            onClick={handleItemClick}
            className={`${textSizeClass} text-gray-600 hover:text-blue-700 relative flex items-center
                     transition-colors duration-150 group
                     ${isSingle ? 'text-center justify-center font-medium' : ''} 
                     ${paddingClass} min-w-0 cursor-pointer hover:bg-blue-50 rounded whitespace-nowrap`}
             title={company.name} 
        >
            {/* Tooltip visible on hover - keeping existing advanced tooltip */}
            {/* For extremely compact, could simplify to just rely on native title, but current tooltip is better if space allows hover */}
            <span className="block leading-tight truncate">{company.name}</span> {/* Ensure truncate works */}
            {showTooltip && !isSmall && ( // Maybe hide custom tooltip for very small items if it becomes too noisy
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 bg-gray-700 text-white text-xs shadow-md px-1.5 py-0.5 rounded 
                             invisible group-hover:visible z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    {company.name}
                </span>
            )}
        </div>
    );
}