import React from 'react';
import { cn } from '../lib/utils';

export const SidebarItem = ({ icon: Icon, label, active, onClick, badge }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group text-sm font-medium",
      active 
        ? "bg-pwhl-blue text-white shadow-md" 
        : "text-pwhl-muted hover:bg-pwhl-blue/10 hover:text-pwhl-blue"
    )}
  >
    <div className="flex items-center gap-3">
      <Icon size={18} className={cn(active ? "text-white" : "text-pwhl-muted group-hover:text-pwhl-blue")} />
      <span>{label}</span>
    </div>
    {badge && (
      <span className={cn(
        "text-[10px] px-2 py-0.5 rounded-full font-bold",
        active ? "bg-white/20 text-white" : "bg-pwhl-accent/10 text-pwhl-accent"
      )}>
        {badge}
      </span>
    )}
  </button>
);
