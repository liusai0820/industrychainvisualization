import React from 'react';

interface CoreCompetenceProps {
  content: string;
}

export const CoreCompetence: React.FC<CoreCompetenceProps> = ({ content }) => {
  // 解析核心竞争力内容
  const parseCoreCompetence = (content: string) => {
    // 匹配核心竞争力列表项（可能以数字、破折号或星号开头）
    const competenceRegex = /(?:^|\n)(?:\d+\.|\-|\*)\s+([^\n]+)/g;
    const competences: string[] = [];
    
    let match;
    while ((match = competenceRegex.exec(content)) !== null) {
      competences.push(match[1].trim());
    }

    // 提取介绍段落（长度大于50个字符的段落，且不以列表标记开头）
    const paragraphs = content
      .split(/\n/)
      .map(p => p.trim())
      .filter(p => !p.match(/^(?:\d+\.|\-|\*)/) && p.length > 50);

    // 查找关键优势关键词
    const strengthsKeywords = [
      '技术优势', '研发能力', '规模优势', '市场份额', '专利', '创新', 
      '品牌影响力', '客户资源', '供应链', '成本控制', '人才优势',
      '管理效率', '质量控制', '产品质量', '服务能力'
    ];
    
    // 从竞争力列表中提取关键优势
    const keyStrengths = competences.filter(item => 
      strengthsKeywords.some(keyword => item.includes(keyword))
    );

    return {
      introduction: paragraphs.length > 0 ? paragraphs[0] : '',
      competences,
      keyStrengths: keyStrengths.length > 0 ? keyStrengths : competences.slice(0, Math.min(3, competences.length))
    };
  };

  const { introduction, competences, keyStrengths } = parseCoreCompetence(content);

  return (
    <div className="max-w-3xl mx-auto">
      {introduction && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-2">核心竞争力概述</h4>
          <p className="text-gray-700">{introduction}</p>
        </div>
      )}

      {keyStrengths.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-6">
          <h4 className="text-lg font-semibold text-blue-700 mb-4">关键优势</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {keyStrengths.map((strength, index) => (
              <div 
                key={index} 
                className="p-3 bg-blue-50 border border-blue-200 rounded-md text-gray-800 hover:bg-blue-100 transition-colors"
              >
                {strength}
              </div>
            ))}
          </div>
        </div>
      )}

      {competences.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-800 mb-2">详细分析</h4>
          <ul className="space-y-3">
            {competences.map((competence, index) => (
              <li key={index} className="flex">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center mr-2">
                  {index + 1}
                </div>
                <span className="text-gray-700">{competence}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-gray-500 italic">未提供核心竞争力数据</p>
        </div>
      )}
    </div>
  );
}; 