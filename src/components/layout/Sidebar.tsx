'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '◉' },
  { href: '/goals', label: 'Obiettivi', icon: '◎' },
  { href: '/splits', label: 'Split', icon: '⏱' },
  { href: '/analysis', label: 'Analisi', icon: '◈' },
  { href: '/training-plan', label: 'Piano', icon: '▤' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col gap-1 w-48 p-4 border-r border-border sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${active
                  ? 'bg-accent/10 text-accent border border-accent/30'
                  : 'text-muted hover:text-text hover:bg-surface2 border border-transparent'
                }
              `}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-[100] flex justify-around items-center px-1 py-1.5 backdrop-blur-md bg-surface/90">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-center transition-all min-w-0
                ${active ? 'text-accent' : 'text-muted'}
              `}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-[0.55rem] font-medium leading-tight truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

    </>
  );
}
