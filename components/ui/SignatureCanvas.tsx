'use client';

import React, { useRef, useEffect, useState } from 'react';
import SignaturePad from 'signature_pad';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface SignatureCanvasProps {
  initialValue?: string | null;
  onChange: (dataUrl: string | null) => void;
  required?: boolean;
  instructionText?: string;
  errorMessage?: string;
  className?: string;
}

export function SignatureCanvas({
  initialValue,
  onChange,
  required = false,
  instructionText = 'Sign here',
  errorMessage = 'Signature is required',
  className
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    ctx.scale(ratio, ratio);

    // Initialize SignaturePad
    signaturePadRef.current = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)'
    });

    // Load initial value if provided
    if (initialValue) {
      signaturePadRef.current.fromDataURL(initialValue);
    }

    // Cleanup
    return () => {
      if (signaturePadRef.current) {
        signaturePadRef.current.off();
      }
    };
  }, [initialValue]);

  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      onChange(null);
      setError(null);
    }
  };

  const handleSave = () => {
    if (signaturePadRef.current) {
      if (required && signaturePadRef.current.isEmpty()) {
        setError(errorMessage);
        return;
      }
      const dataUrl = signaturePadRef.current.toDataURL();
      onChange(dataUrl);
      setError(null);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="border rounded-lg p-4 bg-white">
        <canvas
          ref={canvasRef}
          className="w-full h-40 border rounded touch-none"
          style={{ touchAction: 'none' }}
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm text-gray-500">{instructionText}</p>
          <div className="space-x-2">
            <Button type="button" variant="outline" size="sm" onClick={handleClear}>
              Clear
            </Button>
            <Button type="button" size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
} 