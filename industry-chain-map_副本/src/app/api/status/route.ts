import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { redis } from '@/lib/redis';
import { kv } from '@vercel/kv';

// 分析结果类型定义
interface AnalysisSection {
  title: string;
  content: string;
}

interface AnalysisResult {
  rawMarkdown: string;
  sections: AnalysisSection[];
}

// 请求状态类型定义
interface RequestStatus {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  companyName: string;
  industryName?: string;
  createdAt: number;
  result?: AnalysisResult | null;
  error?: string;
}

export async function GET(request: NextRequest) {
  console.log('\n=== 收到状态检查请求 ===');
  
  try {
    // 获取请求ID
    const requestId = request.nextUrl.searchParams.get('requestId');
    
    if (!requestId) {
      console.warn('⚠️ 缺少请求ID参数');
      return NextResponse.json(
        { success: false, error: '缺少请求ID参数' },
        { status: 400 }
      );
    }
    
    console.log(`📥 检查请求ID: ${requestId} 的状态`);
    
    // 生成缓存键
    const requestCacheKey = `request:${requestId}`;
    
    // 从Redis获取请求状态
    let requestStatus: RequestStatus | null = null;
    
    try {
      requestStatus = await redis.get<RequestStatus>(requestCacheKey);
    } catch (redisError) {
      console.error('⚠️ Redis读取错误:', redisError);
      return NextResponse.json(
        { success: false, error: '无法检索请求状态' },
        { status: 500 }
      );
    }
    
    if (!requestStatus) {
      console.warn(`⚠️ 找不到请求状态: ${requestId}`);
      return NextResponse.json(
        { success: false, error: '找不到请求状态，可能已过期或请求ID无效' },
        { status: 404 }
      );
    }
    
    console.log(`📋 请求状态: ${requestStatus.status} (${requestId})`);
    
    // 如果请求已完成但状态记录中没有结果数据，尝试从KV缓存中获取
    if (requestStatus.status === 'completed' && !requestStatus.result && requestStatus.companyName) {
      console.log(`⚠️ 状态显示已完成，但没有结果数据，尝试从KV缓存获取`);
      
      try {
        const analysisCacheKey = `analysis:${requestStatus.companyName}:${requestStatus.industryName || ''}`;
        const cachedResult = await kv.get<AnalysisResult>(analysisCacheKey);
        
        if (cachedResult) {
          console.log(`✅ 已从KV缓存恢复结果数据`);
          requestStatus.result = cachedResult;
          
          // 更新Redis中的请求状态，添加结果数据
          try {
            await redis.set(requestCacheKey, requestStatus, { ex: 60 * 60 * 24 }); // 24小时过期
            console.log(`📦 已更新请求状态，添加了结果数据`);
          } catch (updateError) {
            console.error('⚠️ 更新Redis请求状态错误:', updateError);
            // 继续流程，不中断
          }
        } else {
          console.warn(`⚠️ KV缓存中也没有找到结果数据`);
        }
      } catch (kvError) {
        console.error('⚠️ KV缓存读取错误:', kvError);
        // 继续流程，不中断
      }
    }
    
    // 根据状态返回不同的响应
    if (requestStatus.status === 'completed') {
      return NextResponse.json({
        success: true,
        status: requestStatus.status,
        result: requestStatus.result,
        createdAt: requestStatus.createdAt
      });
    } else if (requestStatus.status === 'failed') {
      return NextResponse.json({
        success: true,
        status: requestStatus.status,
        error: requestStatus.error,
        createdAt: requestStatus.createdAt
      });
    } else {
      // 处理中
      return NextResponse.json({
        success: true,
        status: requestStatus.status,
        createdAt: requestStatus.createdAt
      });
    }
    
  } catch (error) {
    console.error('❌ 状态检查API错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '状态检查失败' 
      },
      { status: 500 }
    );
  }
} 