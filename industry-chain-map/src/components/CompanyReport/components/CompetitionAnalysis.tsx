import React from 'react';

interface CompetitionAnalysisProps {
  content: string;
}

export const CompetitionAnalysis: React.FC<CompetitionAnalysisProps> = ({ content }) => {
  // 竞争对手分析内容解析函数
  const parseCompetitionContent = (content: string) => {
    // 尝试提取竞争对手列表
    const competitors: { name: string; description: string }[] = [];
    
    // 使用正则表达式匹配竞争对手及其描述
    // 查找类似 "1. 竞争对手名称：描述" 或 "- 竞争对手名称：描述" 的模式
    const competitorRegex = /(?:^|\n)(?:\d+\.|\-|\*)\s+([^：:]+)(?:：|:)\s*([^\n]+)/g;
    
    let match;
    while ((match = competitorRegex.exec(content)) !== null) {
      const name = match[1].trim();
      const description = match[2].trim();
      
      if (name && description) {
        competitors.push({ name, description });
      }
    }
    
    // 提取总结性段落 - 通常在列表后的文本段落
    let summary = '';
    const summaryMatch = content.match(/(?:\n\n|\r\n\r\n)([^-*\d][^\n]+(?:\n[^-*\d][^\n]+)*)\s*$/);
    if (summaryMatch) {
      summary = summaryMatch[1].trim();
    }
    
    return { competitors, summary };
  };
  
  const { competitors, summary } = parseCompetitionContent(content);
  
  // 如果没有内容，返回null
  if (competitors.length === 0 && !summary) {
    return null;
  }
  
  return (
    <div className="max-w-3xl mx-auto">
      {competitors.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">主要竞争对手</h4>
          <div className="space-y-4">
            {competitors.map((competitor, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                <h5 className="font-bold text-indigo-700">{competitor.name}</h5>
                <p className="text-gray-700 mt-1">{competitor.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {summary && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm">
          <h4 className="font-bold text-gray-800 mb-2">竞争分析总结</h4>
          <p className="text-gray-700">{summary}</p>
        </div>
      )}
    </div>
  );
}; 