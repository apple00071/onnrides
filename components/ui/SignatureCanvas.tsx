'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SignatureCanvasProps {
  onChange?: (dataUrl: string | null) => void;
  initialValue?: string | null;
  className?: string;
  height?: number;
  width?: number;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  instructionText?: string;
  errorMessage?: string;
}

export function SignatureCanvas({
  onChange,
  initialValue = null,
  className = '',
  height = 200,
  width = 0, // 0 means full width of container
  label = 'Signature',
  required = false,
  disabled = false,
  instructionText = 'Sign above by dragging your cursor or finger',
  errorMessage = 'Please provide a signature'
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!initialValue);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(initialValue);
  const [showError, setShowError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || ('ontouchstart' in window));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // Setup canvas and restore any saved signature
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prepareCanvas = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (width === 0 && containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
      } else {
        canvas.width = width;
      }

      const mobileAdjustedHeight = isMobile ? Math.min(height, 150) : height;
      canvas.height = mobileAdjustedHeight;

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.beginPath();
      ctx.moveTo(10, canvas.height - 30);
      ctx.lineTo(canvas.width - 10, canvas.height - 30);
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (signatureData) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setIsEmpty(false);
        };
        img.src = signatureData;
      } else {
        setIsEmpty(true);
      }
    };

    prepareCanvas();

    const handleResize = () => {
      if (width === 0) {
        prepareCanvas();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [height, width, signatureData, isMobile]);

  const startDrawing = (e: any) => {
    if (disabled) return;
    setHasInteracted(true);
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.lineWidth = isMobile ? 2 : 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'black';

    const { x, y } = getCoordinates(e, canvas);
    ctx.moveTo(x, y);
    if (showError) setShowError(false);
  };

  const draw = (e: any) => {
    if (!isDrawing || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if ('touches' in e) {
      e.preventDefault();
    }

    const { x, y } = getCoordinates(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (isEmpty) setIsEmpty(false);
  };

  const endDrawing = () => {
    if (disabled) return;
    setIsDrawing(false);
    if (!isEmpty && onChange && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      setSignatureData(dataUrl);
      onChange(dataUrl);
    }
    if (required && isEmpty) {
      setShowError(true);
    }
  };

  const clearCanvas = () => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.moveTo(10, canvas.height - 30);
    ctx.lineTo(canvas.width - 10, canvas.height - 30);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.stroke();

    setIsEmpty(true);
    setSignatureData(null);
    if (onChange) onChange(null);
    setShowError(false);
  };

  return (
    <div className={cn("space-y-1 sm:space-y-2", className)} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs sm:text-sm font-medium">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearCanvas}
            disabled={disabled || isEmpty}
            className="text-xs h-7 px-2 py-0"
          >
            Clear
          </Button>
        </div>
      )}

      <div
        className={cn(
          "relative rounded-md border bg-white touch-none",
          showError ? "border-red-500" : "border-gray-300",
          disabled ? "opacity-60 cursor-not-allowed" : "",
        )}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
          className={cn(
            "block w-full rounded-md",
            disabled ? "cursor-not-allowed" : "cursor-crosshair"
          )}
          style={{ touchAction: 'none' }}
        />

        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-400 text-xs sm:text-sm px-3 text-center select-none">
              {instructionText}
            </p>
          </div>
        )}
      </div>

      {showError && errorMessage && (
        <p className="text-red-500 text-xs mt-1">{errorMessage}</p>
      )}
    </div>
  );
}
