import React from 'react';

interface ErrorStateProps {
  error: string | null;
  fetchCompanyAnalysis: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
  error, 
  fetchCompanyAnalysis 
}) => {
  return (
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
          fetchCompanyAnalysis();
        }}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
      >
        重试
      </button>
    </div>
  );
}; 