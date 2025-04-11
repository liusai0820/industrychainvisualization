import React from 'react';

interface RiskAnalysisProps {
  content: string;
}

export const RiskAnalysis: React.FC<RiskAnalysisProps> = ({ content }) => {
  // 解析风险分析内容
  const parseRiskContent = (content: string) => {
    // 使用正则表达式匹配风险项（可能以数字、破折号或星号开头，后跟风险名称和描述）
    const riskRegex = /(?:^|\n)(?:\d+\.|\-|\*)\s+([^：:]+)(?:：|:)\s*([^\n]+)/g;
    const risks: { name: string; description: string }[] = [];
    
    let match;
    while ((match = riskRegex.exec(content)) !== null) {
      risks.push({
        name: match[1].trim(),
        description: match[2].trim(),
      });
    }

    // 尝试提取风险总结段落（不以数字、破折号或星号开头的段落，且至少50个字符）
    const paragraphs = content
      .split(/\n/)
      .map(p => p.trim())
      .filter(p => !p.match(/^(?:\d+\.|\-|\*)/) && p.length > 50);

    return {
      risks,
      summary: paragraphs.length > 0 ? paragraphs[0] : '',
    };
  };

  const { risks, summary } = parseRiskContent(content);

  // 将风险分类为高、中、低风险（这里简单地按顺序分类，前1/3为高风险，中间1/3为中风险，后1/3为低风险）
  const categorizeRisks = (risks: { name: string; description: string }[]) => {
    const total = risks.length;
    if (total === 0) return { high: [], medium: [], low: [] };

    const highCutoff = Math.ceil(total / 3);
    const mediumCutoff = Math.ceil((2 * total) / 3);

    return {
      high: risks.slice(0, highCutoff),
      medium: risks.slice(highCutoff, mediumCutoff),
      low: risks.slice(mediumCutoff),
    };
  };

  const categorizedRisks = categorizeRisks(risks);

  return (
    <div className="max-w-3xl mx-auto">
      {summary && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-2">风险概述</h4>
          <p className="text-gray-700">{summary}</p>
        </div>
      )}

      {risks.length > 0 ? (
        <>
          {categorizedRisks.high.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-4">
              <h4 className="text-lg font-semibold text-red-700 mb-2">高风险因素</h4>
              <ul className="divide-y divide-gray-200">
                {categorizedRisks.high.map((risk, index) => (
                  <li key={index} className="py-3">
                    <div className="font-medium text-gray-800">{risk.name}</div>
                    <div className="text-gray-600 mt-1">{risk.description}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {categorizedRisks.medium.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-4">
              <h4 className="text-lg font-semibold text-amber-600 mb-2">中风险因素</h4>
              <ul className="divide-y divide-gray-200">
                {categorizedRisks.medium.map((risk, index) => (
                  <li key={index} className="py-3">
                    <div className="font-medium text-gray-800">{risk.name}</div>
                    <div className="text-gray-600 mt-1">{risk.description}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {categorizedRisks.low.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-4">
              <h4 className="text-lg font-semibold text-green-600 mb-2">低风险因素</h4>
              <ul className="divide-y divide-gray-200">
                {categorizedRisks.low.map((risk, index) => (
                  <li key={index} className="py-3">
                    <div className="font-medium text-gray-800">{risk.name}</div>
                    <div className="text-gray-600 mt-1">{risk.description}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-gray-500 italic">未提供风险分析数据</p>
        </div>
      )}
    </div>
  );
}; 