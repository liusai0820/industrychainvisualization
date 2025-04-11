import React from 'react';
import { AnalysisSection } from '../types';

interface TableOfContentsProps {
  sections: AnalysisSection[];
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ sections }) => {
  if (!sections || sections.length === 0) return null;
  
  return (
    <div className="report-toc mb-12 bg-gray-50 p-6 rounded-lg max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">目录</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ul className="space-y-2">
          {sections.slice(0, Math.ceil(sections.length / 2)).map((section, index) => (
            <li key={index} className="flex items-center">
              <span className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-full mr-2 text-sm font-bold">
                {index + 1}
              </span>
              <a 
                href={`#section-${index}`} 
                className="text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                {section.title.replace(/^\d+\.\s*/, '')}
              </a>
            </li>
          ))}
        </ul>
        <ul className="space-y-2">
          {sections.slice(Math.ceil(sections.length / 2)).map((section, index) => (
            <li key={index + Math.ceil(sections.length / 2)} className="flex items-center">
              <span className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-full mr-2 text-sm font-bold">
                {index + 1 + Math.ceil(sections.length / 2)}
              </span>
              <a 
                href={`#section-${index + Math.ceil(sections.length / 2)}`} 
                className="text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                {section.title.replace(/^\d+\.\s*/, '')}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}; 