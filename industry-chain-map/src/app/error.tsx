'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            抱歉，出现了一些问题
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {error.message || '系统遇到了一个错误，请稍后再试'}
          </p>
        </div>
        <div className="mt-5 flex justify-center">
          <button
            onClick={reset}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            重试
          </button>
        </div>
      </div>
    </div>
  );
} 