"use client";

import { useEffect, useRef, useState } from "react";
import { MousePointer2, Download } from "lucide-react";

export default function SvgEditor({ 
  svgContent, 
  fileName 
}: { 
  svgContent: string; 
  fileName: string; 
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedElement, setSelectedElement] = useState<SVGElement | null>(null);

  const [fillColor, setFillColor] = useState<string>("#000000");
  const [opacity, setOpacity] = useState<number>(1);
  const [strokeColor, setStrokeColor] = useState<string>("none");
  const [strokeWidth, setStrokeWidth] = useState<number>(0);
  const [borderRadius, setBorderRadius] = useState<number>(0);

  // Initialize the SVG content
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = svgContent;
      const svgEl = containerRef.current.querySelector("svg");
      if (svgEl) {
        svgEl.style.width = "100%";
        svgEl.style.height = "100%";
        // Remove hardcoded width/height so it scales
        svgEl.removeAttribute("width");
        svgEl.removeAttribute("height");
      }
    }
  }, [svgContent]);

  // Click listener for SVG elements
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as SVGElement;
      if (target && target.tagName !== "svg" && containerRef.current?.contains(target)) {
        e.stopPropagation();
        
        // Deselect previous
        if (selectedElement) {
          selectedElement.classList.remove("editor-selected");
          selectedElement.style.outline = "";
        }
        
        // Select new
        target.classList.add("editor-selected");
        target.style.outline = "2px dashed #3b82f6";
        target.style.outlineOffset = "2px";
        
        setSelectedElement(target);

        // Read current attributes
        setFillColor(target.getAttribute("fill") || target.style.fill || "none");
        setOpacity(parseFloat(target.getAttribute("opacity") || target.style.opacity || "1"));
        setStrokeColor(target.getAttribute("stroke") || target.style.stroke || "none");
        setStrokeWidth(parseFloat(target.getAttribute("stroke-width") || target.style.strokeWidth || "0"));
        
        if (target.tagName.toLowerCase() === "rect") {
          setBorderRadius(parseFloat(target.getAttribute("rx") || "0"));
        } else {
          setBorderRadius(0);
        }
      } else if (containerRef.current?.contains(target)) {
        // Clicked on background/svg tag
        if (selectedElement) {
          selectedElement.classList.remove("editor-selected");
          selectedElement.style.outline = "";
        }
        setSelectedElement(null);
      }
    };

    const container = containerRef.current;
    container?.addEventListener("click", handleClick);
    return () => {
      container?.removeEventListener("click", handleClick);
    };
  }, [selectedElement]);

  const updateElementAttribute = (attr: string, value: string) => {
    if (selectedElement) {
      selectedElement.setAttribute(attr, value);
      // Clean up inline styles that might override the attribute
      if ((selectedElement.style as any)[attr]) {
        (selectedElement.style as any)[attr] = "";
      }
    }
  };

  const handleFillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFillColor(val);
    updateElementAttribute("fill", val);
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setOpacity(val);
    updateElementAttribute("opacity", val.toString());
  };

  const handleStrokeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStrokeColor(val);
    updateElementAttribute("stroke", val);
  };

  const handleStrokeWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setStrokeWidth(val);
    updateElementAttribute("stroke-width", val.toString());
  };

  const handleBorderRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setBorderRadius(val);
    if (selectedElement && selectedElement.tagName.toLowerCase() === "rect") {
      updateElementAttribute("rx", val.toString());
      updateElementAttribute("ry", val.toString());
    }
  };

  const handleDownload = () => {
    if (containerRef.current) {
      // Clean up outline styles before downloading
      if (selectedElement) {
        selectedElement.style.outline = "";
        selectedElement.style.outlineOffset = "";
      }
      
      const svgEl = containerRef.current.querySelector("svg");
      if (svgEl) {
        const svgString = svgEl.outerHTML;
        const blob = new Blob([svgString], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `矢量化-${fileName || "图片"}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      // Restore outline
      if (selectedElement) {
        selectedElement.style.outline = "2px dashed #3b82f6";
        selectedElement.style.outlineOffset = "2px";
      }
    }
  };

  const toHex = (color: string) => {
    if (color.startsWith("#")) return color.substring(0, 7);
    return "#000000"; // default for non-hex colors in picker
  };

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200 mt-6">
      {/* Left Canvas */}
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <MousePointer2 className="w-4 h-4 text-blue-600" />
            点击图像元素进行编辑
          </span>
        </div>
        <div className="w-full aspect-square max-h-[500px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative bg-[url('/checkers.svg')] cursor-crosshair">
          <div ref={containerRef} className="w-full h-full p-4 flex items-center justify-center" />
        </div>
      </div>

      {/* Right Controls */}
      <div className="w-full lg:w-80 flex flex-col gap-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-4">
          图形属性编辑器
        </h3>

        {!selectedElement ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm text-center py-12 border-2 border-dashed border-slate-100 rounded-lg">
            请在左侧预览区 <br /> 点击任意形状进行编辑
          </div>
        ) : (
          <div className="flex flex-col gap-5 flex-1">
            <div className="text-xs font-semibold px-2 py-1 bg-blue-50 text-blue-700 rounded-md self-start">
              已选中: &lt;{selectedElement.tagName.toLowerCase()}&gt;
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">填充颜色</label>
              <div className="flex gap-2 items-center">
                <input 
                  type="color" 
                  value={toHex(fillColor)} 
                  onChange={handleFillChange}
                  className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0"
                />
                <input 
                  type="text" 
                  value={fillColor}
                  onChange={handleFillChange}
                  placeholder="none / #RRGGBB"
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 flex justify-between">
                <span>不透明度</span>
                <span className="text-slate-500 text-xs bg-slate-100 px-1.5 py-0.5 rounded">{Math.round(opacity * 100)}%</span>
              </label>
              <input 
                type="range" 
                min="0" max="1" step="0.01" 
                value={opacity} 
                onChange={handleOpacityChange}
                className="w-full accent-blue-600"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">描边颜色</label>
              <div className="flex gap-2 items-center">
                <input 
                  type="color" 
                  value={toHex(strokeColor)} 
                  onChange={handleStrokeChange}
                  className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0"
                />
                <input 
                  type="text" 
                  value={strokeColor}
                  onChange={handleStrokeChange}
                  placeholder="none / #RRGGBB"
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 flex justify-between">
                <span>描边宽度</span>
                <span className="text-slate-500 text-xs bg-slate-100 px-1.5 py-0.5 rounded">{strokeWidth}px</span>
              </label>
              <input 
                type="range" 
                min="0" max="50" step="0.5" 
                value={strokeWidth} 
                onChange={handleStrokeWidthChange}
                className="w-full accent-blue-600"
              />
            </div>

            {selectedElement.tagName.toLowerCase() === "rect" && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700 flex justify-between">
                  <span>圆角半径</span>
                  <span className="text-slate-500 text-xs bg-slate-100 px-1.5 py-0.5 rounded">{borderRadius}px</span>
                </label>
                <input 
                  type="range" 
                  min="0" max="200" step="1" 
                  value={borderRadius} 
                  onChange={handleBorderRadiusChange}
                  className="w-full accent-blue-600"
                />
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleDownload}
          className="mt-4 w-full px-4 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          下载编辑后的 SVG
        </button>
      </div>
    </div>
  );
}