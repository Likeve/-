import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    // 强制启用官方的测试模式
    formData.set("mode", "test");
    
    const apiId = process.env.VECTORIZER_API_ID;
    const apiSecret = process.env.VECTORIZER_API_SECRET;
    
    if (!apiId || !apiSecret) {
      return NextResponse.json(
        { error: "API credentials not configured in .env.local" },
        { status: 500 }
      );
    }

    const response = await fetch("https://vectorizer.ai/api/v1/vectorize", {
      method: "POST",
      headers: {
        // 使用提供的 API ID 和 API Secret 构建 Basic Auth
        "Authorization": `Basic ${Buffer.from(`${apiId}:${apiSecret}`, "utf-8").toString("base64")}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Vectorizer API Error:", response.status, errorText);
      return NextResponse.json(
        { error: `Vectorizer API returned ${response.status}: ${errorText}` },
        { status: response.status }
      );
    }

    // API 返回的直接是 SVG 文本内容
    const svgBuffer = await response.arrayBuffer();
    const svgText = Buffer.from(svgBuffer).toString("utf-8");

    // 将 SVG 内容返回给前端
    return new NextResponse(svgText, {
      headers: {
        "Content-Type": "image/svg+xml",
      },
    });
  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
