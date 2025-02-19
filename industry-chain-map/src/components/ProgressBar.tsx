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
        <div className="w-full mx-auto mt-2">
            <div className="relative w-full mx-auto pt-4">
                {/* 进度百分比 */}
                <div className="absolute right-0 top-0 text-xs text-gray-600">
                    {Math.round(currentProgress)}%
                </div>

                {/* 进度条 */}
                <div className="relative h-[2px] bg-gray-200 my-4">
                    <div
                        ref={progressLineRef}
                        className="absolute left-0 top-0 h-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${currentProgress}%` }}
                    />
                    
                    {/* 进度阶段 */}
                    <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 flex justify-between">
                        {stages.map((stage, index) => (
                            <div
                                key={stage.name}
                                className={`relative flex flex-col items-center ${
                                    index <= currentStage ? 'active' : ''
                                }`}
                            >
                                <div
                                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px]
                                        ${
                                            index <= currentStage
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white text-gray-500 border-gray-300'
                                        }
                                        border transition-all duration-300`}
                                >
                                    {index + 1}
                                </div>
                                <div
                                    className={`mt-1.5 text-xs font-medium transition-colors duration-300
                                        ${
                                            index <= currentStage
                                                ? 'text-blue-600'
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
                <div className="text-center mt-4">
                    <p className="text-xs text-gray-600">{detail}</p>
                </div>
            </div>
        </div>
    );
} 