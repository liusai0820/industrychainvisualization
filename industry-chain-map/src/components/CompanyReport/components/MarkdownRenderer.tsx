import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { MarkdownComponentProps } from '../types';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        // @ts-expect-error - ReactMarkdown类型定义问题
        table: ({...props}: MarkdownComponentProps) => (
          <div className="overflow-x-auto my-6 rounded-lg shadow-md border border-gray-200">
            <table className="min-w-full divide-y divide-gray-300" {...props} />
          </div>
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        thead: ({...props}: MarkdownComponentProps) => (
          <thead className="bg-indigo-50" {...props} />
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        th: ({...props}: MarkdownComponentProps) => (
          <th className="px-4 py-3.5 text-left text-sm font-semibold text-gray-900 border-r last:border-r-0" {...props} />
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        tr: ({...props}: MarkdownComponentProps) => (
          <tr className="border-b last:border-b-0 hover:bg-gray-50" {...props} />
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        td: ({...props}: MarkdownComponentProps) => (
          <td className="px-4 py-3 text-sm text-gray-500 border-r last:border-r-0" {...props} />
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        code: ({inline, className, children, ...props}: MarkdownComponentProps) => {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={tomorrow}
              language={match[1]}
              PreTag="div"
              className="rounded-lg shadow-sm my-4"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={`${className} px-1.5 py-0.5 bg-gray-100 text-indigo-700 rounded text-sm`} {...props}>
              {children}
            </code>
          );
        },
        // @ts-expect-error - ReactMarkdown类型定义问题
        p: ({...props}: MarkdownComponentProps) => (
          <p className="my-4 leading-relaxed text-gray-700 font-kai" {...props} />
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        h3: ({...props}: MarkdownComponentProps) => (
          <h3 className="text-xl font-bold text-gray-800 mt-6 mb-3" {...props} />
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        h4: ({...props}: MarkdownComponentProps) => (
          <h4 className="text-lg font-semibold text-gray-800 mt-5 mb-2" {...props} />
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        ul: ({...props}: MarkdownComponentProps) => (
          <ul className="list-disc pl-6 my-4 space-y-2 text-gray-700" {...props} />
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        ol: ({...props}: MarkdownComponentProps) => (
          <ol className="list-decimal pl-6 my-4 space-y-2 text-gray-700" {...props} />
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        li: ({...props}: MarkdownComponentProps) => (
          <li className="pl-1 py-0.5 font-kai" {...props} />
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        blockquote: ({...props}: MarkdownComponentProps) => (
          <blockquote className="border-l-4 border-indigo-300 pl-4 py-1 my-4 text-gray-600 italic font-kai" {...props} />
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        a: ({...props}: MarkdownComponentProps) => (
          <a className="text-indigo-600 hover:text-indigo-800 hover:underline" {...props} />
        ),
        // @ts-expect-error - ReactMarkdown类型定义问题
        strong: ({...props}: MarkdownComponentProps) => (
          <strong className="font-bold text-indigo-700" {...props} />
        )
      }}
    >
      {content.replace(/^\d+\.\s*/, '')}
    </ReactMarkdown>
  );
}; 