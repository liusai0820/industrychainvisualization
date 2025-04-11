import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import OfflineNotice from '@/components/OfflineNotice'
import { ClerkProvider } from '@clerk/nextjs'
import { zhCN } from '@clerk/localizations'

const inter = Inter({ subsets: ['latin'] })

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
    <ClerkProvider localization={zhCN}>
      <html lang="zh">
        <body className={inter.className}>
          {children}
          <OfflineNotice />
        </body>
      </html>
    </ClerkProvider>
  )
} 