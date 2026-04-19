import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI 矢量化 - 图片转 SVG 矢量图",
  description: "利用 AI 技术，快速将 PNG、JPG 等图片转换为高质量的 SVG 矢量图，全自动处理。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.className} antialiased bg-slate-50 text-slate-900 min-h-screen flex flex-col`}>
        <header className="w-full bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 22h20L12 2z"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight">AI 矢量化</h1>
          </div>
          <nav className="flex gap-4 text-sm font-medium text-slate-600">
            <a href="#" className="hover:text-blue-600">API 接口</a>
            <a href="#" className="hover:text-blue-600">定价</a>
          </nav>
        </header>
        <main className="flex-1 flex flex-col items-center p-6 sm:p-12">
          {children}
        </main>
        <footer className="w-full bg-slate-900 text-slate-400 py-8 text-center text-sm">
          <p>© {new Date().getFullYear()} AI 矢量化工具 · 由 Vectorizer.ai API 驱动</p>
        </footer>
      </body>
    </html>
  );
}
