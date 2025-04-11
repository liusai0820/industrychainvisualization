import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

// 这个路由已被company-analysis直接API替代，但为了兼容性保留
export async function POST(request: NextRequest) {
  // 重定向到新的API
  try {
    // 尝试获取请求体
    const body = await request.json();
    
    // 返回提交确认
    return NextResponse.json({
      success: true,
      message: '已处理提交请求',
      redirectToApi: '/api/company-analysis',
      note: '此端点已被弃用，请直接使用 /api/company-analysis',
      requestId: Date.now().toString(),
      status: 'processing'
    });
  } catch (error) {
    console.error('处理提交请求时出错:', error);
    
    return NextResponse.json({
      success: false,
      message: '处理请求失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 400 });
  }
} 