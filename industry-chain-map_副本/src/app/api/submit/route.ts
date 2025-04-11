import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { DIFY_CONFIG } from '@/lib/dify';

// 分析结果类型定义
interface BasicInfo {
  companyName: string;
  industry?: string;
  basicInfo: {
    established: string;
    headquarters: string;
    type: string;
    scale: string;
    mainBusiness: string;
    keyMetrics: {
      revenue: string;
      employees: string;
      marketPosition: string;
    }
  };
  keyHighlights: string[];
}

interface AnalysisResult {
  basic: BasicInfo | null;
  markdown: string;
  html: string;
}

export async function POST(request: NextRequest) {
  console.log('\n=== 收到企业分析提交请求 ===');
  
  try {
    const { companyName, industryName } = await request.json();
    console.log('📝 解析请求参数:', { companyName, industryName });

    if (!companyName) {
      console.warn('⚠️ 企业名称为空');
      return NextResponse.json(
        { success: false, error: '企业名称不能为空' },
        { status: 400 }
      );
    }

    // 调用Dify API
    console.log('🚀 开始调用Dify API...');
    const response = await fetch(DIFY_CONFIG.API_URL, {
      method: 'POST',
      headers: DIFY_CONFIG.HEADERS,
      body: JSON.stringify({
        inputs: {
          companyName,
          industryName: industryName || ''
        },
        response_mode: "blocking",
        user: nanoid()
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Dify API错误:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`Dify API错误: ${response.status} - ${errorData.message || response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Dify API响应成功');
    
    // 处理分析结果
    const analysisResult = processAnalysisResult(result.answer);
    
    return NextResponse.json({
      success: true,
      result: analysisResult
    });
    
  } catch (error) {
    console.error('❌ 分析生成错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '生成失败',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// 处理分析结果
function processAnalysisResult(answer: string): AnalysisResult {
  console.log('开始处理分析结果...');
  
  // 提取各个部分的内容
  const basicMatch = answer.match(/<basic>([\s\S]*?)<\/basic>/);
  const markdownMatch = answer.match(/<markdown>([\s\S]*?)<\/markdown>/);
  const htmlMatch = answer.match(/<html>([\s\S]*?)<\/html>/);

  // 解析结果
  const result = {
    basic: basicMatch ? JSON.parse(basicMatch[1]) : null,
    markdown: markdownMatch ? markdownMatch[1] : '',
    html: htmlMatch ? htmlMatch[1] : ''
  };

  console.log('✅ 分析结果处理完成');
  return result;
} 