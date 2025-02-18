'use client';

import { useEffect, useRef, useState } from 'react';
import { IndustryChainData, MainSection, SubSection, SubSubSection, Company } from '@/types';

interface IndustryChainChartProps {
    data: IndustryChainData;
}

export default function IndustryChainChart({ data }: IndustryChainChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);

    const downloadChart = async () => {
        if (!containerRef.current) return;
        
        try {
            // 使用 html2canvas 进行截图
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(containerRef.current, {
                backgroundColor: '#fff',
                scale: 2,
            });

            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `${data.name}产业链全景图谱.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('下载图谱失败:', error);
            setError('下载图谱失败，请稍后重试');
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
        <div className="min-h-screen bg-gray-50 p-8">
            <div ref={containerRef} className="relative bg-white rounded-xl shadow-lg overflow-hidden">
                {/* 标题 */}
                <h1 
                    onClick={downloadChart}
                    className="text-4xl font-bold text-center py-10 px-4 text-gray-900 cursor-pointer 
                             hover:text-blue-600 transition-colors duration-200"
                >
                    {data.name}产业链全景图谱
                </h1>

                {/* 主要内容区域 */}
                <div className="flex flex-col lg:flex-row gap-8 p-8">
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
            <h2 className="text-xl font-bold p-4 text-center border-b ${borderColor}">
                {section.name}
            </h2>
            <div className="p-4 space-y-4">
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
            <h3 className="text-lg font-semibold p-3 border-b ${borderColor}">
                {subSection.name}
            </h3>
            <div className="p-4">
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
            <h4 className="text-base font-medium mb-2">
                {subSubSection.name}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4">
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
        <div className="text-sm text-gray-600 truncate" title={company.name}>
            {company.name}
        </div>
    );
} 