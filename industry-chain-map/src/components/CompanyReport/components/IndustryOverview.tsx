import React from 'react';

interface IndustryOverviewProps {
  content: string;
}

export const IndustryOverview: React.FC<IndustryOverviewProps> = ({ content }) => {
  // 解析行业概述内容，提取关键部分
  const parseIndustryOverview = (content: string) => {
    // 尝试提取市场规模信息
    const marketSizeRegex = /市场(规模|大小)[:：]?\s*([^\n]+)/i;
    const marketSizeMatch = content.match(marketSizeRegex);
    const marketSize = marketSizeMatch ? marketSizeMatch[2].trim() : '';

    // 尝试提取增长率信息
    const growthRateRegex = /增长[率趋势][:：]?\s*([^\n]+)/i;
    const growthRateMatch = content.match(growthRateRegex);
    const growthRate = growthRateMatch ? growthRateMatch[2].trim() : '';

    // 尝试提取关键趋势
    const trends: string[] = [];
    const trendsRegex = /(?:趋势|发展方向|未来发展)[:：]?\s*([^\n]+)/i;
    const trendsMatch = content.match(trendsRegex);
    
    if (trendsMatch) {
      // 可能是以逗号/分号分隔的列表
      const trendsList = trendsMatch[1].split(/[,，;；]/);
      trends.push(...trendsList.map(t => t.trim()).filter(t => t));
    }

    // 提取段落 - 分割内容为段落
    const paragraphs = content
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p && p.length > 20); // 只保留有意义的段落（长度>20）

    return {
      marketSize,
      growthRate,
      trends,
      paragraphs
    };
  };

  const { marketSize, growthRate, trends, paragraphs } = parseIndustryOverview(content);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {marketSize && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">市场规模</h4>
            <p className="text-gray-700">{marketSize}</p>
          </div>
        )}

        {growthRate && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">增长趋势</h4>
            <p className="text-gray-700">{growthRate}</p>
          </div>
        )}
      </div>

      {trends.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-2">行业趋势</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            {trends.map((trend, index) => (
              <li key={index}>{trend}</li>
            ))}
          </ul>
        </div>
      )}

      {paragraphs.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-800 mb-2">行业详细分析</h4>
          <div className="space-y-4">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="text-gray-700">{paragraph}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 