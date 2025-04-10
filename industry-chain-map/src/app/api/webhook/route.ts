import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// import { redis } from '@/lib/redis'; // 禁用 Redis
// import { kv } from '@vercel/kv'; // 禁用 KV

// 禁用: 环境变量
// const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// 禁用: 接口定义
/*
interface AnalysisSection { ... }
interface AnalysisResult { ... }
interface RequestStatus { ... }
*/

export async function POST(_request: NextRequest) {
  console.log('\n=== 收到 webhook 回调 (功能已禁用) ===');
  console.log(`Webhook received method: ${_request.method}`); // 使用 _request 参数
  
  // 直接返回禁用信息，不再处理请求
  return NextResponse.json({
    success: false,
    error: 'Webhook 功能已禁用。'
  }, { status: 501 }); // 501 Not Implemented

  /* 禁用原有逻辑
  try {
    const requestData = await request.json();
    ...
    if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) { ... }
    ...
    const { requestId, ... } = requestData.meta || {};
    ...
    currentStatus = await redis.get<RequestStatus>(requestCacheKey);
    ...
    analysisResult = processAnalysisResult(result);
    ...
    await kv.set(analysisCacheKey, analysisResult, ...);
    ...
    await redis.set(requestCacheKey, currentStatus, ...);
    ...
    return NextResponse.json({ ... });
    
  } catch (error) {
    console.error('❌ Webhook处理错误:', error);
    return NextResponse.json({ ... }, { status: 500 });
  }
  */
}

// 禁用: processAnalysisResult 函数
/*
function processAnalysisResult(result: unknown): AnalysisResult {
  ...
}
*/ 