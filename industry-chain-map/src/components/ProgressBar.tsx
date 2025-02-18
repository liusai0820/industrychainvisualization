'use client';

import { useEffect, useRef } from 'react';
import { ProgressStage } from '@/types';

interface ProgressBarProps {
    currentProgress: number;
    stages: ProgressStage[];
    currentStage: number;
    detail: string;
}

export default function ProgressBar({
    currentProgress,
    stages,
    currentStage,
    detail
}: ProgressBarProps) {
    const progressLineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (progressLineRef.current) {
            progressLineRef.current.style.width = `${currentProgress}%`;
        }
    }, [currentProgress]);

    return (
        <div className="w-full max-w-2xl mx-auto mt-8">
            <div className="relative w-full max-w-800px mx-auto pt-10">
                {/* 进度百分比 */}
                <div className="absolute right-0 top-0 text-sm text-black">
                    {Math.round(currentProgress)}%
                </div>

                {/* 进度条 */}
                <div className="relative h-[1px] bg-gray-200 my-10">
                    <div
                        ref={progressLineRef}
                        className="absolute left-0 top-0 h-full bg-black transition-all duration-500"
                        style={{ width: `${currentProgress}%` }}
                    />
                    
                    {/* 进度阶段 */}
                    <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 flex justify-between">
                        {stages.map((stage, index) => (
                            <div
                                key={stage.name}
                                className={`relative flex flex-col items-center ${
                                    currentProgress >= stage.progress ? 'active' : ''
                                }`}
                            >
                                <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs
                                        ${
                                            currentProgress >= stage.progress
                                                ? 'bg-black text-white border-black'
                                                : 'bg-white text-gray-500 border-gray-300'
                                        }
                                        border transition-all duration-300`}
                                >
                                    {index + 1}
                                </div>
                                <div
                                    className={`mt-3 text-sm font-medium transition-colors duration-300
                                        ${
                                            currentProgress >= stage.progress
                                                ? 'text-black'
                                                : 'text-gray-500'
                                        }`}
                                >
                                    {stage.name}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 进度详情 */}
                <div className="text-center mt-10">
                    <p className="text-sm text-gray-800">{stages[currentStage].detail}</p>
                </div>
            </div>
        </div>
    );
} 