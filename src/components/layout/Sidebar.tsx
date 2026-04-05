'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '◉' },
  { href: '/goals', label: 'Obiettivi', icon: '◎' },
  { href: '/splits', label: 'Split & PR', icon: '⏱' },
  { href: '/maps', label: 'Mappe', icon: '◈' },
  { href: '/training-plan', label: 'Piano', icon: '▤' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex flex-col gap-1 w-48 p-4 border-r border-border min-h-[calc(100vh-57px)]">
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
  );
}
