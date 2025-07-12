'use client';

import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from './ui/button';
import { Eraser, Save, Loader2 } from 'lucide-react';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  isSaving: boolean;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, isSaving }) => {
  const sigCanvas = useRef<SignatureCanvas>(null);

  const clear = () => {
    sigCanvas.current?.clear();
  };

  const save = () => {
    if (sigCanvas.current) {
      const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-md bg-background">
        <SignatureCanvas
          ref={sigCanvas}
          penColor="black"
          canvasProps={{
            className: 'w-full h-48 rounded-md',
          }}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={clear} disabled={isSaving}>
          <Eraser className="mr-2 h-4 w-4" />
          Clear
        </Button>
        <Button onClick={save} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Signature
        </Button>
      </div>
    </div>
  );
};

export default SignaturePad;
