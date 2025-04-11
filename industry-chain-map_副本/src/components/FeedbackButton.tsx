'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

type Mood = 1 | 2 | 3 | 4 | 5 | null;

const MOODS: Record<number, { emoji: string; label: string; color: string }> = {
  1: { emoji: '😢', label: '非常不满意', color: 'text-red-500' },
  2: { emoji: '🙁', label: '不满意', color: 'text-orange-500' },
  3: { emoji: '😐', label: '一般', color: 'text-yellow-500' },
  4: { emoji: '😊', label: '满意', color: 'text-green-500' },
  5: { emoji: '🥰', label: '非常满意', color: 'text-pink-500' },
} as const;

const PLACEHOLDER_SUGGESTIONS = {
  1: '请告诉我哪些地方让您感到不满意，我会认真改进...',
  2: '您的建议对我很重要，请分享您的具体想法...',
  3: '有什么建议可以让我做得更好吗？',
  4: '感谢支持！如果有任何改进建议也请告诉我...',
  5: '太棒了！能分享是什么让您感到满意吗？',
} as const;

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [selectedMood, setSelectedMood] = useState<Mood>(null);
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // 自动聚焦到文本框
  useEffect(() => {
    if (selectedMood && !feedback) {
      const textarea = document.getElementById('feedback') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
      }
    }
  }, [selectedMood, feedback]);

  const handleFeedbackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFeedback(value);
    setCharCount(value.length);
  };

  const getEmoji = (count: number) => {
    if (count === 0) return '✍️';
    if (count < 10) return '🤔';
    if (count < 30) return '👍';
    if (count < 50) return '🌟';
    if (count < 100) return '🎉';
    return '🏆';
  };

  const getEncouragement = (count: number) => {
    if (count === 0) return '期待您的想法...';
    if (count < 10) return '继续写下去...';
    if (count < 30) return '很好！请继续...';
    if (count < 50) return '太棒了！';
    if (count < 100) return '写得真详细！';
    return '感谢您的宝贵建议！';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feedback, email, mood: selectedMood }),
      });

      if (response.ok) {
        setShowSuccess(true);
        setFeedback('');
        setEmail('');
        setSelectedMood(null);
        setTimeout(() => {
          setIsOpen(false);
          setShowSuccess(false);
        }, 2000);
      }
    } catch (error) {
      console.error('提交反馈时出错:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (feedback.trim() || email.trim()) {
      setShowTip(true);
      return;
    }
    setIsOpen(false);
  };

  const modalContent = isOpen && (
    <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: 9999 }}>
      <div className="flex min-h-screen items-end justify-center p-4 text-center sm:items-center sm:p-0">
        {/* 遮罩层 */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity backdrop-blur-sm"
          onClick={handleClose}
        />
        {/* 弹窗 */}
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">意见反馈</h2>
                <span className="text-xl animate-bounce">{getEmoji(charCount)}</span>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {showTip ? (
              <div className="text-center py-8">
                <p className="text-base font-medium text-gray-900 mb-4">确定要放弃当前的反馈吗？</p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => setShowTip(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    继续编辑
                  </button>
                  <button
                    onClick={() => {
                      setShowTip(false);
                      setIsOpen(false);
                      setFeedback('');
                      setEmail('');
                      setSelectedMood(null);
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                  >
                    确认放弃
                  </button>
                </div>
              </div>
            ) : showSuccess ? (
              <div className="text-center py-8">
                <div className="relative">
                  <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full">
                    <span className="animate-ping-slow text-4xl">🎉</span>
                  </div>
                </div>
                <p className="text-base font-medium text-gray-900">感谢您的反馈！</p>
                <p className="text-xs text-gray-500 mt-2">您的建议是我进步的动力 ❤️</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 情绪选择器 */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-700">
                    您的使用体验如何？
                  </label>
                  <div className="flex justify-center gap-4">
                    {(Object.entries(MOODS) as Array<[string, typeof MOODS[keyof typeof MOODS]]>).map(([value, { emoji, label, color }]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSelectedMood(Number(value) as Mood)}
                        className={`group flex flex-col items-center transition-all duration-200 ${
                          selectedMood === Number(value)
                            ? 'transform scale-110'
                            : 'hover:scale-105'
                        }`}
                      >
                        <span className={`text-2xl transition-transform duration-200 ${
                          selectedMood === Number(value)
                            ? `animate-pulse ${color}`
                            : 'group-hover:scale-110'
                        }`}>
                          {emoji}
                        </span>
                        <span className={`text-[10px] mt-1 transition-colors ${
                          selectedMood === Number(value)
                            ? color
                            : 'text-gray-500'
                        }`}>
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`transition-all duration-300 ${selectedMood ? 'opacity-100 transform translate-y-0' : 'opacity-50 transform translate-y-4'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="feedback" className="block text-xs font-medium text-gray-700">
                      您的建议
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{getEncouragement(charCount)}</span>
                      <span className={`text-[10px] ${charCount > 180 ? 'text-red-500' : 'text-gray-400'}`}>
                        {charCount}/200
                      </span>
                    </div>
                  </div>
                  <textarea
                    id="feedback"
                    value={feedback}
                    onChange={handleFeedbackChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                    rows={4}
                    required
                    maxLength={200}
                    placeholder={selectedMood ? PLACEHOLDER_SUGGESTIONS[selectedMood] : '请先选择您的使用体验...'}
                    disabled={!selectedMood}
                  />
                  <p className="mt-1 text-[10px] text-gray-500 italic">💡 提示：可以分享您使用过程中的任何想法或建议</p>
                </div>
                <div className={`transition-all duration-300 ${feedback.length > 0 ? 'opacity-100 transform translate-y-0' : 'opacity-50 transform translate-y-4'}`}>
                  <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">
                    联系方式（选填）
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="留下您的邮箱，我可能会回复..."
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors text-sm"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !feedback.trim() || !selectedMood}
                    className={`px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all text-sm ${
                      (isSubmitting || !feedback.trim() || !selectedMood) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSubmitting ? '提交中...' : '提交反馈'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-[13px] text-[#666] hover:text-blue-500 transition-colors"
      >
        意见反馈
      </button>

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
} 