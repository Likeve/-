"use client";

import { useState, useRef } from "react";
import { UploadCloud, Image as ImageIcon, Download, Loader2, ArrowRight } from "lucide-react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [vectorizedSvg, setVectorizedSvg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      setError("请上传图片文件（PNG、JPG 等格式）。");
      return;
    }

    setFile(selectedFile);
    setOriginalUrl(URL.createObjectURL(selectedFile));
    setVectorizedSvg(null);
    setError(null);
    setIsProcessing(true);
    setProgress(0);

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const increment = prev < 50 ? Math.random() * 10 + 5 : Math.random() * 3 + 1;
        const next = prev + increment;
        return next > 95 ? 95 : next;
      });
    }, 500);

    const formData = new FormData();
    formData.append("image", selectedFile);
    formData.append("mode", "test");

    try {
      const res = await fetch("/api/vectorize", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "图片矢量化失败");
      }

      const svgText = await res.text();
      
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setProgress(100);
      
      setTimeout(() => {
        setVectorizedSvg(svgText);
        setIsProcessing(false);
      }, 500);

    } catch (err: any) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      console.error(err);
      setError(err.message || "发生未知错误，请稍后重试。");
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!vectorizedSvg) return;
    const blob = new Blob([vectorizedSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `矢量化-${file?.name.split(".")[0] || "图片"}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-5xl flex flex-col items-center gap-12">
      <div className="text-center space-y-4 max-w-2xl">
        <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          像素图片一键转为矢量图 <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            全彩 · 全自动 · AI 驱动
          </span>
        </h2>
        <p className="text-lg text-slate-600">
          快速将您的 PNG、JPG 图片转换为可无限缩放的 SVG 矢量图。
          无需手动操作，AI 全自动完成。
        </p>
      </div>

      {!originalUrl && !isProcessing && (
        <div
          className="w-full max-w-3xl h-80 border-2 border-dashed border-blue-300 rounded-3xl bg-blue-50/50 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-10 h-10 text-blue-600" />
          </div>
          <p className="text-xl font-semibold text-slate-800">
            拖拽图片到此处开始转换
          </p>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            或点击此处选择图片文件
          </p>
          <p className="text-xs text-slate-400">
            支持 PNG · JPG · WEBP · BMP · GIF
          </p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/webp, image/bmp, image/gif"
            className="hidden"
          />
        </div>
      )}

      {(originalUrl || isProcessing) && (
        <div className="w-full flex flex-col items-center gap-8">
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* 原始图片 */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-slate-600 font-semibold">
                <ImageIcon className="w-5 h-5" />
                <span>原始像素图</span>
              </div>
              <div className="w-full aspect-square max-h-[500px] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex items-center justify-center relative">
                {originalUrl && (
                  <img
                    src={originalUrl}
                    alt="原始图片"
                    className="max-w-full max-h-full object-contain"
                  />
                )}
              </div>
            </div>

            {/* 矢量化结果 */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-blue-600 font-semibold">
                <ArrowRight className="w-5 h-5 hidden md:block absolute left-1/2 -translate-x-1/2 z-10 bg-slate-50 p-1 rounded-full text-slate-400" />
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 22h20L12 2z"/></svg>
                <span>矢量化 SVG 结果</span>
              </div>
              <div className="w-full aspect-square max-h-[500px] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex items-center justify-center relative bg-[url('/checkers.svg')]">
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-4 w-2/3 max-w-[280px]">
                    <div className="text-blue-600 font-medium mb-1 animate-pulse flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      AI 正在处理中，请稍候…
                    </div>
                    <div className="w-full bg-blue-100/50 rounded-full h-3 overflow-hidden shadow-inner border border-blue-200/50">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="text-sm font-semibold text-blue-600/70">{Math.round(progress)}%</div>
                  </div>
                ) : vectorizedSvg ? (
                  <div
                    className="w-full h-full p-4 flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: vectorizedSvg }}
                  />
                ) : error ? (
                  <div className="text-red-500 text-center px-4">
                    <p className="font-bold">处理出错</p>
                    <p className="text-sm">{error}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => {
                setFile(null);
                setOriginalUrl(null);
                setVectorizedSvg(null);
                setError(null);
              }}
              className="px-6 py-3 rounded-xl font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              重新上传
            </button>
            <button
              onClick={handleDownload}
              disabled={!vectorizedSvg}
              className="px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              下载 SVG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
