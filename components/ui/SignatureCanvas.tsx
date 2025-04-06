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
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    setIsMobile(window.innerWidth < 768 || ('ontouchstart' in window));
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768 || ('ontouchstart' in window));
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Setup canvas and restore any saved signature
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Clear and prepare canvas
    const prepareCanvas = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas dimensions based on container width if width is 0
      if (width === 0 && containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
      } else {
        canvas.width = width;
      }
      
      // Adjust height for mobile devices
      const mobileAdjustedHeight = isMobile ? Math.min(height, 150) : height;
      canvas.height = mobileAdjustedHeight;

      // Clear canvas with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw signature guide line
      ctx.beginPath();
      ctx.moveTo(10, canvas.height - 30);
      ctx.lineTo(canvas.width - 10, canvas.height - 30);
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Restore signature if one exists
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

    // Handle window resize
    const handleResize = () => {
      if (width === 0) {
        prepareCanvas();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [height, width, signatureData, isMobile]);

  // Handle drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    
    setHasInteracted(true);
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.lineWidth = isMobile ? 2 : 3; // Thinner lines on mobile for precision
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'black';
    
    // Get correct position whether mouse or touch
    if ('touches' in e) {
      e.preventDefault(); // Prevent scrolling when drawing
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    } else {
      ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get position based on event type
    if ('touches' in e) {
      e.preventDefault(); // Prevent scrolling when drawing
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    } else {
      ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    }
    
    ctx.stroke();
    setIsEmpty(false);
  };

  const stopDrawing = () => {
    if (disabled) return;
    
    setIsDrawing(false);
    
    if (!isEmpty) {
      // Save the signature as data URL
      const canvas = canvasRef.current;
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        setSignatureData(dataUrl);
        if (onChange) onChange(dataUrl);
      }
    }
  };

  const clearSignature = () => {
    if (disabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Redraw the signature line
    ctx.beginPath();
    ctx.moveTo(10, canvas.height - 30);
    ctx.lineTo(canvas.width - 10, canvas.height - 30);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Update states
    setIsEmpty(true);
    setSignatureData(null);
    if (onChange) onChange(null);
  };

  // Determine if we should show an error
  const showError = required && isEmpty && hasInteracted;

  return (
    <div className={cn("space-y-1 sm:space-y-2", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs sm:text-sm font-medium">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={clearSignature}
            disabled={disabled || isEmpty}
            className={cn(
              "text-xs h-7",
              isMobile ? "px-2 py-0" : "py-1"
            )}
          >
            Clear
          </Button>
        </div>
      )}
      
      <div 
        ref={containerRef}
        className={cn(
          "relative rounded-md border", 
          showError ? "border-red-500" : "border-gray-300",
          disabled ? "opacity-60 cursor-not-allowed" : "",
          className
        )}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={cn(
            "touch-none select-none rounded-md w-full",
            disabled ? "cursor-not-allowed" : "cursor-crosshair"
          )}
          style={{ backgroundColor: 'white' }}
        />
        
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-400 text-xs sm:text-sm px-3 text-center">
              {isMobile ? "Sign here with your finger" : instructionText}
            </p>
          </div>
        )}
      </div>
      
      {showError && (
        <p className="text-red-500 text-xs mt-1">{errorMessage}</p>
      )}
      
      {isMobile && (
        <p className="text-xs text-gray-500 mt-1">
          For best results, hold your device in landscape orientation.
        </p>
      )}
    </div>
  );
} 