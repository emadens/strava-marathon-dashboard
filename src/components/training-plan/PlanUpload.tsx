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
  const [inputMode, setInputMode] = useState<'text' | 'ocr' | 'manual'>('text');
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

  // Text-paste state
  const [pastedText, setPastedText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<{ weeks: Array<{ weekNumber: number; sessions: Array<{ dayOfWeek: string; type: string; distanceKm: number; targetPaceMinKm: string | null; intervals: string | null; notes: string | null }>; weeklyTotalKm: number }> } | null>(null);
  const [parseCost, setParseCost] = useState<number | null>(null);
  // Editable preview state
  const [editingWeek, setEditingWeek] = useState<number | null>(null);
  const [editingSession, setEditingSession] = useState<{ week: number; session: number } | null>(null);

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

  // === TEXT PASTE HANDLERS ===
  const handleParseText = async () => {
    if (!pastedText.trim() || pastedText.trim().length < 20) {
      showToast('Testo troppo corto', 'error');
      return;
    }
    setParsing(true);
    setParsedPreview(null);
    try {
      const res = await fetch('/api/training-plan/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pastedText }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Errore parsing');
      }
      const result = await res.json();
      setParsedPreview(result.data);
      setParseCost(result.usage?.cost || 0);

      // Update cost counters
      const newCount = analysisCount + 1;
      const newCost = totalCost + (result.usage?.cost || 0);
      setAnalysisCount(newCount);
      setTotalCost(newCost);
      localStorage.setItem(OCR_COUNT_KEY, String(newCount));
      localStorage.setItem(OCR_COST_KEY, String(newCost));

      showToast(`Piano strutturato! Costo: $${(result.usage?.cost || 0).toFixed(4)}`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Errore parsing', 'error');
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmPlan = () => {
    if (!parsedPreview?.weeks) return;
    // Add completed: false to all sessions
    const weeks = parsedPreview.weeks.map(w => ({
      ...w,
      sessions: w.sessions.map(s => ({ ...s, completed: false })),
    }));
    onExtracted(weeks, 'plan');
    setParsedPreview(null);
    setPastedText('');
    showToast('Piano salvato!', 'success');
  };

  const updatePreviewSession = (weekIdx: number, sessionIdx: number, field: string, value: string | number) => {
    if (!parsedPreview) return;
    const updated = { ...parsedPreview, weeks: [...parsedPreview.weeks] };
    updated.weeks[weekIdx] = { ...updated.weeks[weekIdx], sessions: [...updated.weeks[weekIdx].sessions] };
    updated.weeks[weekIdx].sessions[sessionIdx] = { ...updated.weeks[weekIdx].sessions[sessionIdx], [field]: value };
    // Recalculate weekly total
    updated.weeks[weekIdx].weeklyTotalKm = updated.weeks[weekIdx].sessions.reduce((s, ses) => s + (Number(ses.distanceKm) || 0), 0);
    setParsedPreview(updated);
  };

  const removePreviewSession = (weekIdx: number, sessionIdx: number) => {
    if (!parsedPreview) return;
    const updated = { ...parsedPreview, weeks: [...parsedPreview.weeks] };
    updated.weeks[weekIdx] = { ...updated.weeks[weekIdx], sessions: updated.weeks[weekIdx].sessions.filter((_, i) => i !== sessionIdx) };
    updated.weeks[weekIdx].weeklyTotalKm = updated.weeks[weekIdx].sessions.reduce((s, ses) => s + (Number(ses.distanceKm) || 0), 0);
    setParsedPreview(updated);
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

      {/* Mode toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setInputMode('text')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
            inputMode === 'text' ? 'border-accent text-accent bg-accent/5' : 'border-border text-muted'
          }`}
        >
          Incolla testo
        </button>
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
          Manuale
        </button>
      </div>

      {inputMode === 'text' ? (
        /* === TEXT PASTE MODE === */
        <div>
          {!parsedPreview ? (
            <>
              <p className="text-xs text-muted mb-3">
                Incolla il testo del piano di allenamento (estratto da screenshot Runna o copiato da email/app).
                Claude lo strutturera automaticamente in settimane e sessioni.
              </p>
              <textarea
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder={`Esempio:\n\nSettimana 1:\nLunedi - Easy run 8km @6:00/km\nMercoledi - Interval 6x800m @4:30\nVenerdi - Tempo run 10km @5:20/km\nDomenica - Long run 18km @6:15/km\n\nSettimana 2:\n...`}
                rows={12}
                className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-sm text-text font-mono resize-y mb-4"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted font-mono">
                  {pastedText.length} caratteri
                </span>
                <button
                  onClick={handleParseText}
                  disabled={parsing || pastedText.trim().length < 20}
                  className="bg-accent text-white px-6 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:bg-accent2 disabled:opacity-35 disabled:pointer-events-none flex items-center gap-2"
                >
                  {parsing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {parsing ? 'Analisi in corso...' : 'Struttura piano'}
                </button>
              </div>
            </>
          ) : (
            /* === PREVIEW & EDIT === */
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-display text-base tracking-wide">Preview piano — {parsedPreview.weeks.length} settimane</div>
                  {parseCost !== null && (
                    <div className="text-[0.65rem] text-muted font-mono">Costo analisi: ${parseCost.toFixed(4)}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setParsedPreview(null); }}
                    className="border border-border text-muted px-3 py-1.5 rounded-lg text-xs cursor-pointer hover:border-accent transition-all"
                  >
                    Modifica testo
                  </button>
                  <button
                    onClick={handleConfirmPlan}
                    className="bg-accent text-white px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:bg-accent2 transition-all"
                  >
                    Conferma e salva
                  </button>
                </div>
              </div>

              <div className="max-h-[500px] overflow-y-auto space-y-3 pr-1">
                {parsedPreview.weeks.map((week, wi) => (
                  <div key={wi} className="bg-surface2/50 rounded-xl p-3 border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium">Settimana {week.weekNumber}</span>
                      <span className="text-[0.65rem] text-muted font-mono">{week.weeklyTotalKm.toFixed(1)} km</span>
                    </div>
                    <div className="space-y-1.5">
                      {week.sessions.map((s, si) => (
                        <div key={si} className="flex items-center gap-2 text-xs">
                          {editingSession?.week === wi && editingSession?.session === si ? (
                            /* Editing mode */
                            <div className="flex-1 grid grid-cols-5 gap-1.5">
                              <select value={s.dayOfWeek} onChange={e => updatePreviewSession(wi, si, 'dayOfWeek', e.target.value)}
                                className="bg-surface border border-border rounded px-1.5 py-1 text-xs text-text">
                                {['lunedi','martedi','mercoledi','giovedi','venerdi','sabato','domenica'].map(d => (
                                  <option key={d} value={d}>{d.slice(0,3)}</option>
                                ))}
                              </select>
                              <select value={s.type} onChange={e => updatePreviewSession(wi, si, 'type', e.target.value)}
                                className="bg-surface border border-border rounded px-1.5 py-1 text-xs text-text">
                                {['easy','tempo','interval','long_run','recovery','rest','cross_training'].map(t => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                              <input type="number" step="0.1" value={s.distanceKm} onChange={e => updatePreviewSession(wi, si, 'distanceKm', parseFloat(e.target.value) || 0)}
                                className="bg-surface border border-border rounded px-1.5 py-1 text-xs text-text" placeholder="km" />
                              <input value={s.targetPaceMinKm || ''} onChange={e => updatePreviewSession(wi, si, 'targetPaceMinKm', e.target.value || '')}
                                className="bg-surface border border-border rounded px-1.5 py-1 text-xs text-text" placeholder="pace" />
                              <button onClick={() => setEditingSession(null)} className="text-green cursor-pointer">&#10003;</button>
                            </div>
                          ) : (
                            /* Display mode */
                            <>
                              <span className="w-8 text-muted font-mono">{s.dayOfWeek.slice(0,3)}</span>
                              <span className={`w-16 font-medium ${s.type === 'rest' ? 'text-muted/40' : 'text-text'}`}>{s.type}</span>
                              <span className="w-12 font-mono">{s.distanceKm > 0 ? `${s.distanceKm}km` : '—'}</span>
                              <span className="w-14 text-muted font-mono">{s.targetPaceMinKm || ''}</span>
                              <span className="flex-1 text-muted/60 truncate">{s.intervals || s.notes || ''}</span>
                              <button onClick={() => setEditingSession({ week: wi, session: si })} className="text-muted hover:text-accent cursor-pointer">&#9998;</button>
                              <button onClick={() => removePreviewSession(wi, si)} className="text-muted hover:text-red cursor-pointer">&#215;</button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleConfirmPlan}
                  className="bg-accent text-white px-6 py-2 rounded-lg text-sm font-semibold cursor-pointer hover:bg-accent2 transition-all"
                >
                  Conferma e salva ({parsedPreview.weeks.length} settimane)
                </button>
              </div>
            </div>
          )}
        </div>
      ) : inputMode === 'ocr' ? (
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
