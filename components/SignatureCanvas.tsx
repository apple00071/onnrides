'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Undo2, Trash2 } from 'lucide-react';

interface SignatureCanvasProps {
  initialValue?: string | null;
  onChange: (dataUrl: string | null) => void;
  required?: boolean;
  instructionText?: string;
  errorMessage?: string;
  canvasWidth?: number;
  canvasHeight?: number;
}

export function SignatureCanvas({
  initialValue = null,
  onChange,
  required = false,
  instructionText = 'Sign here',
  errorMessage = 'Signature is required',
  canvasWidth = 400,
  canvasHeight = 200
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  const [hasSignature, setHasSignature] = useState(false);
  const [showError, setShowError] = useState(false);
  
  // Initialize canvas with proper DPI handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Get device pixel ratio
        const dpr = window.devicePixelRatio || 1;
        
        // Set canvas size accounting for DPI
        canvas.width = canvasWidth * dpr;
        canvas.height = canvasHeight * dpr;
        
        // Scale context to match DPI
        ctx.scale(dpr, dpr);
        
        // Set drawing styles
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#000000';
        
        // Enable line smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // If we have an initial value, draw it on the canvas
        if (initialValue) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
            setHasSignature(true);
          };
          img.src = initialValue;
        }
      }
    }
  }, [initialValue, canvasWidth, canvasHeight]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    let clientX = 0;
    let clientY = 0;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width / dpr),
      y: (clientY - rect.top) * (canvas.height / rect.height / dpr)
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setShowError(false);
    
    const coords = getCoordinates(e);
    setLastPosition(coords);
    
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const coords = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    
    if (ctx) {
      // Use quadratic curves for smoother lines
      const midPoint = {
        x: (lastPosition.x + coords.x) / 2,
        y: (lastPosition.y + coords.y) / 2
      };
      
      ctx.quadraticCurveTo(lastPosition.x, lastPosition.y, midPoint.x, midPoint.y);
      ctx.stroke();
      setHasSignature(true);
    }
    
    setLastPosition(coords);
  };
  
  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveSignature();
    }
  };
  
  const handleMouseLeave = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveSignature();
    }
  };
  
  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
    }
  };
  
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
        onChange(null);
      }
    }
  };
  
  const validate = () => {
    if (required && !hasSignature) {
      setShowError(true);
      return false;
    }
    return true;
  };

  return (
    <div className="w-full flex flex-col items-center">
      <Card className="border p-1 w-full">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="border border-gray-300 bg-white w-full cursor-crosshair touch-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        />
      </Card>
      
      {showError && required && !hasSignature && (
        <div className="text-red-500 text-sm mt-1">{errorMessage}</div>
      )}
      
      <div className="mt-2 flex justify-between w-full">
        <p className="text-sm text-gray-500 self-center">{instructionText}</p>
        <div className="flex space-x-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearSignature}
            title="Clear signature"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
} 