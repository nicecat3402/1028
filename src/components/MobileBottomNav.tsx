import React from 'react';
import { FolderKanban, Camera, Search, GitMerge, FlaskConical } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'directory' | 'scanner' | 'search' | 'merge_queue' | 'verification' | 'export';
  setActiveTab: (tab: 'directory' | 'scanner' | 'search' | 'merge_queue' | 'verification' | 'export') => void;
  pendingMergeCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  pendingMergeCount,
}) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#09090b]/95 backdrop-blur-md border-t border-zinc-800 px-2 py-2 flex items-center justify-around">
      <button
        id="mobile-nav-directory"
        onClick={() => setActiveTab('directory')}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-xs font-medium transition-colors ${
          activeTab === 'directory' ? 'text-blue-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <FolderKanban className="w-5 h-5" />
        <span>名片夾</span>
      </button>

      <button
        id="mobile-nav-scanner"
        onClick={() => setActiveTab('scanner')}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-xs font-medium transition-colors ${
          activeTab === 'scanner' ? 'text-blue-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <Camera className="w-5 h-5" />
        <span>掃描相機</span>
      </button>

      <button
        id="mobile-nav-search"
        onClick={() => setActiveTab('search')}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-xs font-medium transition-colors ${
          activeTab === 'search' ? 'text-blue-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <Search className="w-5 h-5" />
        <span>搜尋</span>
      </button>

      <button
        id="mobile-nav-merge"
        onClick={() => setActiveTab('merge_queue')}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-xs font-medium transition-colors relative ${
          activeTab === 'merge_queue' ? 'text-blue-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <GitMerge className="w-5 h-5" />
        <span>歸併審查</span>
        {pendingMergeCount > 0 && (
          <span className="absolute -top-0.5 right-2 w-2 h-2 rounded-full bg-blue-500"></span>
        )}
      </button>

      <button
        id="mobile-nav-verification"
        onClick={() => setActiveTab('verification')}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-xs font-medium transition-colors ${
          activeTab === 'verification' ? 'text-blue-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <FlaskConical className="w-5 h-5" />
        <span>驗證場</span>
      </button>
    </div>
  );
};
