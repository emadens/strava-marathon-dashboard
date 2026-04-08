'use client';

import type { Narrative } from '@/lib/run-analysis';

const COLORS = {
  positive: { bg: 'bg-green/10', border: 'border-green/30', text: 'text-green' },
  neutral: { bg: 'bg-blue/10', border: 'border-blue/30', text: 'text-blue' },
  warning: { bg: 'bg-yellow/10', border: 'border-yellow/30', text: 'text-yellow' },
};

export function RunNarrative({ narratives }: { narratives: Narrative[] }) {
  if (!narratives.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {narratives.map((n, i) => {
        const c = COLORS[n.type];
        return (
          <div key={i} className={`${c.bg} border ${c.border} rounded-lg px-3 py-2 text-sm ${c.text} font-medium`}>
            {n.text}
          </div>
        );
      })}
    </div>
  );
}
