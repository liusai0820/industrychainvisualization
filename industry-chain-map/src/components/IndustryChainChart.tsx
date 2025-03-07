'use client';

import { useRef, useState, useEffect } from 'react';
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

export default function IndustryChainChart({ data, options = {} }: IndustryChainChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [error] = useState<string | null>(null);
    const [, setLayout] = useState<LayoutConfig[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<{name: string, industryName: string} | null>(null);

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
                /* 强制覆盖 Next.js 导航按钮样式 */
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
            `}</style>
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
                                onCompanyClick={(companyName) => setSelectedCompany({
                                    name: companyName,
                                    industryName: data.name
                                })}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* 企业画像报告模态框 */}
            {selectedCompany && (
                <CompanyReportModal
                    isOpen={!!selectedCompany}
                    onClose={() => setSelectedCompany(null)}
                    companyName={selectedCompany.name}
                    industryName={selectedCompany.industryName}
                />
            )}
        </>
    );
}

interface MainSectionCardProps {
    section: MainSection;
    index: number;
    className?: string;
    options?: IndustryChainChartProps['options'];
    onCompanyClick: (companyName: string) => void;
}

function MainSectionCard({ section, index, className = '', options, onCompanyClick }: Omit<MainSectionCardProps, 'industryName'>) {
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
                        onCompanyClick={onCompanyClick}
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
    onCompanyClick: (companyName: string) => void;
}

function SubSectionCard({ subSection, index, options, onCompanyClick }: Omit<SubSectionCardProps, 'industryName'>) {
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
                        onCompanyClick={onCompanyClick}
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
    onCompanyClick: (companyName: string) => void;
}

function SubSubSectionCard({ subSubSection, isCompact, options, onCompanyClick }: Omit<SubSubSectionCardProps, 'industryName'>) {
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
                        onCompanyClick={onCompanyClick}
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
    onCompanyClick: (companyName: string) => void;
}

function CompanyItem({ company, isSingle = false, options, onCompanyClick }: Pick<CompanyItemProps, 'company' | 'isSingle' | 'options' | 'onCompanyClick'>) {
    const showTooltip = options?.tooltip?.show ?? true;
    
    return (
        <div 
            onClick={() => onCompanyClick(company.name)}
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