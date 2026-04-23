"use client";

import { useEffect, useRef, useState } from "react";
import { MousePointer2, Download, ChevronLeft, LayoutPanelLeft } from "lucide-react";

export default function SvgEditor({ 
  svgContent, 
  fileName,
  onClose
}: { 
  svgContent: string; 
  fileName: string; 
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedElement, setSelectedElement] = useState<SVGElement | null>(null);
  const [layers, setLayers] = useState<SVGElement[]>([]);

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

        // Extract layers
        const shapes = Array.from(svgEl.querySelectorAll("path, rect, circle, ellipse, polygon, polyline, line")) as SVGElement[];
        setLayers(shapes);
      }
    }
  }, [svgContent]);

  const selectElement = (target: SVGElement | null) => {
    // Deselect previous
    if (selectedElement) {
      selectedElement.classList.remove("editor-selected");
      selectedElement.style.outline = "";
    }
    
    if (target) {
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
    } else {
      setSelectedElement(null);
    }
  };

  // Click listener for SVG elements
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as SVGElement;
      if (target && target.tagName !== "svg" && containerRef.current?.contains(target)) {
        e.stopPropagation();
        selectElement(target);
      } else if (containerRef.current?.contains(target)) {
        // Clicked on background/svg tag
        selectElement(null);
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
    <div className="fixed inset-0 z-[100] bg-slate-100 flex flex-col h-screen w-screen overflow-hidden text-slate-900">
      {/* Top Navbar */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            title="返回首页"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="h-4 w-[1px] bg-slate-200"></div>
          <span className="font-semibold text-slate-800 text-sm">{fileName}.svg</span>
        </div>
        
        <button
          onClick={handleDownload}
          className="px-4 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm shadow-sm"
        >
          <Download className="w-4 h-4" />
          导出 SVG
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Layers) */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 z-10 shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
          <div className="h-12 border-b border-slate-100 flex items-center px-4 gap-2 text-slate-800 font-semibold text-sm shrink-0">
            <LayoutPanelLeft className="w-4 h-4 text-slate-500" />
            图层 (Layers)
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {layers.map((layer, idx) => (
              <div 
                key={idx} 
                className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg cursor-pointer mb-0.5 transition-colors select-none ${
                  selectedElement === layer 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'hover:bg-slate-50 text-slate-600'
                }`}
                onClick={() => selectElement(layer)}
              >
                <div 
                  className="w-4 h-4 rounded-sm border shrink-0 opacity-80"
                  style={{ 
                    backgroundColor: layer.getAttribute('fill') !== 'none' ? (layer.getAttribute('fill') || '#000') : 'transparent',
                    borderColor: layer.getAttribute('stroke') !== 'none' ? (layer.getAttribute('stroke') || '#ccc') : '#ccc',
                  }}
                ></div>
                <span className="capitalize truncate">{layer.tagName.toLowerCase()} {layers.length - idx}</span>
              </div>
            ))}
            {layers.length === 0 && (
              <div className="text-xs text-slate-400 text-center mt-10">
                未检测到可编辑图层
              </div>
            )}
          </div>
        </aside>

        {/* Center Canvas */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-[url('/checkers.svg')] bg-repeat">
          <div className="absolute inset-0 overflow-auto flex items-center justify-center p-8">
            <div className="bg-white shadow-md relative cursor-crosshair max-w-[80%] max-h-[80%] flex items-center justify-center border border-slate-200/50">
              <div ref={containerRef} className="w-full h-full pointer-events-auto" />
            </div>
          </div>
          
          {/* Canvas Controls overlay */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-slate-200 text-xs font-medium text-slate-600 flex items-center gap-2 pointer-events-none">
            <MousePointer2 className="w-3 h-3" />
            可在左侧选择图层，或直接点击画布形状
          </div>
        </main>

        {/* Right Sidebar (Properties) */}
        <aside className="w-72 bg-white border-l border-slate-200 flex flex-col shrink-0 z-10 shadow-[-1px_0_10px_rgba(0,0,0,0.02)]">
          <div className="h-12 border-b border-slate-100 flex items-center px-4 font-semibold text-slate-800 text-sm shrink-0">
            属性 (Properties)
          </div>
          
          <div className="flex-1 overflow-y-auto p-5">
            {!selectedElement ? (
              <div className="flex flex-col items-center justify-center text-slate-400 text-sm text-center py-12 border-2 border-dashed border-slate-100 rounded-lg">
                <MousePointer2 className="w-8 h-8 mb-3 text-slate-300" />
                请在左侧或画布中 <br /> 选择一个图层
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="text-xs font-semibold px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-md self-start font-mono">
                  &lt;{selectedElement.tagName.toLowerCase()}&gt;
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">填充 (Fill)</label>
                  <div className="flex gap-2 items-center">
                    <div className="relative w-8 h-8 rounded border border-slate-200 overflow-hidden shrink-0">
                      <input 
                        type="color" 
                        value={toHex(fillColor)} 
                        onChange={handleFillChange}
                        className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                      />
                    </div>
                    <input 
                      type="text" 
                      value={fillColor}
                      onChange={handleFillChange}
                      placeholder="none / #RRGGBB"
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="h-[1px] bg-slate-100 w-full"></div>

                <div className="flex flex-col gap-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                    <span>不透明度 (Opacity)</span>
                    <span className="text-slate-700 bg-slate-100 px-1.5 rounded">{Math.round(opacity * 100)}%</span>
                  </label>
                  <input 
                    type="range" 
                    min="0" max="1" step="0.01" 
                    value={opacity} 
                    onChange={handleOpacityChange}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div className="h-[1px] bg-slate-100 w-full"></div>

                <div className="flex flex-col gap-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">描边 (Stroke)</label>
                  <div className="flex gap-2 items-center">
                    <div className="relative w-8 h-8 rounded border border-slate-200 overflow-hidden shrink-0">
                      <input 
                        type="color" 
                        value={toHex(strokeColor)} 
                        onChange={handleStrokeChange}
                        className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                      />
                    </div>
                    <input 
                      type="text" 
                      value={strokeColor}
                      onChange={handleStrokeChange}
                      placeholder="none / #RRGGBB"
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                    <span>描边宽度 (Stroke Width)</span>
                    <span className="text-slate-700 bg-slate-100 px-1.5 rounded">{strokeWidth}px</span>
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
                  <>
                    <div className="h-[1px] bg-slate-100 w-full"></div>
                    <div className="flex flex-col gap-3">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                        <span>圆角半径 (Radius)</span>
                        <span className="text-slate-700 bg-slate-100 px-1.5 rounded">{borderRadius}px</span>
                      </label>
                      <input 
                        type="range" 
                        min="0" max="200" step="1" 
                        value={borderRadius} 
                        onChange={handleBorderRadiusChange}
                        className="w-full accent-blue-600"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}