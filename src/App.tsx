import React, { useState } from 'react';
import {
  Users,
  Bell,
  Database,
  LayoutDashboard,
  Video,
  Wrench,
  LineChart as LineChartIcon,
  FileText,
  BookOpen,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { SidebarItem } from './components/SidebarItem';
import { OverviewDashboard } from './components/OverviewDashboard';
import { RosterConstruction } from './components/RosterConstruction';
import { PlayerDatabase } from './components/PlayerDatabase';
import { TeamAnalytics } from './components/TeamAnalytics';
import { PreScoutHub } from './components/PreScoutHub';
import { Projections } from './components/Projections';
import { ReportsLibrary } from './components/ReportsLibrary';
import { Methodology } from './components/Methodology';
import { useHubData } from './context/HubDataContext';
import { excelDownloadUrl } from './lib/api';
import { HubSearchBar } from './components/HubSearchBar';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const { data, loading, refresh } = useHubData();

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewDashboard />;
      case 'players':
        return <PlayerDatabase />;
      case 'teams':
        return <TeamAnalytics />;
      case 'prescout':
        return <PreScoutHub />;
      case 'roster':
        return <RosterConstruction onViewFullDatabase={() => setActiveTab('players')} />;
      case 'projections':
        return <Projections />;
      case 'reports':
        return <ReportsLibrary />;
      case 'methodology':
        return <Methodology />;
      default:
        return (
          <div className="flex-1 flex flex-col items-center justify-center text-pwhl-muted h-full">
            <Wrench size={48} className="mb-4 opacity-20" />
            <h2 className="text-xl font-serif font-bold text-pwhl-navy mb-2">Module Under Construction</h2>
            <p className="max-w-md text-center">The {activeTab} module is currently being populated.</p>
          </div>
        );
    }
  };

  const syncLabel = data?.generated_at
    ? `Microstats: ${new Date(data.generated_at).toLocaleString()}`
    : 'Starting hub…';

  return (
    <div className="flex h-screen overflow-hidden bg-pwhl-cream text-pwhl-navy selection:bg-torrent-teal/20">
      <aside className="w-72 border-r border-pwhl-border bg-gradient-to-b from-pwhl-surface to-pwhl-cream/90 flex-col hidden md:flex shadow-[4px_0_24px_rgba(10,28,58,0.06)] z-10 torrent-sidebar flex">
        <div className="p-6 border-b border-pwhl-border">
          <div className="flex items-center gap-3 mb-4">
            <img
              src={`${import.meta.env.BASE_URL}Seattle_Torrent_logo.png`}
              alt="Seattle Torrent"
              className="h-12 w-auto max-w-[88px] shrink-0 object-contain drop-shadow-md"
            />
            <div>
              <h1 className="font-serif font-bold text-xl leading-tight text-pwhl-navy">Seattle Torrent</h1>
              <p className="text-[10px] text-torrent-teal uppercase tracking-widest font-mono font-semibold">
                PWHL Analytics Hub
              </p>
            </div>
          </div>

        </div>

        <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-pwhl-muted uppercase tracking-widest mb-3 px-2">
            Live microstats
          </div>
          <SidebarItem
            icon={LayoutDashboard}
            label="Overview"
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          />
          <SidebarItem
            icon={Database}
            label="Team analytics"
            active={activeTab === 'teams'}
            onClick={() => setActiveTab('teams')}
          />

          <div className="text-[10px] font-bold text-pwhl-muted uppercase tracking-widest mb-3 mt-8 px-2">
            More modules
          </div>
          <SidebarItem
            icon={Users}
            label="Player database"
            active={activeTab === 'players'}
            onClick={() => setActiveTab('players')}
          />
          <SidebarItem
            icon={Video}
            label="Game & pre-scout"
            active={activeTab === 'prescout'}
            onClick={() => setActiveTab('prescout')}
          />
          <SidebarItem
            icon={Wrench}
            label="Roster construction"
            active={activeTab === 'roster'}
            onClick={() => setActiveTab('roster')}
          />
          <SidebarItem
            icon={LineChartIcon}
            label="Projections"
            active={activeTab === 'projections'}
            onClick={() => setActiveTab('projections')}
          />

          <div className="text-[10px] font-bold text-pwhl-muted uppercase tracking-widest mb-3 mt-8 px-2">
            Resources
          </div>
          <SidebarItem
            icon={FileText}
            label="Reports library"
            active={activeTab === 'reports'}
            onClick={() => setActiveTab('reports')}
          />
          <SidebarItem
            icon={BookOpen}
            label="Methodology"
            active={activeTab === 'methodology'}
            onClick={() => setActiveTab('methodology')}
          />
        </div>

        <div className="p-4 border-t border-pwhl-border bg-pwhl-cream/50">
          <div className="flex items-center gap-2 text-xs text-pwhl-muted mb-3 px-2 font-mono">
            <Lock size={12} /> Internal — Seattle Torrent
          </div>
          <a
            href={excelDownloadUrl()}
            className="flex items-center justify-center gap-2 text-xs font-semibold text-torrent-teal hover:underline mb-2"
          >
            Download Excel workbook
          </a>
          <button
            type="button"
            onClick={() => refresh()}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold py-2 rounded-lg border border-pwhl-border bg-white text-pwhl-navy hover:bg-pwhl-surface-hover"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Rebuild hub
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative torrent-main">
        <header className="h-16 border-b border-pwhl-border bg-pwhl-surface/95 backdrop-blur flex items-center justify-between px-8 shrink-0 z-20">
          <HubSearchBar setActiveTab={setActiveTab} />

          <div className="flex items-center gap-6">
            <div className="text-xs font-mono text-pwhl-muted hidden lg:block max-w-md truncate">
              <span className="inline-block w-2 h-2 rounded-full bg-torrent-teal mr-2 align-middle" />
              {syncLabel}
            </div>
            {data && (
              <span className="text-xs font-mono text-pwhl-blue hidden xl:inline">
                {data.n_games} games · {data.record_wins}–{data.record_losses}
              </span>
            )}
            <button
              type="button"
              className="text-pwhl-muted hover:text-pwhl-navy transition-colors relative"
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-torrent-coral rounded-full border-2 border-pwhl-surface" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 torrent-content">{renderContent()}</div>
      </main>
    </div>
  );
}
