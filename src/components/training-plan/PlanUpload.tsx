'use client';

import { useState, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { showToast } from '@/components/ui/Toast';

interface PlanUploadProps {
  onExtracted: (data: unknown, type: 'plan' | 'session') => void;
}

export function PlanUpload({ onExtracted }: PlanUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<'plan' | 'session'>('plan');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', uploadType);

      const res = await fetch('/api/training-plan/ocr', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Errore upload');
      }

      const data = await res.json();
      onExtracted(data, uploadType);
      showToast('Dati estratti con successo!', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Errore estrazione', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <Card hover={false}>
      <div className="font-display text-base tracking-wide mb-1">Carica screenshot Runna</div>
      <div className="text-[0.72rem] text-muted mb-4">
        Carica una foto del piano settimanale o del dettaglio sessione dall&apos;app Runna
      </div>

      {/* Upload type toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setUploadType('plan')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
            uploadType === 'plan' ? 'border-accent text-accent bg-accent/5' : 'border-border text-muted'
          }`}
        >
          Piano settimanale
        </button>
        <button
          onClick={() => setUploadType('session')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
            uploadType === 'session' ? 'border-accent text-accent bg-accent/5' : 'border-border text-muted'
          }`}
        >
          Dettaglio sessione
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-accent/50 transition-colors"
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
            <span className="text-sm text-muted">Analisi in corso con Claude Vision...</span>
          </div>
        ) : preview ? (
          <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg mb-3" />
        ) : (
          <>
            <div className="text-3xl mb-3">📸</div>
            <p className="text-sm text-muted">
              Trascina qui lo screenshot o clicca per selezionare
            </p>
            <p className="text-xs text-muted/60 mt-1">JPG, PNG, WebP — max 10MB</p>
          </>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </Card>
  );
}
