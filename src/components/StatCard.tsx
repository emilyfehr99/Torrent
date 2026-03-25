import React from 'react';
import { TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';

export const StatCard = ({ title, value, subtitle, trend, trendUp, icon: Icon }: any) => (
  <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
    <div className="absolute top-0 right-0 w-24 h-24 bg-pwhl-cream rounded-bl-full -z-10 opacity-50"></div>
    <div className="flex justify-between items-start mb-2">
      <div className="p-2 bg-pwhl-cream rounded-lg border border-pwhl-border text-pwhl-blue">
        <Icon size={20} />
      </div>
      {trend && (
        <div className={cn(
          "flex items-center gap-1 text-xs font-mono px-2 py-1 rounded-full font-medium",
          trendUp ? "bg-pwhl-success/10 text-pwhl-success" : "bg-pwhl-accent/10 text-pwhl-accent"
        )}>
          {trendUp ? "+" : ""}{trend}
          <TrendingUp size={12} className={cn(!trendUp && "rotate-180")} />
        </div>
      )}
    </div>
    <div>
      <div className="text-3xl font-serif font-bold text-pwhl-navy mb-1">{value}</div>
      <h3 className="text-pwhl-navy font-semibold text-sm">{title}</h3>
      {subtitle && <p className="text-pwhl-muted text-xs mt-1">{subtitle}</p>}
    </div>
  </div>
);
