"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MousePointer2, Download, ChevronLeft, LayoutPanelLeft, ZoomIn, ZoomOut, Eye, EyeOff, Folder, Trash2, Undo2, Redo2 } from "lucide-react";

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
  const [selectedElements, setSelectedElements] = useState<SVGElement[]>([]);
  const [layers, setLayers] = useState<SVGElement[]>([]);

  const [fillColor, setFillColor] = useState<string>("#000000");
  const [opacity, setOpacity] = useState<number>(1);
  const [strokeColor, setStrokeColor] = useState<string>("none");
  const [strokeWidth, setStrokeWidth] = useState<number>(0);
  const [borderRadius, setBorderRadius] = useState<number>(0);
  const [rotation, setRotation] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);

  const [canvasWidth, setCanvasWidth] = useState<number>(600);
  const [canvasHeight, setCanvasHeight] = useState<number>(600);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1);

  // Moving elements
  const [isMoving, setIsMoving] = useState(false);
  const [moveStartPos, setMoveStartPos] = useState({x: 0, y: 0});
  const initialTransformsRef = useRef<Map<SVGElement, {tx: number, ty: number, rot: number, s: number}>>(new Map());

  const parseElementTransform = useCallback((el: SVGElement) => {
    const transformStr = el.style.transform || el.getAttribute("transform") || "";
    let tx = 0, ty = 0, rot = 0, sx = 1, sy = 1;
    
    const translateMatch = transformStr.match(/translate\(([-0-9.]+)(?:px)?,?\s*([-0-9.]+)(?:px)?\)/);
    if (translateMatch) {
      tx = parseFloat(translateMatch[1]) || 0;
      ty = parseFloat(translateMatch[2]) || 0;
    }
    const rotateMatch = transformStr.match(/rotate\(([-0-9.]+)(?:deg)?\)/);
    if (rotateMatch) {
      rot = parseFloat(rotateMatch[1]) || 0;
    }
    const scaleMatch = transformStr.match(/scale\(([-0-9.]+)(?:,\s*([-0-9.]+))?\)/);
    if (scaleMatch) {
      sx = parseFloat(scaleMatch[1]) || 1;
      sy = scaleMatch[2] !== undefined ? parseFloat(scaleMatch[2]) : sx;
    }
    return { tx, ty, rot, sx, sy };
  }, []);

  const applyTransform = useCallback((el: SVGElement, tx: number, ty: number, rot: number, s: number) => {
    el.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${s})`;
    el.style.transformBox = "fill-box";
    el.style.transformOrigin = "center";
  }, []);

  // Box selection
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({x: 0, y: 0});
  const [currentPos, setCurrentPos] = useState({x: 0, y: 0});

  // Context menu
  const [contextMenu, setContextMenu] = useState<{x: number, y: number} | null>(null);

  // History for Undo/Redo
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const applySelectionStyles = (elements: SVGElement[]) => {
    if (!containerRef.current) return;
    const allSelected = containerRef.current.querySelectorAll('.editor-selected');
    allSelected.forEach(l => {
      l.classList.remove("editor-selected");
      (l as HTMLElement).style.outline = "";
      (l as HTMLElement).style.outlineOffset = "";
    });
    elements.forEach(target => {
      target.classList.add("editor-selected");
      target.style.outline = "2px dashed #3b82f6";
      target.style.outlineOffset = "2px";
    });
  };

  const saveState = useCallback(() => {
    if (!containerRef.current) return;

    // Temporarily remove selection styles for saving
    const selected = Array.from(containerRef.current.querySelectorAll('.editor-selected')) as HTMLElement[];
    selected.forEach(el => {
      el.classList.remove("editor-selected");
      el.style.outline = "";
      el.style.outlineOffset = "";
    });

    const state = containerRef.current.innerHTML;

    // Restore selection styles
    selected.forEach(el => {
      el.classList.add("editor-selected");
      el.style.outline = "2px dashed #3b82f6";
      el.style.outlineOffset = "2px";
    });

    // Don't save if nothing changed
    if (historyIndexRef.current >= 0 && historyRef.current[historyIndexRef.current] === state) {
      return;
    }

    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(state);
    
    // Limit history length to 50
    if (newHistory.length > 50) newHistory.shift();

    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    
    setHistory([...newHistory]);
    setHistoryIndex(newHistory.length - 1);
  }, []);

  const saveStateDebounced = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      saveState();
    }, 400);
  }, [saveState]);

  const updateLayers = useCallback(() => {
    if (containerRef.current) {
      const svgEl = containerRef.current.querySelector("svg");
      if (svgEl) {
        const allShapes = Array.from(svgEl.querySelectorAll("g, path, rect, circle, ellipse, polygon, polyline, line")) as SVGElement[];
        const topShapes = allShapes.filter(shape => {
          let parent = shape.parentElement;
          while (parent && parent.tagName !== 'svg') {
            if (parent.tagName === 'g') return false; // hide if inside a group
            parent = parent.parentElement;
          }
          return true;
        });
        setLayers(topShapes.reverse()); // Match z-index: top layer first
      }
    }
  }, []);

  // Initialize the SVG content
  useEffect(() => {
    if (containerRef.current && !containerRef.current.hasChildNodes()) {
      containerRef.current.innerHTML = svgContent;
      const svgEl = containerRef.current.querySelector("svg");
      if (svgEl) {
        let w = 600;
        let h = 600;
        const wAttr = svgEl.getAttribute("width");
        const hAttr = svgEl.getAttribute("height");
        
        if (wAttr && !wAttr.includes('%')) w = parseFloat(wAttr);
        else if (svgEl.viewBox.baseVal) w = svgEl.viewBox.baseVal.width;
        
        if (hAttr && !hAttr.includes('%')) h = parseFloat(hAttr);
        else if (svgEl.viewBox.baseVal) h = svgEl.viewBox.baseVal.height;

        if (!w || isNaN(w)) w = 600;
        if (!h || isNaN(h)) h = 600;

        setCanvasWidth(w);
        setCanvasHeight(h);

        svgEl.style.width = "100%";
        svgEl.style.height = "100%";
        svgEl.removeAttribute("width");
        svgEl.removeAttribute("height");
        
        if (!svgEl.hasAttribute("viewBox")) {
          svgEl.setAttribute("viewBox", `0 0 ${w} ${h}`);
        }

        updateLayers();
        saveState(); // Initial state
      }
    }
  }, [svgContent, updateLayers, saveState]);

  // Update viewBox when canvas dimensions change
  useEffect(() => {
    if (containerRef.current) {
      const svgEl = containerRef.current.querySelector("svg");
      if (svgEl) {
        const vb = svgEl.getAttribute("viewBox");
        if (vb) {
          const parts = vb.split(/[ ,]+/);
          if (parts.length === 4) {
            svgEl.setAttribute("viewBox", `${parts[0]} ${parts[1]} ${canvasWidth} ${canvasHeight}`);
          }
        } else {
          svgEl.setAttribute("viewBox", `0 0 ${canvasWidth} ${canvasHeight}`);
        }
      }
    }
  }, [canvasWidth, canvasHeight]);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0 && containerRef.current) {
      historyIndexRef.current -= 1;
      const targetState = historyRef.current[historyIndexRef.current];
      containerRef.current.innerHTML = targetState;
      setHistoryIndex(historyIndexRef.current);
      setSelectedElements([]);
      updateLayers();
      setContextMenu(null);
    }
  }, [updateLayers]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1 && containerRef.current) {
      historyIndexRef.current += 1;
      const targetState = historyRef.current[historyIndexRef.current];
      containerRef.current.innerHTML = targetState;
      setHistoryIndex(historyIndexRef.current);
      setSelectedElements([]);
      updateLayers();
      setContextMenu(null);
    }
  }, [updateLayers]);

  // Zoom interactions
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey || true) {
        e.preventDefault();
        const zoomDelta = e.deltaY * -0.002;
        setZoom(prev => Math.min(Math.max(0.1, prev + zoomDelta), 10));
      }
    };
    
    const workspace = workspaceRef.current;
    if (workspace) {
      workspace.addEventListener("wheel", handleWheel, { passive: false });
    }
    return () => {
      if (workspace) {
        workspace.removeEventListener("wheel", handleWheel);
      }
    };
  }, []);

  // Group function
  const handleGroup = useCallback(() => {
    if (selectedElements.length < 1) return;
    const svgEl = containerRef.current?.querySelector("svg");
    if (!svgEl) return;

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const firstEl = selectedElements[0];
    firstEl.parentNode?.insertBefore(group, firstEl);

    selectedElements.forEach(el => {
      group.appendChild(el);
      el.classList.remove("editor-selected");
      el.style.outline = "";
    });

    group.classList.add("editor-selected");
    group.style.outline = "2px dashed #3b82f6";
    group.style.outlineOffset = "2px";

    setSelectedElements([group]);
    updateLayers();
    setContextMenu(null);
    saveState();
  }, [selectedElements, updateLayers, saveState]);

  // Delete function
  const handleDelete = useCallback(() => {
    if (selectedElements.length === 0) return;
    selectedElements.forEach(el => {
      el.remove();
    });
    setSelectedElements([]);
    updateLayers();
    setContextMenu(null);
    saveState();
  }, [selectedElements, updateLayers, saveState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setZoom(prev => Math.min(prev + 0.2, 10));
        } else if (e.key === '-') {
          e.preventDefault();
          setZoom(prev => Math.max(prev - 0.2, 0.1));
        } else if (e.key === '0') {
          e.preventDefault();
          setZoom(1);
        } else if (e.key.toLowerCase() === 'g') {
          e.preventDefault();
          handleGroup();
        } else if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          handleRedo();
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          handleDelete();
        }
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        if ((e.target as HTMLElement).tagName !== 'INPUT') {
          e.preventDefault();
          handleDelete();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGroup, handleDelete, handleUndo, handleRedo]);

  const selectElement = (target: SVGElement | null, multi: boolean = false) => {
    let newSelection = [...selectedElements];
    if (target) {
      if (multi) {
        if (newSelection.includes(target)) {
          newSelection = newSelection.filter(el => el !== target);
        } else {
          newSelection.push(target);
        }
      } else {
        newSelection = [target];
      }
    } else {
      newSelection = [];
    }
    applySelectionStyles(newSelection);
    setSelectedElements(newSelection);
  };

  // Workspace mouse interactions (Click, Drag Select, Context Menu)
  const handleWorkspaceMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) return; // handle context menu separately
    if (contextMenu) setContextMenu(null);

    const target = e.target as SVGElement;
    const isSvgShape = ["path", "rect", "circle", "ellipse", "polygon", "polyline", "line", "g"].includes(target.tagName.toLowerCase());
    
    if (isSvgShape && containerRef.current?.contains(target)) {
      let selectable = target;
      // Find highest level group that is not svg
      while (selectable.parentElement && selectable.parentElement.tagName !== 'svg' && selectable.parentElement.tagName === 'g') {
        selectable = selectable.parentElement as unknown as SVGElement;
      }
      
      const isMultiSelect = e.shiftKey || e.metaKey || e.ctrlKey;
      
      let newSelection = selectedElements;
      if (selectedElements.includes(selectable) && !isMultiSelect) {
        // Already selected, do nothing to selection, just start moving
      } else {
        newSelection = isMultiSelect 
          ? (selectedElements.includes(selectable) ? selectedElements.filter(el => el !== selectable) : [...selectedElements, selectable])
          : [selectable];
        applySelectionStyles(newSelection);
        setSelectedElements(newSelection);
      }
      
      if (newSelection.includes(selectable)) {
        setIsMoving(true);
        setMoveStartPos({ x: e.clientX, y: e.clientY });
        const map = new Map();
        newSelection.forEach(el => {
          const t = parseElementTransform(el);
          map.set(el, { tx: t.tx, ty: t.ty, rot: t.rot, s: t.sx });
        });
        initialTransformsRef.current = map;
      }
    } else {
      setIsDragging(true);
      setStartPos({ x: e.clientX, y: e.clientY });
      setCurrentPos({ x: e.clientX, y: e.clientY });
      if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
        selectElement(null);
      }
    }
  };

  const [isResizingCanvas, setIsResizingCanvas] = useState<{active: boolean, dir: string, startX: number, startY: number, startW: number, startH: number}>({
    active: false, dir: '', startX: 0, startY: 0, startW: 0, startH: 0
  });

  const handleCanvasResizeStart = (e: React.MouseEvent, dir: string) => {
    e.stopPropagation();
    setIsResizingCanvas({
      active: true,
      dir,
      startX: e.clientX,
      startY: e.clientY,
      startW: canvasWidth,
      startH: canvasHeight
    });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // Move elements and Resize Canvas effect
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isResizingCanvas.active) {
        const dx = (e.clientX - isResizingCanvas.startX) / zoom;
        const dy = (e.clientY - isResizingCanvas.startY) / zoom;
        
        if (isResizingCanvas.dir.includes('right')) {
          setCanvasWidth(Math.max(10, Math.round(isResizingCanvas.startW + dx)));
        }
        if (isResizingCanvas.dir.includes('bottom')) {
          setCanvasHeight(Math.max(10, Math.round(isResizingCanvas.startH + dy)));
        }
      } else if (isMoving) {
        const dx = (e.clientX - moveStartPos.x) / zoom;
        const dy = (e.clientY - moveStartPos.y) / zoom;
        
        selectedElements.forEach(el => {
          const initial = initialTransformsRef.current.get(el);
          if (initial) {
            applyTransform(el, initial.tx + dx, initial.ty + dy, initial.rot, initial.s);
          }
        });
      }
    };

    const handleGlobalMouseUp = () => {
      if (isResizingCanvas.active) {
        setIsResizingCanvas(prev => ({ ...prev, active: false }));
        saveStateDebounced();
      }
      if (isMoving) {
        setIsMoving(false);
        saveStateDebounced();
      }
    };

    if (isMoving || isResizingCanvas.active) {
      window.addEventListener("mousemove", handleGlobalMouseMove);
      window.addEventListener("mouseup", handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isMoving, moveStartPos, zoom, selectedElements, saveStateDebounced, applyTransform, isResizingCanvas]);

  // Drag selection effect
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setCurrentPos({ x: e.clientX, y: e.clientY });
        
        const boxLeft = Math.min(startPos.x, e.clientX);
        const boxRight = Math.max(startPos.x, e.clientX);
        const boxTop = Math.min(startPos.y, e.clientY);
        const boxBottom = Math.max(startPos.y, e.clientY);

        const newSelection = layers.filter(layer => {
          if (layer.getAttribute('data-hidden') === 'true') return false;
          const rect = layer.getBoundingClientRect();
          return !(rect.right < boxLeft || rect.left > boxRight || rect.bottom < boxTop || rect.top > boxBottom);
        });

        applySelectionStyles(newSelection);
        setSelectedElements(newSelection);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleGlobalMouseMove);
      window.addEventListener("mouseup", handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging, startPos, layers]);

  // Update property panel when selection changes
  useEffect(() => {
    if (selectedElements.length === 1) {
      const target = selectedElements[0];
      setFillColor(target.getAttribute("fill") || target.style.fill || "none");
      setOpacity(parseFloat(target.getAttribute("opacity") || target.style.opacity || "1"));
      setStrokeColor(target.getAttribute("stroke") || target.style.stroke || "none");
      setStrokeWidth(parseFloat(target.getAttribute("stroke-width") || target.style.strokeWidth || "0"));
      
      const t = parseElementTransform(target);
      setRotation(t.rot);
      setScale(t.sx);

      if (target.tagName.toLowerCase() === "rect") {
        setBorderRadius(parseFloat(target.getAttribute("rx") || "0"));
      } else {
        setBorderRadius(0);
      }
    } else if (selectedElements.length > 1) {
      setFillColor("");
      setStrokeColor("");
    }
  }, [selectedElements, parseElementTransform]);

  const updateElementAttribute = (attr: string, value: string) => {
    selectedElements.forEach(el => {
      el.setAttribute(attr, value);
      if ((el.style as any)[attr]) {
        (el.style as any)[attr] = "";
      }
    });
  };

  const handleFillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFillColor(val);
    updateElementAttribute("fill", val);
    saveStateDebounced();
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setOpacity(val);
    updateElementAttribute("opacity", val.toString());
    saveStateDebounced();
  };

  const handleStrokeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStrokeColor(val);
    updateElementAttribute("stroke", val);
    saveStateDebounced();
  };

  const handleStrokeWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setStrokeWidth(val);
    updateElementAttribute("stroke-width", val.toString());
    saveStateDebounced();
  };

  const handleRotationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setRotation(val);
    selectedElements.forEach(el => {
      const t = parseElementTransform(el);
      applyTransform(el, t.tx, t.ty, val, t.sx);
    });
    saveStateDebounced();
  };

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setScale(val);
    selectedElements.forEach(el => {
      const t = parseElementTransform(el);
      applyTransform(el, t.tx, t.ty, t.rot, val);
    });
    saveStateDebounced();
  };

  const handleBorderRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setBorderRadius(val);
    selectedElements.forEach(el => {
      if (el.tagName.toLowerCase() === "rect") {
        el.setAttribute("rx", val.toString());
        el.setAttribute("ry", val.toString());
      }
    });
    saveStateDebounced();
  };

  const toggleVisibility = (layer: SVGElement, e: React.MouseEvent) => {
    e.stopPropagation();
    const isHidden = layer.getAttribute('data-hidden') === 'true';
    if (isHidden) {
      layer.removeAttribute('data-hidden');
      layer.style.visibility = 'visible';
    } else {
      layer.setAttribute('data-hidden', 'true');
      layer.style.visibility = 'hidden';
      // Deselect if hidden
      if (selectedElements.includes(layer)) {
        selectElement(layer, true); 
      }
    }
    setLayers([...layers]);
    saveState();
  };

  const handleDownload = () => {
    if (containerRef.current) {
      selectedElements.forEach(el => {
        el.style.outline = "";
        el.style.outlineOffset = "";
      });
      
      const svgEl = containerRef.current.querySelector("svg");
      if (svgEl) {
        svgEl.setAttribute("width", canvasWidth.toString());
        svgEl.setAttribute("height", canvasHeight.toString());
        const svgString = svgEl.outerHTML;
        svgEl.removeAttribute("width");
        svgEl.removeAttribute("height");
        
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
      
      applySelectionStyles(selectedElements);
    }
  };

  const toHex = (color: string) => {
    if (color.startsWith("#")) return color.substring(0, 7);
    return "#000000"; 
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-slate-100 flex flex-col h-screen w-screen overflow-hidden text-slate-900"
      onClick={() => contextMenu && setContextMenu(null)}
    >
      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed bg-white border border-slate-200 shadow-xl rounded-lg py-1 z-[200] min-w-[180px] overflow-hidden"
          style={{ top: Math.min(contextMenu.y, window.innerHeight - 100), left: Math.min(contextMenu.x, window.innerWidth - 200) }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 text-slate-700 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={(e) => { e.stopPropagation(); handleUndo(); }}
            disabled={historyIndex <= 0}
          >
            <span className="flex items-center gap-2"><Undo2 className="w-4 h-4" /> 撤销 (Undo)</span>
            <span className="text-xs text-slate-400">⌘ Z</span>
          </button>
          <button 
            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 text-slate-700 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={(e) => { e.stopPropagation(); handleRedo(); }}
            disabled={historyIndex >= history.length - 1}
          >
            <span className="flex items-center gap-2"><Redo2 className="w-4 h-4" /> 重做 (Redo)</span>
            <span className="text-xs text-slate-400">⇧⌘ Z</span>
          </button>
          
          <div className="h-[1px] bg-slate-100 my-1"></div>

          <button 
            className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 text-slate-700 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={(e) => { e.stopPropagation(); handleGroup(); }}
            disabled={selectedElements.length < 1}
          >
            <span className="flex items-center gap-2"><Folder className="w-4 h-4" /> 打组 (Group)</span>
            <span className="text-xs text-slate-400">⌘ G</span>
          </button>
          <div className="h-[1px] bg-slate-100 my-1"></div>
          <button 
            className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            disabled={selectedElements.length === 0}
          >
            <span className="flex items-center gap-2"><Trash2 className="w-4 h-4" /> 删除 (Delete)</span>
            <span className="text-xs text-red-300">⌘ Del</span>
          </button>
        </div>
      )}

      {/* Box Selection Overlay */}
      {isDragging && (
        <div 
          className="fixed border border-blue-500 bg-blue-500/20 z-[150] pointer-events-none"
          style={{
            left: Math.min(startPos.x, currentPos.x),
            top: Math.min(startPos.y, currentPos.y),
            width: Math.abs(currentPos.x - startPos.x),
            height: Math.abs(currentPos.y - startPos.y),
          }}
        />
      )}

      {/* Top Navbar */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 shadow-sm z-10 relative">
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
        
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg mr-4">
            <button 
              onClick={handleUndo} 
              disabled={historyIndex <= 0}
              className="p-1.5 text-slate-600 hover:bg-white rounded shadow-sm disabled:opacity-30 disabled:shadow-none disabled:hover:bg-transparent transition-all"
              title="撤销 (Cmd/Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button 
              onClick={handleRedo} 
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 text-slate-600 hover:bg-white rounded shadow-sm disabled:opacity-30 disabled:shadow-none disabled:hover:bg-transparent transition-all"
              title="重做 (Cmd/Ctrl+Shift+Z)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm shadow-sm"
          >
            <Download className="w-4 h-4" />
            导出 SVG
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Layers) */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 z-10 shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
          <div className="h-12 border-b border-slate-100 flex items-center px-4 gap-2 text-slate-800 font-semibold text-sm shrink-0">
            <LayoutPanelLeft className="w-4 h-4 text-slate-500" />
            图层 (Layers)
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {layers.map((layer, idx) => {
              const isHidden = layer.getAttribute('data-hidden') === 'true';
              return (
                <div 
                  key={idx} 
                  className={`flex items-center justify-between px-3 py-2.5 text-sm rounded-lg cursor-pointer mb-0.5 transition-colors select-none group ${
                    selectedElements.includes(layer)
                      ? 'bg-blue-50 text-blue-700 font-medium' 
                      : 'hover:bg-slate-50 text-slate-600'
                  } ${isHidden ? 'opacity-50' : ''}`}
                  onClick={(e) => selectElement(layer, e.shiftKey || e.metaKey || e.ctrlKey)}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div 
                      className="w-4 h-4 rounded-sm border shrink-0 opacity-80 flex items-center justify-center"
                      style={{ 
                        backgroundColor: layer.getAttribute('fill') !== 'none' ? (layer.getAttribute('fill') || '#000') : 'transparent',
                        borderColor: layer.getAttribute('stroke') !== 'none' ? (layer.getAttribute('stroke') || '#ccc') : '#ccc',
                      }}
                    >
                      {layer.tagName.toLowerCase() === 'g' && <Folder className="w-3 h-3 text-white mix-blend-difference" />}
                    </div>
                    <span className="capitalize truncate">{layer.tagName.toLowerCase()} {layers.length - idx}</span>
                  </div>
                  <button 
                    onClick={(e) => toggleVisibility(layer, e)}
                    className="p-1 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}
            {layers.length === 0 && (
              <div className="text-xs text-slate-400 text-center mt-10">
                未检测到可编辑图层
              </div>
            )}
          </div>
        </aside>

        {/* Center Canvas */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-[url('/checkers.svg')] bg-repeat" onContextMenu={handleContextMenu}>
          <div ref={workspaceRef} className="absolute inset-0 overflow-auto flex items-center justify-center p-8">
            <div 
              className="bg-white shadow-md relative flex items-center justify-center transition-transform origin-center"
              style={{ 
                transform: `scale(${zoom})`,
                width: `${canvasWidth}px`,
                height: `${canvasHeight}px`
              }}
              onMouseDown={handleWorkspaceMouseDown}
            >
              <div ref={containerRef} className="w-full h-full pointer-events-auto overflow-hidden" />
              
              {/* Resize Handles */}
              {selectedElements.length === 0 && (
                <>
                  <div 
                    className="absolute top-0 -right-2 w-4 h-full cursor-ew-resize group z-10 flex justify-center"
                    onMouseDown={(e) => handleCanvasResizeStart(e, 'right')}
                  >
                    <div className="w-0.5 h-full bg-blue-500 opacity-0 group-hover:opacity-100"></div>
                  </div>
                  <div 
                    className="absolute -bottom-2 left-0 w-full h-4 cursor-ns-resize group z-10 flex items-center justify-center"
                    onMouseDown={(e) => handleCanvasResizeStart(e, 'bottom')}
                  >
                    <div className="w-full h-0.5 bg-blue-500 opacity-0 group-hover:opacity-100"></div>
                  </div>
                  <div 
                    className="absolute -bottom-2 -right-2 w-4 h-4 cursor-nwse-resize group z-10 flex items-center justify-center"
                    onMouseDown={(e) => handleCanvasResizeStart(e, 'bottom-right')}
                  >
                    <div className="w-2 h-2 bg-blue-500 opacity-0 group-hover:opacity-100 rounded-full mt-1 ml-1"></div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Canvas Controls overlay */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-slate-200 text-xs font-medium text-slate-600 flex items-center gap-2 pointer-events-none">
            <MousePointer2 className="w-3 h-3" />
            支持拖拽框选、右键菜单、以及图层打组/隐藏
          </div>

          {/* Zoom Controls */}
          <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full shadow-sm border border-slate-200 text-xs font-medium text-slate-600 flex items-center gap-3 z-10">
            <button 
              onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.1))} 
              className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-slate-800" 
              title="缩小 (Cmd/Ctrl + -)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input 
              type="range" 
              min="0.1" max="5" step="0.01" 
              value={zoom} 
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-24 accent-blue-600"
            />
            <span className="w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <button 
              onClick={() => setZoom(prev => Math.min(prev + 0.1, 10))} 
              className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-slate-800" 
              title="放大 (Cmd/Ctrl + +)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setZoom(1)} 
              className="px-2 py-1 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-slate-800 border-l border-slate-200 ml-1" 
              title="重置缩放 (Cmd/Ctrl + 0)"
            >
              重置
            </button>
          </div>
        </main>

        {/* Right Sidebar (Properties) */}
        <aside className="w-72 bg-white border-l border-slate-200 flex flex-col shrink-0 z-10 shadow-[-1px_0_10px_rgba(0,0,0,0.02)]">
          <div className="h-12 border-b border-slate-100 flex items-center px-4 font-semibold text-slate-800 text-sm shrink-0">
            属性 (Properties)
          </div>
          
          <div className="flex-1 overflow-y-auto p-5">
            {selectedElements.length === 0 ? (
              <div className="flex flex-col gap-6">
                <div className="text-xs font-semibold px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-md self-start font-mono">
                  画布 (Canvas)
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">宽度 (Width)</label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="number" 
                      value={canvasWidth}
                      onChange={(e) => {
                        setCanvasWidth(Math.max(10, parseInt(e.target.value) || 0));
                        saveStateDebounced();
                      }}
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                    <span className="text-slate-500 text-sm">px</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">高度 (Height)</label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="number" 
                      value={canvasHeight}
                      onChange={(e) => {
                        setCanvasHeight(Math.max(10, parseInt(e.target.value) || 0));
                        saveStateDebounced();
                      }}
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                    <span className="text-slate-500 text-sm">px</span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 mt-4 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <strong className="text-slate-600 block mb-1">提示：</strong>
                  • 你可以直接在中间画布区域的边缘拖动来改变大小。<br/>
                  • 点击图层列表或画布中的图形，即可开始编辑元素属性。
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="text-xs font-semibold px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-md self-start font-mono">
                  {selectedElements.length === 1 
                    ? `<${selectedElements[0].tagName.toLowerCase()}>` 
                    : `已选中 ${selectedElements.length} 个元素`}
                </div>

                {/* Transform properties */}
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                    <span>旋转 (Rotation)</span>
                    <span className="text-slate-700 bg-slate-100 px-1.5 rounded">{rotation}°</span>
                  </label>
                  <input 
                    type="range" 
                    min="-180" max="180" step="1" 
                    value={rotation} 
                    onChange={handleRotationChange}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                    <span>缩放 (Scale)</span>
                    <span className="text-slate-700 bg-slate-100 px-1.5 rounded">{Math.round(scale * 100)}%</span>
                  </label>
                  <input 
                    type="range" 
                    min="0.1" max="5" step="0.1" 
                    value={scale} 
                    onChange={handleScaleChange}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div className="h-[1px] bg-slate-100 w-full"></div>

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

                {selectedElements.length === 1 && selectedElements[0].tagName.toLowerCase() === "rect" && (
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