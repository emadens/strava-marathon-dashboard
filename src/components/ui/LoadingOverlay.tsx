'use client';

interface LoadingOverlayProps {
  active: boolean;
  text?: string;
}

export function LoadingOverlay({ active, text = 'Caricamento...' }: LoadingOverlayProps) {
  if (!active) return null;

  return (
    <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[200] flex items-center justify-center flex-col gap-4">
      <div className="w-12 h-12 border-3 border-border border-t-accent rounded-full animate-spin" />
      <div className="text-muted text-sm">{text}</div>
    </div>
  );
}
