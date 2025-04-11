import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { AnalysisResult, GenerationStage, Stage } from '../types';

export const useReportGeneration = (companyName: string, industryName: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stageMessage, setStageMessage] = useState('');
  const [generationStage, setGenerationStage] = useState<GenerationStage>('collecting');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const apiResponseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 定义报告生成阶段
  const stages = useMemo<Record<string, Stage>>(() => ({
    collecting: {
      title: '收集数据',
      messages: ['正在收集公司基本信息...', '检索行业数据...', '获取市场动态...', '分析企业财务状况...'],
      duration: 10000, // 增加持续时间
      progressStart: 0,
      progressEnd: 15
    },
    analyzing: {
      title: '分析数据',
      messages: ['进行SWOT分析...', '分析企业竞争态势...', '评估公司商业模式...', '审视企业发展战略...'],
      duration: 15000, // 增加持续时间
      progressStart: 15,
      progressEnd: 30
    },
    drafting: {
      title: '起草报告',
      messages: ['撰写公司概况...', '整理运营分析...', '汇总财务数据...', '编写发展战略报告...'],
      duration: 20000, // 增加持续时间
      progressStart: 30,
      progressEnd: 50
    },
    reviewing: {
      title: '审核内容',
      messages: ['检查信息准确性...', '校对分析结论...', '优化报告结构...', '完善数据呈现...'],
      duration: 30000, // 增加持续时间
      progressStart: 50,
      progressEnd: 70
    },
    finalizing: {
      title: '等待AI响应',
      messages: [
        '等待AI生成报告内容...',
        '报告生成中，请耐心等待...',
        '大型模型正在处理您的请求...',
        '生成详细分析可能需要一些时间...',
        '正在等待AI响应，这可能需要几分钟...'
      ],
      duration: 60000, // 延长最后阶段的持续时间
      progressStart: 70,
      progressEnd: 95 // 最大只到95%，留出一点空间
    },
    complete: {
      title: '报告完成',
      messages: ['报告已生成完毕'],
      duration: 0,
      progressStart: 95,
      progressEnd: 100
    }
  }), []);
  
  // 开始进度模拟
  const startProgressSimulation = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    let currentStage: GenerationStage = 'collecting';
    let startTime = Date.now();
    let stageIndex = 0;
    const stageOrder: GenerationStage[] = ['collecting', 'analyzing', 'drafting', 'reviewing', 'finalizing'];
    
    progressIntervalRef.current = setInterval(() => {
      const currentTime = Date.now();
      const stageDuration = stages[currentStage].duration;
      const elapsedTime = currentTime - startTime;
      
      // 如果当前阶段已完成，进入下一阶段
      if (elapsedTime >= stageDuration && currentStage !== 'finalizing') {
        stageIndex++;
        if (stageIndex < stageOrder.length) {
          currentStage = stageOrder[stageIndex];
          setGenerationStage(currentStage);
          startTime = currentTime;
        }
      }
      
      // 计算当前阶段的进度百分比，但对于finalizing阶段，限制最大进度
      const stageProgress = Math.min(elapsedTime / stageDuration, currentStage === 'finalizing' ? 0.9 : 1);
      const startProgress = stages[currentStage].progressStart;
      const endProgress = stages[currentStage].progressEnd;
      const currentProgress = startProgress + (endProgress - startProgress) * stageProgress;
      
      setProgress(Math.floor(currentProgress));
    }, 200);
    
    // 设置安全超时，如果4分钟后仍无响应，显示提示消息
    apiResponseTimeoutRef.current = setTimeout(() => {
      if (progressIntervalRef.current) {
        // 更新消息，告知用户API响应延迟
        setStageMessage('AI响应较慢，请继续等待...');
        toast('生成报告需要较长时间，请耐心等待', {
          duration: 5000,
          icon: '⏳'
        });
      }
    }, 240000); // 4分钟
  }, [stages]);
  
  // 停止进度模拟
  const stopProgressSimulation = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    if (apiResponseTimeoutRef.current) {
      clearTimeout(apiResponseTimeoutRef.current);
      apiResponseTimeoutRef.current = null;
    }
    
    // 设置为"complete"阶段
    setGenerationStage('complete');
    // 确保进度达到100%
    setProgress(100);
  }, []);
  
  // 定义获取公司分析的函数
  const fetchCompanyAnalysis = useCallback(async () => {
    const fetchAnalysis = async () => {
      if (!companyName) return;
      
      setLoading(true);
      setError('');
      setGenerationStage('collecting');
      setProgress(0);
      
      try {
        // 设置模拟的进度更新
        startProgressSimulation();
        
        // 直接使用company-analysis API，不再使用旧的submit/status流程
        console.log('开始请求企业分析API，公司名称:', companyName);
        
        const analysisResponse = await fetch('/api/company-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyName: companyName || '',
            industryName: industryName || ''
          }),
        });
        
        if (!analysisResponse.ok) {
          const errorData = await analysisResponse.json();
          throw new Error(errorData.error || `请求失败, 状态码: ${analysisResponse.status}`);
        }
        
        const responseData = await analysisResponse.json();
        
        if (!responseData.success) {
          throw new Error(responseData.error || '分析请求失败');
        }

        // 停止进度模拟
        stopProgressSimulation();
        
        // 设置结果
        setAnalysisResult(responseData.data);
        
        // 更新UI状态
        setProgress(100);
        setGenerationStage('complete');
        
        console.log('✅ 企业分析完成！');
        toast.success('企业分析完成！', {
          duration: 3000,
          icon: '✨'
        });
        
      } catch (err) {
        console.error('获取分析失败:', err);
        setError(err instanceof Error ? err.message : '获取分析失败，请稍后重试');
        toast.error(`获取企业分析失败: ${err instanceof Error ? err.message : '未知错误'}`);
        
        // 停止进度模拟
        stopProgressSimulation();
      } finally {
        // 确保进度模拟停止
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        if (apiResponseTimeoutRef.current) {
          clearTimeout(apiResponseTimeoutRef.current);
          apiResponseTimeoutRef.current = null;
        }
        setLoading(false);
      }
    };
    
    fetchAnalysis();
    
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (apiResponseTimeoutRef.current) {
        clearTimeout(apiResponseTimeoutRef.current);
        apiResponseTimeoutRef.current = null;
      }
    };
  }, [companyName, industryName, startProgressSimulation, stopProgressSimulation]);
  
  // 模拟消息更新，为用户提供更好的反馈
  useEffect(() => {
    if (!loading) return;
    
    const currentStage = stages[generationStage];
    const messages = currentStage.messages;
    let messageIndex = 0;
    
    const messageInterval = setInterval(() => {
      setStageMessage(messages[messageIndex]);
      messageIndex = (messageIndex + 1) % messages.length;
    }, Math.floor(currentStage.duration / (messages.length * 2))); // 更频繁地更新消息
    
    return () => {
      clearInterval(messageInterval);
    };
  }, [loading, generationStage, stages]);
  
  return {
    loading,
    error,
    setError,
    progress,
    stageMessage,
    generationStage,
    analysisResult,
    setAnalysisResult,
    stages,
    fetchCompanyAnalysis
  };
}; 