'use client';

import { useEffect, useState } from 'react';

// 可以通过环境变量来控制是否启用此功能
const ENABLE_OFFLINE_NOTICE = process.env.NEXT_PUBLIC_ENABLE_OFFLINE_NOTICE === 'true';

export default function OfflineNotice() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (!ENABLE_OFFLINE_NOTICE) return; // 如果功能未启用，直接返回

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 初始化检查网络状态
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!ENABLE_OFFLINE_NOTICE || !isOffline) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
      <div className="flex items-center space-x-2">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>网络连接已断开</span>
      </div>
    </div>
  );
} 