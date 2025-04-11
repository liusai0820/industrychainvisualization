import React from 'react';

interface SwotAnalysisProps {
  content: string;
}

export const SwotAnalysis: React.FC<SwotAnalysisProps> = ({ content }) => {
  // 提取SWOT各部分内容
  const extractSwotItems = (text: string) => {
    // 定义正则表达式来匹配各部分
    const strengthsRegex = /(?:优势|strengths)[^]*?(?=(?:劣势|weaknesses)|(?:机遇|opportunities)|(?:威胁|threats)|$)/i;
    const weaknessesRegex = /(?:劣势|weaknesses)[^]*?(?=(?:机遇|opportunities)|(?:威胁|threats)|$)/i;
    const opportunitiesRegex = /(?:机遇|opportunities)[^]*?(?=(?:威胁|threats)|$)/i;
    const threatsRegex = /(?:威胁|threats)[^]*?(?=$)/i;
    
    // 提取各部分内容
    const strengthsMatch = text.match(strengthsRegex);
    const weaknessesMatch = text.match(weaknessesRegex);
    const opportunitiesMatch = text.match(opportunitiesRegex);
    const threatsMatch = text.match(threatsRegex);
    
    // 提取列表项
    const extractItems = (match: RegExpMatchArray | null) => {
      if (!match) return [];
      
      const content = match[0];
      // 移除标题行
      const contentWithoutTitle = content.replace(/^.*?(?:优势|strengths|劣势|weaknesses|机遇|opportunities|威胁|threats).*$/im, '');
      
      // 提取列表项
      const items = contentWithoutTitle.match(/[-*•]\s+([^\n]+)/g) || [];
      
      return items.map(item => 
        item.replace(/^[-*•]\s+/, '')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .trim()
      );
    };
    
    return {
      strengths: extractItems(strengthsMatch),
      weaknesses: extractItems(weaknessesMatch),
      opportunities: extractItems(opportunitiesMatch),
      threats: extractItems(threatsMatch)
    };
  };
  
  const swotItems = extractSwotItems(content);
  
  // 如果没有足够的SWOT内容，创建默认内容
  if (swotItems.strengths.length === 0 && swotItems.weaknesses.length === 0 && 
      swotItems.opportunities.length === 0 && swotItems.threats.length === 0) {
    return null;
  }
  
  return (
    <div className="grid grid-cols-2 gap-4 max-w-3xl mx-auto">
      {/* 优势 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm">
        <h4 className="text-blue-700 font-bold mb-2 text-center">优势</h4>
        <ul className="list-disc pl-5 text-blue-800 font-kai">
          {swotItems.strengths.length > 0 ? (
            swotItems.strengths.map((item, index) => (
              <li key={index} className="mb-1">{item}</li>
            ))
          ) : (
            <li className="mb-1">暂无数据</li>
          )}
        </ul>
      </div>
      
      {/* 劣势 */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
        <h4 className="text-red-700 font-bold mb-2 text-center">劣势</h4>
        <ul className="list-disc pl-5 text-red-800 font-kai">
          {swotItems.weaknesses.length > 0 ? (
            swotItems.weaknesses.map((item, index) => (
              <li key={index} className="mb-1">{item}</li>
            ))
          ) : (
            <li className="mb-1">暂无数据</li>
          )}
        </ul>
      </div>
      
      {/* 机遇 */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-sm">
        <h4 className="text-green-700 font-bold mb-2 text-center">机遇</h4>
        <ul className="list-disc pl-5 text-green-800 font-kai">
          {swotItems.opportunities.length > 0 ? (
            swotItems.opportunities.map((item, index) => (
              <li key={index} className="mb-1">{item}</li>
            ))
          ) : (
            <li className="mb-1">暂无数据</li>
          )}
        </ul>
      </div>
      
      {/* 威胁 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-sm">
        <h4 className="text-yellow-700 font-bold mb-2 text-center">威胁</h4>
        <ul className="list-disc pl-5 text-yellow-800 font-kai">
          {swotItems.threats.length > 0 ? (
            swotItems.threats.map((item, index) => (
              <li key={index} className="mb-1">{item}</li>
            ))
          ) : (
            <li className="mb-1">暂无数据</li>
          )}
        </ul>
      </div>
    </div>
  );
}; 