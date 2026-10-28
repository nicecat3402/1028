import React from 'react';
import {
  FolderKanban,
  Camera,
  Search,
  GitMerge,
  FlaskConical,
  Server,
  HardDrive,
  Download,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'directory' | 'scanner' | 'search' | 'merge_queue' | 'verification' | 'export';
  setActiveTab: (tab: 'directory' | 'scanner' | 'search' | 'merge_queue' | 'verification' | 'export') => void;
  pendingMergeCount: number;
  offlineQueueCount: number;
  onQuickSearch: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingMergeCount,
  offlineQueueCount,
  onQuickSearch,
}) => {
  const [searchInput, setSearchInput] = React.useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onQuickSearch(searchInput.trim());
      setActiveTab('search');
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-[#121214]/90 backdrop-blur-md">
      {/* Top micro-status bar */}
      <div className="border-b border-zinc-800/80 bg-[#09090b] px-4 py-1.5 text-xs text-zinc-400 flex items-center justify-between overflow-x-auto gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1.5 font-medium text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            前端示範模式（資料不持久保存）
          </span>
          <span className="text-zinc-700">|</span>
          <span className="flex items-center gap-1 text-zinc-400">
            <Server className="w-3.5 h-3.5 text-zinc-500" />
            FastAPI / PostgreSQL：規劃中
          </span>
          <span className="text-zinc-700">|</span>
          <span className="flex items-center gap-1 text-zinc-400">
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
            Ollama：未連線（示意）
          </span>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-400">
            RTX 4070 Ti SUPER 16GB (ComfyUI 358MB 互斥隔離)
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {offlineQueueCount > 0 && (
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full text-[11px] font-mono">
              離線佇列: {offlineQueueCount} 張待同步
            </span>
          )}
          <span className="bg-zinc-900 border border-zinc-800 text-zinc-400 px-2.5 py-0.5 rounded text-[11px]">
            規格書 v2 • 階段 2
          </span>
        </div>
      </div>

      {/* Main navigation header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => setActiveTab('directory')}>
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-blue-900/30">
              N
            </div>
            <div>
              <div className="font-bold text-[#f4f4f5] tracking-tight flex items-center gap-2 text-base">
                <span>OmniCard AI</span>
                <span className="text-[10px] font-mono uppercase bg-blue-600/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">
                  Demo
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-none mt-0.5">
                公司階層歸併 • 部門職級樹 • 三路混合檢索
              </p>
            </div>
          </div>

          {/* Quick Search Box (desktop) */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="搜尋姓名、公司、職稱、統編或「做精密沖壓的供應商」..."
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-full pl-10 pr-16 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-zinc-500 transition-colors"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-full border border-zinc-700 font-medium transition-colors"
              >
                檢索
              </button>
            </div>
          </form>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-1.5">
            <button
              id="nav-btn-directory"
              onClick={() => setActiveTab('directory')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'directory'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              名片夾
            </button>

            <button
              id="nav-btn-scanner"
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
                activeTab === 'scanner'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Camera className="w-4 h-4" />
              掃描與上傳
              {offlineQueueCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-2 right-2"></span>
              )}
            </button>

            <button
              id="nav-btn-search"
              onClick={() => setActiveTab('search')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'search'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Search className="w-4 h-4" />
              三路檢索
            </button>

            <button
              id="nav-btn-merge"
              onClick={() => setActiveTab('merge_queue')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
                activeTab === 'merge_queue'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <GitMerge className="w-4 h-4" />
              歸併審查
              {pendingMergeCount > 0 && (
                <span className="bg-blue-600 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                  {pendingMergeCount}
                </span>
              )}
            </button>

            <button
              id="nav-btn-verification"
              onClick={() => setActiveTab('verification')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'verification'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <FlaskConical className="w-4 h-4" />
              驗證試驗場
            </button>

            <button
              id="nav-btn-export"
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'export'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Download className="w-4 h-4" />
              匯出 / QR
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
