import React from 'react';

interface ReportHeaderProps {
  companyName: string;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({ companyName }) => {
  return (
    <div className="report-header mb-12 text-center">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        {companyName} 公司研究报告
      </h1>
      <p className="text-gray-500">
        报告生成日期: {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  );
}; 