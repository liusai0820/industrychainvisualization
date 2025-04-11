import React from 'react';
import { GenerationStage, Stage } from '../types';

interface LoadingStateProps {
  progress: number;
  stageMessage: string;
  stages: Record<string, Stage>;
  generationStage: GenerationStage;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  progress, 
  stageMessage, 
  stages, 
  generationStage 
}) => {
  return (
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
  );
}; 