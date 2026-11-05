'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Sun,
  Contrast,
  Pencil,
  Type,
  Check,
  X,
  Crop,
  Undo,
} from 'lucide-react';

interface PhotoEditorModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onSave: (newImageUrl: string) => void;
}

export function PhotoEditorModal({
  isOpen,
  imageUrl,
  onClose,
  onSave,
}: PhotoEditorModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrastVal, setContrastVal] = useState(100);
  const [activeTool, setActiveTool] = useState<'none' | 'draw' | 'text'>('none');
  const [drawColor, setDrawColor] = useState('#ef4444');
  const [lineWidth, setLineWidth] = useState(4);
  const [textInput, setTextInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDrawing = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const baseImageRef = useRef<HTMLImageElement | null>(null);

  // Load image on open
  useEffect(() => {
    if (!isOpen || !imageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      baseImageRef.current = img;
      renderCanvas();
    };
    img.onerror = () => {
      setError('Failed to load image for editing.');
    };
  }, [isOpen, imageUrl]);

  // Re-render when transformations change
  useEffect(() => {
    if (baseImageRef.current) {
      renderCanvas();
    }
  }, [rotation, flipH, flipV, brightness, contrastVal]);

  function renderCanvas() {
    const canvas = canvasRef.current;
    const img = baseImageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isRotated90 = Math.abs(rotation % 180) === 90;
    const targetWidth = isRotated90 ? img.naturalHeight : img.naturalWidth;
    const targetHeight = isRotated90 ? img.naturalWidth : img.naturalHeight;

    canvas.width = Math.min(targetWidth, 1200);
    canvas.height = (targetHeight / targetWidth) * canvas.width;

    ctx.save();
    ctx.filter = `brightness(${brightness}%) contrast(${contrastVal}%)`;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    const drawW = isRotated90 ? canvas.height : canvas.width;
    const drawH = isRotated90 ? canvas.width : canvas.height;
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }

  // Drawing handler
  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (activeTool !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    isDrawing.current = true;
    lastX.current = (e.clientX - rect.left) * scaleX;
    lastY.current = (e.clientY - rect.top) * scaleY;
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing.current || activeTool !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    ctx.strokeStyle = drawColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lastX.current, lastY.current);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    lastX.current = currentX;
    lastY.current = currentY;
  }

  function handleMouseUp() {
    isDrawing.current = false;
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (activeTool !== 'text' || !textInput.trim()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillStyle = drawColor;
    ctx.fillText(textInput.trim(), x, y);
    setTextInput('');
  }

  // Save modified canvas as a new image to storage
  async function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setSaving(true);
    setError(null);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setError('Failed to export canvas');
        setSaving(false);
        return;
      }

      try {
        const formData = new FormData();
        const filename = `edited-${Date.now()}.png`;
        formData.append('file', blob, filename);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.url) {
          onSave(data.url);
          onClose();
        } else {
          setError(data.error || 'Failed to upload edited photo');
        }
      } catch {
        setError('Network error while saving photo');
      } finally {
        setSaving(false);
      }
    }, 'image/png');
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-emerald-600" />
            <h3 className="font-display text-lg font-bold text-slate-900">
              Photo &amp; Diagram Editor
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 text-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Rotate & Flip */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setRotation((r) => r - 90)}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
              title="Rotate Left 90°"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setRotation((r) => r + 90)}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
              title="Rotate Right 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setFlipH((f) => !f)}
              className={`p-2 rounded-xl border transition-colors ${
                flipH ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Flip Horizontal"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setFlipV((f) => !f)}
              className={`p-2 rounded-xl border transition-colors ${
                flipV ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Flip Vertical"
            >
              <FlipVertical className="w-4 h-4" />
            </button>
          </div>

          {/* Brightness & Contrast */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="range"
                min="50"
                max="180"
                value={brightness}
                onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                className="w-20 accent-emerald-600"
                title={`Brightness: ${brightness}%`}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Contrast className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="range"
                min="50"
                max="180"
                value={contrastVal}
                onChange={(e) => setContrastVal(parseInt(e.target.value, 10))}
                className="w-20 accent-emerald-600"
                title={`Contrast: ${contrastVal}%`}
              />
            </div>
          </div>

          {/* Annotations */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTool((t) => (t === 'draw' ? 'none' : 'draw'))}
              className={`p-2 rounded-xl border transition-colors flex items-center gap-1 ${
                activeTool === 'draw'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Draw Arrow / Mark"
            >
              <Pencil className="w-4 h-4" />
              <span>Draw</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTool((t) => (t === 'text' ? 'none' : 'text'))}
              className={`p-2 rounded-xl border transition-colors flex items-center gap-1 ${
                activeTool === 'text'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Add Text Label"
            >
              <Type className="w-4 h-4" />
              <span>Label</span>
            </button>

            {/* Color picker */}
            <input
              type="color"
              value={drawColor}
              onChange={(e) => setDrawColor(e.target.value)}
              className="w-7 h-7 rounded-lg border border-slate-200 cursor-pointer p-0.5"
              title="Annotation Color"
            />
          </div>
        </div>

        {/* Text Annotation input prompt */}
        {activeTool === 'text' && (
          <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center gap-3">
            <span className="text-xs font-semibold text-emerald-800">Text to place:</span>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="e.g. Danger zone / Check torque here"
              className="px-3 py-1 text-xs rounded-xl border border-emerald-300 focus:outline-none flex-1 bg-white"
            />
            <span className="text-[11px] text-emerald-700 font-medium">Click on image to stamp text</span>
          </div>
        )}

        {error && (
          <div className="mx-6 my-2 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Canvas view area */}
        <div className="flex-1 overflow-auto p-6 bg-slate-900 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleCanvasClick}
            className={`max-w-full max-h-[55vh] rounded-xl shadow-lg bg-black ${
              activeTool === 'draw' ? 'cursor-crosshair' : activeTool === 'text' ? 'cursor-text' : 'cursor-default'
            }`}
          />
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-white">
          <button
            type="button"
            onClick={() => {
              setRotation(0);
              setFlipH(false);
              setFlipV(false);
              setBrightness(100);
              setContrastVal(100);
              setActiveTool('none');
              if (baseImageRef.current) renderCanvas();
            }}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5"
          >
            <Undo className="w-3.5 h-3.5" />
            <span>Reset Edits</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm flex items-center gap-1.5 transition-all"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Image...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

