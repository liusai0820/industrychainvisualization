import type { Metadata } from 'next'
import './globals.css'
import OfflineNotice from '@/components/OfflineNotice'
import FeedbackButton from '@/components/FeedbackButton'

export const metadata: Metadata = {
  title: '产业链图谱生成系统',
  description: '基于 AI 的智能产业链分析与图谱生成系统',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body>
        {children}
        <OfflineNotice />
        <FeedbackButton />
      </body>
    </html>
  )
} 