'use client';

import { Card } from '@/components/ui/Card';

interface KPICardProps {
  label: string;
  value: string;
  unit: string;
  delta?: { value: string; isPositive: boolean } | null;
  delay?: number;
}

export function KPICard({ label, value, unit, delta, delay = 0 }: KPICardProps) {
  return (
    <Card className={delay ? `[animation-delay:${delay * 50}ms]` : ''}>
      <div className="text-[0.7rem] uppercase tracking-wider text-muted mb-2">{label}</div>
      <div className="font-display text-4xl leading-none tracking-wide">{value}</div>
      <div className="font-mono text-xs text-muted mt-1">{unit}</div>
      {delta && (
        <div className={`text-xs font-semibold mt-2 ${delta.isPositive ? 'text-green' : 'text-red'}`}>
          {delta.value}
        </div>
      )}
    </Card>
  );
}
