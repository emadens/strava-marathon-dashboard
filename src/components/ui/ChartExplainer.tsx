'use client';

import { useState } from 'react';

interface ChartExplainerProps {
  children: React.ReactNode;
}

export function ChartExplainer({ children }: ChartExplainerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 pt-2 border-t border-border/30">
      <button
        onClick={() => setOpen(!open)}
        className="text-[0.6rem] text-muted/50 hover:text-muted cursor-pointer transition-colors"
      >
        {open ? '▾ Nascondi spiegazione' : '▸ Come funziona?'}
      </button>
      {open && (
        <div className="mt-1.5 text-[0.6rem] text-muted/70 leading-relaxed bg-surface2/50 rounded-lg p-2.5">
          {children}
        </div>
      )}
    </div>
  );
}
