'use client';

import React, { useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from './button';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  width?: number;
  height?: number;
}

export function SignaturePad({ onSave, width = 500, height = 200 }: SignaturePadProps) {
  const signaturePadRef = useRef<SignatureCanvas>(null);

  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
    }
  };

  const handleSave = () => {
    if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
      const dataUrl = signaturePadRef.current.toDataURL();
      onSave(dataUrl);
    }
  };

  useEffect(() => {
    // Clear signature pad on mount
    handleClear();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="border rounded-lg overflow-hidden">
        <SignatureCanvas
          ref={signaturePadRef}
          canvasProps={{
            width,
            height,
            className: 'signature-canvas bg-white',
            style: { width: '100%', height: '100%' }
          }}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleClear} type="button">
          Clear
        </Button>
        <Button onClick={handleSave} type="button">
          Save Signature
        </Button>
      </div>
    </div>
  );
} 