'use client';

import { useEffect, useState } from 'react';
import IndustryChainChart from '@/components/IndustryChainChart';
import PresetIndustrySection from '@/components/PresetIndustrySection';
import ProgressBar from '@/components/ProgressBar';
import { PRESET_INDUSTRIES } from '@/data/preset-industries';
import { PresetIndustry, IndustryChainData, ProgressStage } from '@/types';
import { loadIndustryChainData } from '@/utils/dataLoader';
import FeedbackButton from '@/components/FeedbackButton';

// 定义进度阶段
const PROGRESS_STAGES: ProgressStage[] = [
    { name: '数据采集', progress: 25, detail: '正在收集产业链数据...' },
    { name: '结构分析', progress: 50, detail: '正在分析产业链结构...' },
    { name: '图谱生成', progress: 75, detail: '正在生成产业链图谱...' },
    { name: '优化完善', progress: 100, detail: '正在优化图谱显示...' }
];

export default function Home() {
    const [data, setData] = useState<IndustryChainData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showChart, setShowChart] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentProgress, setCurrentProgress] = useState(0);
    const [currentStage, setCurrentStage] = useState(0);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchInput.trim()) return;

        setIsLoading(true);
        setError(null);
        setCurrentProgress(0);
        setCurrentStage(0);

        try {
            // TODO: 检查是否是预设产业，如果是则直接加载
            // TODO: 如果不是预设产业，则调用 Dify API
            const result = await loadIndustryChainData(searchInput);
            setData(result);
            setShowChart(true);
        } catch (error) {
            console.error('Error loading data:', error);
            setError(error instanceof Error ? error.message : '加载数据失败');
        } finally {
            setIsLoading(false);
        }
    };

    const handleIndustryClick = async (industry: PresetIndustry) => {
        setIsLoading(true);
        setError(null);
        setCurrentProgress(0);
        setCurrentStage(0);

        try {
            const result = await loadIndustryChainData(industry.id);
            setData(result);
            setShowChart(true);
        } catch (error) {
            console.error('Error loading data:', error);
            setError(error instanceof Error ? error.message : '加载数据失败');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackClick = () => {
        setShowChart(false);
        setData(null);
        setSearchInput('');
    };

    // 修改进度条更新逻辑
    useEffect(() => {
        if (isLoading) {
            const interval = setInterval(() => {
                setCurrentProgress(prev => {
                    // 确保进度只增加不减少
                    const nextProgress = prev + (
                        prev < 30 ? 0.3 :  // 第一阶段
                        prev < 60 ? 0.5 :  // 第二阶段
                        prev < 90 ? 0.7 :  // 第三阶段
                        0.2                // 最后阶段
                    );

                    // 更新当前阶段
                    if (nextProgress >= PROGRESS_STAGES[currentStage].progress) {
                        setCurrentStage(Math.min(currentStage + 1, PROGRESS_STAGES.length - 1));
                    }

                    // 在最后阶段限制最大进度为95%
                    return Math.min(nextProgress, 95);
                });
            }, 100);

            return () => clearInterval(interval);
        }
    }, [isLoading, currentStage]);

    // 在数据加载完成后，直接设置为100%
    useEffect(() => {
        if (data) {
            setCurrentProgress(100);
            setCurrentStage(PROGRESS_STAGES.length - 1);
        }
    }, [data]);

    return (
        <main className="min-h-screen bg-white">
            {error && (
                <div className="p-4 text-red-500 text-center">
                    {error}
                </div>
            )}

            {!showChart ? (
                <div className="max-w-[1800px] mx-auto px-6 py-12 min-h-screen flex flex-col">
                    <div className="text-center mb-12">
                        <h1 className="text-6xl font-bold mb-8 tracking-wider" style={{ color: '#2B2B2B' }}>
                            智绘链图
                        </h1>
                        <div className="grid grid-cols-2 gap-3 max-w-3xl mx-auto text-sm text-gray-600">
                            <div className="flex items-center justify-center gap-3 px-6 py-2">
                                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <span>智能分析产业链层级关系</span>
                            </div>
                            <div className="flex items-center justify-center gap-3 px-6 py-2">
                                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                                <span>精准识别产业链关键节点</span>
                            </div>
                            <div className="flex items-center justify-center gap-3 px-6 py-2">
                                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                </svg>
                                <span>深入洞察产业发展新方向</span>
                            </div>
                            <div className="flex items-center justify-center gap-3 px-6 py-2">
                                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                                </svg>
                                <span>一键生成产业链全景图谱</span>
                            </div>
                        </div>
                    </div>
                        
                    {/* 搜索框 */}
                    <div className="w-full max-w-2xl mx-auto mb-8">
                        <form onSubmit={handleSearch} className="w-full">
                            <div className="w-full relative">
                                <div className="flex gap-3">
                                    <div className="w-full">
                                        <input
                                            type="text"
                                            value={searchInput}
                                            onChange={(e) => setSearchInput(e.target.value)}
                                            placeholder="输入感兴趣的产业链，例如：人形机器人、低空飞行器..."
                                            disabled={isLoading}
                                            className="w-full h-[46px] px-6 text-sm rounded-lg border border-gray-300 
                                                     focus:border-blue-500 focus:ring-2 focus:ring-blue-200 
                                                     transition-colors shadow-sm disabled:bg-gray-50 
                                                     disabled:text-gray-500 disabled:cursor-not-allowed"
                                        />
                                        <div className="mt-2 text-[11px] text-gray-500 text-center">
                                            <p>或直接点击下方的产业名称，快速生成对应的产业链图谱</p>
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isLoading || !searchInput.trim()}
                                        className={`h-[46px] px-6 text-white text-sm font-medium 
                                                 rounded-lg transition-colors shadow-md 
                                                 flex items-center justify-center gap-2 whitespace-nowrap
                                                 ${isLoading 
                                                   ? 'bg-gray-400 cursor-not-allowed' 
                                                   : 'bg-blue-600 hover:bg-blue-700'}`}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                        </svg>
                                        <span>{isLoading ? '生成中' : '生成图谱'}</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* 预留进度条位置的容器，保持布局一致性 */}
                    <div className="w-full max-w-3xl mx-auto h-24">
                        {isLoading && (
                            <ProgressBar
                                currentProgress={currentProgress}
                                stages={PROGRESS_STAGES}
                                currentStage={currentStage}
                                detail={PROGRESS_STAGES[currentStage].detail}
                            />
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-0 flex-grow mt-20">
                        {PRESET_INDUSTRIES.map((category, index) => (
                            <div key={category.id} className={`${index === 1 ? '-mt-6' : ''}`}>
                                <h2 className="text-base font-bold text-gray-800 mb-2">
                                    {category.id === 'strategic' ? '深圳重点发展20大战略性新兴产业' : '深圳优先布局8大未来产业'}
                                </h2>
                                <PresetIndustrySection
                                    category={category}
                                    onIndustryClick={handleIndustryClick}
                                />
                            </div>
                        ))}
                    </div>

                    {/* 底部创作者信息 */}
                    <footer className="text-center py-6 mt-auto border-t border-gray-100">
                        <div className="flex items-center justify-center gap-2 text-[13px] text-[#666]">
                            <span>Created by lius with Cursor</span>
                            <span>|</span>
                            <FeedbackButton />
                        </div>
                    </footer>
                </div>
            ) : (
                <div className="relative">
                    <button
                        onClick={handleBackClick}
                        className="fixed top-6 left-6 bg-white text-gray-600 px-6 py-3 rounded-xl 
                                shadow-lg hover:bg-gray-50 transition-colors z-50 flex items-center gap-3"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                        </svg>
                        <span>返回首页</span>
                    </button>
                    {data && (
                        <IndustryChainChart 
                            data={data} 
                            options={{
                                tooltip: {
                                    show: false
                                }
                            }}
                        />
                    )}
                </div>
            )}
        </main>
    );
} 