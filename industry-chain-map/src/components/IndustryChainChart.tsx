'use client';

import { useRef, useState } from 'react';
import { IndustryChainData, MainSection, SubSection, SubSubSection, Company } from '@/types';

interface IndustryChainChartProps {
    data: IndustryChainData;
}

export default function IndustryChainChart({ data }: IndustryChainChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [error] = useState<string | null>(null);

    const downloadChart = async () => {
        try {
            // 动态导入 html2canvas
            const html2canvas = (await import('html2canvas')).default;
            
            // 获取容器元素
            if (!containerRef.current) return;

            // 临时移除阴影
            const container = containerRef.current;
            container.classList.remove('shadow-lg');
            
            // 重置滚动位置
            window.scrollTo(0, 0);
            
            // 等待渲染完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const canvas = await html2canvas(container, {
                background: '#ffffff',
                useCORS: true,
                logging: false
            });

            // 恢复阴影
            container.classList.add('shadow-lg');

            const dataUrl = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `${data.name}产业链全景图谱.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
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
        <div className="min-h-screen bg-gray-50 p-8 flex justify-center items-start">
            {/* 内容容器 */}
            <div ref={containerRef} className="bg-white rounded-xl shadow-lg overflow-hidden inline-block">
                {/* 标题 */}
                <h1 
                    onClick={downloadChart}
                    className="text-2xl font-bold text-center py-4 px-4 text-gray-900 cursor-pointer 
                             hover:text-blue-600 transition-colors duration-200"
                >
                    {data.name}产业链全景图谱
                </h1>

                {/* 主要内容区域 */}
                <div className="flex flex-col lg:flex-row gap-6 p-6">
                    {data.children?.map((section, index) => (
                        <MainSectionCard
                            key={section.name}
                            section={section}
                            index={index}
                            className={`flex-1 min-w-0 ${
                                index === 0 ? 'bg-indigo-50' :
                                index === 1 ? 'bg-green-50' :
                                'bg-red-50'
                            }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

interface MainSectionCardProps {
    section: MainSection;
    index: number;
    className?: string;
}

function MainSectionCard({ section, index, className = '' }: MainSectionCardProps) {
    const borderColor = index === 0 ? 'border-indigo-200' :
                       index === 1 ? 'border-green-200' :
                       'border-red-200';

    return (
        <section className={`rounded-lg border ${borderColor} ${className}`}>
            <h2 className="text-base font-bold p-2 text-center border-b ${borderColor}">
                {section.name}
            </h2>
            <div className="p-3 space-y-3">
                {section.children?.map(subSection => (
                    <SubSectionCard
                        key={subSection.name}
                        subSection={subSection}
                        index={index}
                    />
                ))}
            </div>
        </section>
    );
}

interface SubSectionCardProps {
    subSection: SubSection;
    index: number;
}

function SubSectionCard({ subSection, index }: SubSectionCardProps) {
    const borderColor = index === 0 ? 'border-indigo-200' :
                       index === 1 ? 'border-green-200' :
                       'border-red-200';
    
    const bgColor = index === 0 ? 'bg-white hover:bg-indigo-50' :
                   index === 1 ? 'bg-white hover:bg-green-50' :
                   'bg-white hover:bg-red-50';

    return (
        <div className={`rounded-lg border ${borderColor} ${bgColor} transition-colors`}>
            <h3 className="text-sm font-semibold p-2 border-b ${borderColor}">
                {subSection.name}
            </h3>
            <div className="p-3">
                {subSection.children?.map(subSubSection => (
                    <SubSubSectionCard
                        key={subSubSection.name}
                        subSubSection={subSubSection}
                    />
                ))}
            </div>
        </div>
    );
}

interface SubSubSectionCardProps {
    subSubSection: SubSubSection;
}

function SubSubSectionCard({ subSubSection }: SubSubSectionCardProps) {
    return (
        <div className="mb-4 last:mb-0">
            <h4 className="text-xs font-medium mb-1.5">
                {subSubSection.name}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-3">
                {subSubSection.children?.map(company => (
                    <CompanyItem key={company.name} company={company} />
                ))}
            </div>
        </div>
    );
}

interface CompanyItemProps {
    company: Company;
}

function CompanyItem({ company }: CompanyItemProps) {
    return (
        <div className="text-[11px] text-gray-600 truncate" title={company.name}>
            {company.name}
        </div>
    );
}