import React from 'react';
import { TEAM_LOGO_PATH } from '../lib/branding';

export function BrandedReportShell({
  title,
  subtitle,
  eyebrow = 'Seattle Torrent',
  children,
  className = '',
  headerRight,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
  headerRight?: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border border-pwhl-border overflow-hidden shadow-sm ${className}`}>
      <div className="bg-gradient-to-r from-torrent-teal via-pwhl-blue to-pwhl-navy px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
          <div className="shrink-0 bg-white/95 rounded-lg px-2 py-1.5 border border-white/50 shadow-sm">
            <img src={TEAM_LOGO_PATH} alt="" className="h-9 w-auto max-w-[100px] object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/85">{eyebrow}</p>
            <h4 className="font-serif font-bold text-lg text-white leading-tight">{title}</h4>
            {subtitle ? <p className="text-xs text-white/80 mt-0.5">{subtitle}</p> : null}
          </div>
        </div>
        {headerRight ? <div className="shrink-0 flex items-center gap-2">{headerRight}</div> : null}
      </div>
      <div className="h-1 bg-gradient-to-r from-torrent-coral/90 to-torrent-teal/80" aria-hidden />
      <div className="bg-white">{children}</div>
    </div>
  );
}
