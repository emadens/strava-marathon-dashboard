'use client';

import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { showToast } from '@/components/ui/Toast';

const OCR_COUNT_KEY = 'ocr_analysis_count';
const OCR_COST_KEY = 'ocr_total_cost';
const FREE_ANALYSES = 5;

interface PlanUploadProps {
  onExtracted: (data: unknown, type: 'plan' | 'session') => void;
}

export function PlanUpload({ onExtracted }: PlanUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<'plan' | 'session'>('plan');
  const [inputMode, setInputMode] = useState<'ocr' | 'manual'>('ocr');
  const [analysisCount, setAnalysisCount] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [costEstimate, setCostEstimate] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Manual form state
  const [manualDay, setManualDay] = useState('lunedi');
  const [manualType, setManualType] = useState('easy');
  const [manualKm, setManualKm] = useState('');
  const [manualPace, setManualPace] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualSessions, setManualSessions] = useState<Array<{
    dayOfWeek: string; type: string; distanceKm: number;
    targetPaceMinKm: string | null; intervals: string | null; notes: string | null; completed: boolean;
  }>>([]);

  useEffect(() => {
    setAnalysisCount(parseInt(localStorage.getItem(OCR_COUNT_KEY) || '0', 10));
    setTotalCost(parseFloat(localStorage.getItem(OCR_COST_KEY) || '0'));
  }, []);

  const handleFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // If over free limit, estimate cost and ask confirmation
    if (analysisCount >= FREE_ANALYSES) {
      setPendingFile(file);
      // Get cost estimate
      const formData = new FormData();
      formData.append('image', file);
      formData.append('estimate_only', 'true');
      try {
        const res = await fetch('/api/training-plan/ocr', { method: 'POST', body: formData });
        const { estimate } = await res.json();
        setCostEstimate(estimate.cost);
        setShowConfirm(true);
      } catch {
        setCostEstimate(0.03); // fallback estimate
        setShowConfirm(true);
      }
      return;
    }

    await processFile(file);
  };

  const processFile = async (file: File) => {
    setShowConfirm(false);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', uploadType);

      const res = await fetch('/api/training-plan/ocr', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Errore upload');
      }

      const result = await res.json();
      onExtracted(result.data, uploadType);

      // Update counters
      const newCount = analysisCount + 1;
      const newCost = totalCost + (result.usage?.cost || 0);
      setAnalysisCount(newCount);
      setTotalCost(newCost);
      localStorage.setItem(OCR_COUNT_KEY, String(newCount));
      localStorage.setItem(OCR_COST_KEY, String(newCost));

      showToast(`Dati estratti! Costo: $${(result.usage?.cost || 0).toFixed(4)}`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Errore estrazione', 'error');
    } finally {
      setUploading(false);
      setPendingFile(null);
    }
  };

  const handleConfirm = () => {
    if (pendingFile) processFile(pendingFile);
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
    setPendingFile(null);
    setPreview(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const addManualSession = () => {
    if (!manualKm) return;
    setManualSessions([...manualSessions, {
      dayOfWeek: manualDay,
      type: manualType,
      distanceKm: parseFloat(manualKm),
      targetPaceMinKm: manualPace || null,
      intervals: null,
      notes: manualNotes || null,
      completed: false,
    }]);
    setManualKm('');
    setManualPace('');
    setManualNotes('');
  };

  const submitManualPlan = () => {
    if (!manualSessions.length) return;
    const totalKm = manualSessions.reduce((s, ses) => s + ses.distanceKm, 0);
    onExtracted({ weekNumber: null, sessions: manualSessions, weeklyTotalKm: totalKm }, 'plan');
    setManualSessions([]);
    showToast('Piano aggiunto manualmente!', 'success');
  };

  const DAYS = [
    { value: 'lunedi', label: 'Lun' }, { value: 'martedi', label: 'Mar' },
    { value: 'mercoledi', label: 'Mer' }, { value: 'giovedi', label: 'Gio' },
    { value: 'venerdi', label: 'Ven' }, { value: 'sabato', label: 'Sab' },
    { value: 'domenica', label: 'Dom' },
  ];

  const SESSION_TYPES = [
    { value: 'easy', label: 'Easy' }, { value: 'tempo', label: 'Tempo' },
    { value: 'interval', label: 'Intervalli' }, { value: 'long_run', label: 'Lungo' },
    { value: 'recovery', label: 'Recupero' }, { value: 'rest', label: 'Riposo' },
    { value: 'cross_training', label: 'Cross' },
  ];

  return (
    <Card hover={false}>
      <div className="flex items-center justify-between mb-1">
        <div className="font-display text-base tracking-wide">Aggiungi piano di allenamento</div>
        {analysisCount > 0 && (
          <div className="text-[0.65rem] text-muted font-mono">
            {analysisCount} analisi · ${totalCost.toFixed(4)} totali
          </div>
        )}
      </div>
      <div className="text-[0.72rem] text-muted mb-4">
        Carica uno screenshot da Runna oppure inserisci il piano manualmente
      </div>

      {/* Mode toggle: OCR vs Manual */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setInputMode('ocr')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
            inputMode === 'ocr' ? 'border-accent text-accent bg-accent/5' : 'border-border text-muted'
          }`}
        >
          OCR da foto
        </button>
        <button
          onClick={() => setInputMode('manual')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
            inputMode === 'manual' ? 'border-accent text-accent bg-accent/5' : 'border-border text-muted'
          }`}
        >
          Inserimento manuale
        </button>
      </div>

      {inputMode === 'ocr' ? (
        <>
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

          {/* Confirmation dialog */}
          {showConfirm && (
            <div className="bg-yellow/10 border border-yellow/30 rounded-xl p-4 mb-4 animate-fade-up">
              <div className="text-sm font-medium mb-2">Conferma analisi</div>
              <p className="text-xs text-muted mb-3">
                Hai gia' usato {analysisCount} analisi OCR (spesa totale: ${totalCost.toFixed(4)}).
                <br />
                Costo stimato per questa immagine: <strong className="text-text">${costEstimate?.toFixed(4)}</strong>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleConfirm}
                  className="bg-accent text-white px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:bg-accent2 transition-all"
                >
                  Procedi (${costEstimate?.toFixed(4)})
                </button>
                <button
                  onClick={handleCancelConfirm}
                  className="border border-border text-muted px-4 py-1.5 rounded-lg text-xs cursor-pointer hover:border-accent transition-all"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}

          {/* Drop zone */}
          {!showConfirm && (
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
              ) : preview && !pendingFile ? (
                <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg mb-3" />
              ) : (
                <>
                  <div className="text-3xl mb-3">&#128247;</div>
                  <p className="text-sm text-muted">Trascina qui lo screenshot o clicca per selezionare</p>
                  <p className="text-xs text-muted/60 mt-1">JPG, PNG, WebP — max 10MB</p>
                  {analysisCount < FREE_ANALYSES && (
                    <p className="text-xs text-green mt-2">
                      {FREE_ANALYSES - analysisCount} analisi gratuite rimanenti (senza conferma)
                    </p>
                  )}
                </>
              )}
            </div>
          )}

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
        </>
      ) : (
        /* Manual input mode */
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            <div>
              <label className="text-xs text-muted block mb-1">Giorno</label>
              <select value={manualDay} onChange={e => setManualDay(e.target.value)}
                className="w-full bg-surface2 border border-border rounded-lg px-2 py-1.5 text-sm text-text">
                {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Tipo</label>
              <select value={manualType} onChange={e => setManualType(e.target.value)}
                className="w-full bg-surface2 border border-border rounded-lg px-2 py-1.5 text-sm text-text">
                {SESSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Km</label>
              <input type="number" step="0.1" value={manualKm} onChange={e => setManualKm(e.target.value)}
                placeholder="10" className="w-full bg-surface2 border border-border rounded-lg px-2 py-1.5 text-sm text-text" />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">Ritmo target</label>
              <input value={manualPace} onChange={e => setManualPace(e.target.value)}
                placeholder="5:30" className="w-full bg-surface2 border border-border rounded-lg px-2 py-1.5 text-sm text-text" />
            </div>
            <div className="flex items-end">
              <button onClick={addManualSession}
                className="w-full bg-accent text-white px-3 py-1.5 rounded-lg text-sm font-semibold cursor-pointer hover:bg-accent2 transition-all">
                +
              </button>
            </div>
          </div>

          {/* Note field */}
          <div className="mb-4">
            <input value={manualNotes} onChange={e => setManualNotes(e.target.value)}
              placeholder="Note (opzionale)" className="w-full bg-surface2 border border-border rounded-lg px-3 py-1.5 text-sm text-text" />
          </div>

          {/* Added sessions preview */}
          {manualSessions.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-muted mb-2">{manualSessions.length} sessioni aggiunte</div>
              <div className="flex flex-wrap gap-2">
                {manualSessions.map((s, i) => (
                  <div key={i} className="bg-surface2 rounded-lg px-3 py-1.5 text-xs flex items-center gap-2 border border-border">
                    <span className="font-medium">{DAYS.find(d => d.value === s.dayOfWeek)?.label}</span>
                    <span className="text-muted">{SESSION_TYPES.find(t => t.value === s.type)?.label}</span>
                    <span>{s.distanceKm}km</span>
                    <button onClick={() => setManualSessions(manualSessions.filter((_, j) => j !== i))}
                      className="text-muted hover:text-red cursor-pointer">&#215;</button>
                  </div>
                ))}
              </div>
              <button onClick={submitManualPlan}
                className="mt-3 bg-accent text-white px-6 py-2 rounded-lg text-sm font-semibold cursor-pointer hover:bg-accent2 transition-all">
                Salva piano settimanale
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
