import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./app/lib/jwt";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("activation_token")?.value;
  const isActivatePage = req.nextUrl.pathname.startsWith("/activate");
  const isApiActivate = req.nextUrl.pathname.startsWith("/api/activate");

  // 放行激活页面本身，以及激活API
  if (isActivatePage || isApiActivate) {
    return NextResponse.next();
  }

  // 1. 如果没有 Token，跳转到激活页面
  if (!token) {
    return NextResponse.redirect(new URL("/activate", req.url));
  }

  // 2. 校验 Token 是否有效或过期
  const payload = await verifyToken(token);
  if (!payload) {
    const response = NextResponse.redirect(new URL("/activate", req.url));
    // 如果 token 失效/过期，清理掉过期的 cookie
    response.cookies.delete("activation_token");
    return response;
  }

  // 3. 一切正常，继续放行
  return NextResponse.next();
}

// 定义中间件作用的路径（忽略静态资源、图标等）
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|checkers.svg).*)"],
};
