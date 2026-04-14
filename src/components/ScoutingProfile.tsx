import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend
} from 'recharts';
import { TrendingUp, Users, Target, Shield, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import type { ScoutingProfile as ScoutingProfileType } from '../types/hub';

interface Props {
  playerName: string;
  profile?: ScoutingProfileType;
}

const METRIC_LABELS: Record<string, string> = {
  'GameScore': 'Game Score',
  'xG/60': 'Expected Goals',
  'Primary Shot Assists/60': 'Shot Assists',
  'Individual Chances/60': 'High-Danger Chances',
  'Controlled Entries/60': 'Entry Control',
  'Controlled Exits/60': 'Exit Control',
  'Forecheck Recoveries/60': 'FC Recoveries',
  'Retrievals leading to Exits/60': 'Breakout Efficiency'
};

const getTierColor = (pctl: number) => {
  if (pctl >= 90) return '#10B981'; // Elite - Green
  if (pctl >= 75) return '#3B82F6'; // High - Blue
  if (pctl >= 50) return '#F59E0B'; // Average - Amber
  return '#EF4444'; // Below - Red
};

export function ScoutingProfile({ playerName, profile }: Props) {
  const percentileData = useMemo(() => {
    if (!profile?.percentiles) return [];
    return Object.entries(profile.percentiles).map(([key, value]) => ({
      name: METRIC_LABELS[key] || key,
      value
    }));
  }, [profile]);

  if (!profile) {
    return (
      <div className="p-8 text-center bg-pwhl-surface border border-pwhl-border rounded-xl">
        <p className="text-pwhl-muted">No 3-year scouting data available for {playerName}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-torrent-navy/5 border border-torrent-navy/10 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-torrent-navy text-white flex items-center justify-center">
            <Target size={20} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-pwhl-muted">Role Projection</div>
            <div className="text-lg font-serif font-bold text-torrent-navy">
              {profile.percentiles['GameScore'] >= 80 ? 'Elite Core' : 'Top-6 Forward'}
            </div>
          </div>
        </div>
        
        <div className="bg-torrent-teal/5 border border-torrent-teal/10 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-torrent-teal text-white flex items-center justify-center">
            <Zap size={20} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-pwhl-muted">Peak Potential</div>
            <div className="text-lg font-serif font-bold text-torrent-teal">
              Tier {profile.percentiles['GameScore'] >= 90 ? '1 (Franchise)' : '2 (Impact)'}
            </div>
          </div>
        </div>

        <div className="bg-pwhl-blue/5 border border-pwhl-blue/10 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-pwhl-blue text-white flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-pwhl-muted">Trend Data</div>
            <div className="text-lg font-serif font-bold text-pwhl-blue">
              {profile.trajectory.length > 1 && profile.trajectory[profile.trajectory.length-1].AvgPercentile > profile.trajectory[0].AvgPercentile ? 'Improving' : 'Stable'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 3-Year Percentile Profile */}
        <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="text-torrent-navy" size={20} />
            <h3 className="font-serif font-bold text-lg text-torrent-navy">3-Year Percentile Profile</h3>
          </div>
          
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={percentileData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={120}
                  tick={{ fill: '#374151', fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const val = payload[0].value as number;
                      return (
                        <div className="bg-torrent-navy text-white px-3 py-2 rounded shadow-lg text-xs border border-white/10">
                          <p className="font-bold">{payload[0].payload.name}</p>
                          <p className="mt-1">Rank: {val.toFixed(1)} percentile</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                  {percentileData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getTierColor(entry.value)} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* NHL Similarity Comps */}
        <div className="bg-pwhl-surface border border-pwhl-border rounded-xl p-6 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Users className="text-torrent-navy" size={20} />
            <h3 className="font-serif font-bold text-lg text-torrent-navy">NHL Similarity Comps</h3>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-pwhl-border">
                  <th className="text-left py-3 px-2 text-[10px] font-bold uppercase tracking-wider text-pwhl-muted">Player</th>
                  <th className="text-center py-3 px-2 text-[10px] font-bold uppercase tracking-wider text-pwhl-muted">Season</th>
                  <th className="text-center py-3 px-2 text-[10px] font-bold uppercase tracking-wider text-pwhl-muted">Game Score</th>
                  <th className="text-right py-3 px-2 text-[10px] font-bold uppercase tracking-wider text-pwhl-muted">Style Match</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pwhl-border/50">
                {profile.comps.map((comp, i) => {
                  const matchPct = Math.max(70, Math.round(100 - (comp.distance / 2)));
                  return (
                    <tr key={i} className="hover:bg-pwhl-cream transition-colors group">
                      <td className="py-4 px-2 font-semibold text-torrent-navy group-hover:text-torrent-teal transition-colors">
                        {comp.Player}
                      </td>
                      <td className="py-4 px-2 text-center text-pwhl-muted font-mono">
                        {comp.Year}
                      </td>
                      <td className="py-4 px-2 text-center font-mono">
                        {comp.GameScore.toFixed(2)}
                      </td>
                      <td className="py-4 px-2 text-right">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold",
                          matchPct > 90 ? "bg-emerald-100 text-emerald-700" :
                          matchPct > 80 ? "bg-blue-100 text-blue-700" :
                          "bg-amber-100 text-amber-700"
                        )}>
                          {matchPct}% Match
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-torrent-navy" size={18} />
              <h4 className="font-serif font-bold text-md text-torrent-navy">Development Curve</h4>
            </div>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={profile.trajectory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="Year" hide />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-torrent-navy text-white px-2 py-1 rounded text-[10px]">
                            {payload[0].value}% Score
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="AvgPercentile" 
                    stroke="#10B981" 
                    strokeWidth={3} 
                    dot={{ fill: '#10B981', r: 4 }}
                    activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
