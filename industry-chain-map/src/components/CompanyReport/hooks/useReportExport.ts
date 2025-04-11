import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { generateDocx, downloadDocx } from '@/utils/docxGenerator';
import { AnalysisResult } from '../types';

export const useReportExport = (companyName: string, industryName: string, analysisResult: AnalysisResult | null) => {
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [generatingHTML, setGeneratingHTML] = useState(false);
  
  const downloadAsDocx = async () => {
    if (!analysisResult) return;
    
    setDownloadingDocx(true);
    
    try {
      // 使用新的docxGenerator工具生成Word文档
      const docBlob = await generateDocx({
        companyName,
        industryName,
        analysisResult
      });
      
      // 下载生成的文档
      downloadDocx(companyName, docBlob);
      
      toast.success('Word文档生成成功！', {
        duration: 3000,
        icon: '📄'
      });
      
    } catch (error) {
      console.error('Word文档生成失败:', error);
      toast.error('Word文档生成失败，请稍后重试');
    } finally {
      setDownloadingDocx(false);
    }
  };

  const generateHTMLReport = async () => {
    try {
      setGeneratingHTML(true);
      
      // 检查是否有分析结果
      if (!analysisResult || analysisResult.sections.length === 0) {
        toast.error('无法生成报告：分析结果为空');
        setGeneratingHTML(false);
        return;
      }
      
      // 发送请求生成HTML报告
      const response = await fetch('/api/company-analysis-html', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: companyName || '',
          industryName: industryName || '',
          analysisResult
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP错误，状态码: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '生成HTML报告失败');
      }
      
      // 检查是否从缓存获取
      if (result.fromCache) {
        const cacheType = result.cacheSource === 'memory' ? '本地内存' : '云端';
        const cacheDate = new Date(result.cachedAt).toLocaleString();
        
        toast.success(`已从${cacheType}缓存加载报告`, { 
          duration: 3000,
          icon: '📦'
        });
        console.log(`报告来自${cacheType}缓存，生成于: ${cacheDate}`);
      } else if (result.fallback) {
        // 如果使用了备选方案，通知用户
        toast.error('使用了模板生成报告（API生成失败）', {
          duration: 5000,
          icon: '⚠️'
        });
      } else {
        toast.success('报告生成成功！', {
          duration: 3000
        });
      }
      
      // 获取HTML数据
      const htmlContent = result.data;
      
      // 在新窗口中打开HTML
      try {
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(htmlContent);
          newWindow.document.close();
        } else {
          toast.error('无法打开新窗口，请检查您的浏览器是否阻止了弹出窗口');
        }
      } catch (error) {
        console.error('打开新窗口显示HTML失败:', error);
        toast.error('无法显示HTML报告，请检查浏览器设置');
      }
      
      // 自动下载HTML文件
      try {
        // 获取当前日期并格式化为 YYYY-MM-DD
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        const fileName = `${companyName}深度研究报告${dateString}.html`;
        
        // 创建一个Blob对象
        const blob = new Blob([htmlContent], { type: 'text/html' });
        
        // 创建一个下载链接
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = fileName;
        
        // 触发下载
        document.body.appendChild(downloadLink);
        downloadLink.click();
        
        // 清理
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(downloadLink.href);
        
        toast.success(`HTML报告已下载为: ${fileName}`, {
          duration: 4000,
          icon: '💾'
        });
      } catch (downloadError) {
        console.error('下载HTML文件失败:', downloadError);
        toast.error('无法下载HTML文件');
      }
      
    } catch (error) {
      console.error('生成HTML报告失败:', error);
      // 特别处理网络中断错误
      const errorMessage = error instanceof Error && 
                          error.message.includes('Premature close') ? 
                          '网络连接中断，请检查您的网络并重试' : 
                          `生成HTML报告失败: ${error instanceof Error ? error.message : '未知错误'}`;
      toast.error(errorMessage);
    } finally {
      setGeneratingHTML(false);
    }
  };
  
  return {
    downloadingDocx,
    generatingHTML,
    downloadAsDocx,
    generateHTMLReport
  };
}; 