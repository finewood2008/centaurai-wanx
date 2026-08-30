import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://wanxiang-work-agent.finewood1986.chatgpt.site'),
  title: '万象 · 工作 Agent Builder',
  description: '由社群陪跑、以真实工作结果为验收标准的工作 Agent Builder。',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: '万象 · 工作 Agent Builder',
    description: '把真实工作构建成可靠 Agent。',
    url: 'https://wanxiang-work-agent.finewood1986.chatgpt.site',
    siteName: '万象',
    locale: 'zh_CN',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: '万象 · 把真实工作构建成可靠 Agent' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '万象 · 工作 Agent Builder',
    description: '把真实工作构建成可靠 Agent。',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
