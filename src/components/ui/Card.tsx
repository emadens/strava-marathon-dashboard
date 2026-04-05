'use client';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = '', hover = true }: CardProps) {
  return (
    <div
      className={`
        bg-surface border border-border rounded-xl p-5 relative overflow-hidden
        animate-fade-up transition-colors duration-200
        ${hover ? 'hover:border-accent group' : ''}
        ${className}
      `}
    >
      {hover && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent to-accent2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      )}
      {children}
    </div>
  );
}
