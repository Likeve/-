"use client";

import { useState } from "react";
import { KeyRound, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ActivatePage() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "激活失败");
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      const msgMap: Record<string, string> = {
        "Invalid activation code": "激活码无效，请检查后重新输入。",
        "This activation code has already been used": "该激活码已被使用，无法重复激活。",
        "Code is required": "请输入激活码。",
        "Internal server error": "服务器内部错误，请稍后重试。",
      };
      setError(msgMap[err.message] || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mt-20 flex flex-col items-center gap-8 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
        <ShieldCheck className="w-8 h-8" />
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">需要激活码</h2>
        <p className="text-slate-500 text-sm">
          请输入您的激活码以开始使用 AI 矢量化工具
        </p>
      </div>

      <form onSubmit={handleActivate} className="w-full space-y-5">
        <div className="space-y-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <KeyRound className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="例如：KEY-XXXX-XXXX"
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono uppercase tracking-wider text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-sm text-center bg-red-50 border border-red-100 py-2.5 rounded-lg font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !code.trim()}
          className="w-full px-6 py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              立即激活
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      <p className="text-xs text-slate-400 text-center">
        激活码为一次性使用，激活后在有效期内无需重复输入
      </p>
    </div>
  );
}
