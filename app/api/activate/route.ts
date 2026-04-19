import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { signToken } from "@/app/lib/jwt";

// 为了防止开发环境下热重载导致多次实例化 Prisma Client
const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body;
    
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const activationCode = await prisma.activationCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!activationCode) {
      return NextResponse.json({ error: "Invalid activation code" }, { status: 400 });
    }

    if (activationCode.isUsed) {
      return NextResponse.json({ error: "This activation code has already been used" }, { status: 400 });
    }

    // 标记激活码为已使用
    await prisma.activationCode.update({
      where: { id: activationCode.id },
      data: { isUsed: true, usedAt: new Date() },
    });

    // 生成授权的 JWT Token
    const token = await signToken({ codeId: activationCode.id }, activationCode.durationDays);

    // 计算 cookie 有效期（秒）
    const maxAgeSeconds = activationCode.durationDays * 24 * 60 * 60;

    const response = NextResponse.json({ 
      success: true, 
      durationDays: activationCode.durationDays,
      expiresAt: new Date(Date.now() + maxAgeSeconds * 1000)
    });
    
    // 设置 HttpOnly 授权 Cookie
    response.cookies.set({
      name: "activation_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: maxAgeSeconds,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Activation API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
