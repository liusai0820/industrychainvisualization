import React from 'react';

export interface CompanyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  industryName?: string;
}

export interface AnalysisSection {
  title: string;
  content: string;
}

export interface AnalysisResult {
  rawMarkdown: string;
  sections: AnalysisSection[];
}

export type GenerationStage = 'collecting' | 'analyzing' | 'drafting' | 'reviewing' | 'finalizing' | 'complete';

export interface Stage {
  title: string;
  messages: string[];
  duration: number;
  progressStart: number;
  progressEnd: number;
}

export interface MarkdownComponentProps {
  node?: React.ReactNode;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

export interface ToastInterface {
  success: (message: string, options?: object) => void;
  error: (message: string, options?: object) => void;
} 