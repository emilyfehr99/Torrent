import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, User, Calendar, Compass } from 'lucide-react';
import { useHubData } from '../context/HubDataContext';
import { useHubSearch } from '../context/SearchContext';
import type { HubRow } from '../types/hub';

const NAV_HINTS: { q: string; tab: string; label: string }[] = [
  { q: 'player', tab: 'players', label: 'Player database' },
  { q: 'report', tab: 'reports', label: 'Reports library' },
  { q: 'roster', tab: 'roster', label: 'Roster construction' },
  { q: 'scout', tab: 'prescout', label: 'Game & pre-scout' },
  { q: 'overview', tab: 'overview', label: 'Overview dashboard' },
  { q: 'team', tab: 'teams', label: 'Team analytics' },
  { q: 'method', tab: 'methodology', label: 'Methodology' },
  { q: 'project', tab: 'projections', label: 'Projections' },
];

type GameRow = HubRow & { opponent?: string; date?: string; final_score?: string };

function scrollToCustomReport() {
  setTimeout(() => {
    document.getElementById('custom-report')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 120);
}

export function HubSearchBar({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { data } = useHubData();
  const { query, setQuery } = useHubSearch();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const suggestions = useMemo(() => {
    const raw = query.trim();
    const q = raw.toLowerCase();
    if (!raw) {
      return { players: [] as string[], games: [] as { key: string; label: string }[], nav: [] as typeof NAV_HINTS };
    }

    const season = data?.player_season ?? [];
    const seen = new Set<string>();
    const players: string[] = [];
    for (const r of season) {
      const n = String(r.Player ?? '').trim();
      if (!n || seen.has(n)) continue;
      if (n.toLowerCase().includes(q)) {
        seen.add(n);
        players.push(n);
        if (players.length >= 10) break;
      }
    }

    const games: { key: string; label: string }[] = [];
    const pg = (data?.per_game_metrics ?? []) as GameRow[];
    const gseen = new Set<string>();
    for (const row of pg) {
      const opp = String(row.opponent ?? '').trim();
      const date = String(row.date ?? '').trim();
      const score = String(row.final_score ?? '').trim();
      const hay = `${opp} ${date} ${score}`.toLowerCase();
      if (!hay.includes(q)) continue;
      const key = `${opp}|${date}`;
      if (gseen.has(key)) continue;
      gseen.add(key);
      const label = [opp || 'Opponent', date || '—', score ? score : null].filter(Boolean).join(' · ');
      games.push({ key, label });
      if (games.length >= 8) break;
    }

    const nav = NAV_HINTS.filter(
      (h) => h.q.includes(q) || h.label.toLowerCase().includes(q) || (q.length >= 2 && h.q.startsWith(q)),
    );

    return { players, games, nav };
  }, [query, data?.player_season, data?.per_game_metrics]);

  const hasDropdown = open && query.trim().length > 0;

  const pickPlayer = (name: string) => {
    setQuery(name);
    setActiveTab('players');
    setOpen(false);
  };

  const pickGame = (label: string) => {
    const part = label.split(' · ')[0] ?? label;
    setQuery(part);
    setActiveTab('reports');
    setOpen(false);
    scrollToCustomReport();
  };

  const pickNav = (tab: string, label: string) => {
    setQuery(label);
    setActiveTab(tab);
    setOpen(false);
    if (tab === 'reports') scrollToCustomReport();
  };

  return (
    <div ref={wrapRef} className="relative w-80 max-w-[min(100%,24rem)]">
      <div className="flex items-center bg-pwhl-cream border border-pwhl-border rounded-lg px-3 py-1.5 focus-within:border-torrent-teal transition-colors">
        <Search size={16} className="text-pwhl-muted mr-2 shrink-0" aria-hidden />
        <input
          type="search"
          name="hub-search"
          autoComplete="off"
          aria-label="Search players and games"
          aria-expanded={hasDropdown}
          aria-controls="hub-search-suggestions"
          placeholder="Search players, opponents, dates…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const qq = query.trim().toLowerCase();
              if (!qq) return;
              const season = data?.player_season ?? [];
              const playerHit = season.some((r) => String(r.Player ?? '').toLowerCase().includes(qq));
              const pg = data?.per_game_metrics ?? [];
              const gameHit = pg.some((row) => {
                const opp = String(row.opponent ?? '').toLowerCase();
                const date = String(row.date ?? '').toLowerCase();
                const score = String(row.final_score ?? '').toLowerCase();
                return opp.includes(qq) || date.includes(qq) || score.includes(qq);
              });
              if (playerHit) setActiveTab('players');
              else if (gameHit) {
                setActiveTab('reports');
                scrollToCustomReport();
              } else setActiveTab('players');
              setOpen(false);
            }
            if (e.key === 'Escape') setOpen(false);
          }}
          className="bg-transparent border-none outline-none text-sm w-full min-w-0 text-pwhl-navy placeholder:text-pwhl-muted"
        />
      </div>

      {hasDropdown ? (
        <div
          id="hub-search-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-pwhl-border bg-pwhl-surface shadow-lg max-h-80 overflow-y-auto py-1"
        >
          {suggestions.nav.length > 0 && (
            <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-pwhl-muted">
              Go to
            </div>
          )}
          {suggestions.nav.map((h) => (
            <button
              key={h.tab}
              type="button"
              role="option"
              className="w-full text-left px-3 py-2 text-sm text-pwhl-navy hover:bg-pwhl-cream flex items-center gap-2"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pickNav(h.tab, h.label)}
            >
              <Compass size={14} className="text-pwhl-blue shrink-0" />
              <span>{h.label}</span>
            </button>
          ))}

          {suggestions.players.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-pwhl-muted border-t border-pwhl-border/80 mt-1 pt-2">
                Players
              </div>
              {suggestions.players.map((name) => (
                <button
                  key={name}
                  type="button"
                  role="option"
                  className="w-full text-left px-3 py-2 text-sm text-pwhl-navy hover:bg-pwhl-cream flex items-center gap-2"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickPlayer(name)}
                >
                  <User size={14} className="text-pwhl-blue shrink-0" />
                  <span className="font-medium">{name}</span>
                </button>
              ))}
            </>
          )}

          {suggestions.games.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-pwhl-muted border-t border-pwhl-border/80 mt-1 pt-2">
                Games
              </div>
              {suggestions.games.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  role="option"
                  className="w-full text-left px-3 py-2 text-sm text-pwhl-navy hover:bg-pwhl-cream flex items-center gap-2"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickGame(g.label)}
                >
                  <Calendar size={14} className="text-pwhl-blue shrink-0" />
                  <span className="truncate">{g.label}</span>
                </button>
              ))}
            </>
          )}

          {suggestions.players.length === 0 &&
            suggestions.games.length === 0 &&
            suggestions.nav.length === 0 && (
              <div className="px-3 py-3 text-xs text-pwhl-muted">No matches — press Enter to search player database</div>
            )}
        </div>
      ) : null}
    </div>
  );
}
