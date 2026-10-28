import React, { useState, useEffect, useMemo } from 'react';
import { Company, Department, Contact, Card, SearchFilter, SearchResultItem } from '../types';
import { execute3WaySearch } from '../utils/searchEngine';
import { getTitleRankMeta } from '../utils/entityResolution';
import { downloadVCard } from '../utils/exportTools';
import {
  Search,
  SlidersHorizontal,
  Sparkles,
  Building2,
  Phone,
  Mail,
  Download,
  Eye,
  Star,
  Layers,
  HelpCircle,
  Tag,
  Clock,
  Briefcase,
} from 'lucide-react';

interface HybridSearchViewProps {
  companies: Company[];
  departments: Department[];
  contacts: Contact[];
  cards: Card[];
  initialQuery?: string;
  onSelectCard: (card: Card, contact: Contact, company: Company) => void;
}

export const HybridSearchView: React.FC<HybridSearchViewProps> = ({
  companies,
  departments,
  contacts,
  cards,
  initialQuery = '',
  onSelectCard,
}) => {
  const [filter, setFilter] = useState<SearchFilter>({
    keyword: initialQuery,
    company_id: undefined,
    department_id: undefined,
    min_rank: undefined,
    max_rank: undefined,
    tags: [],
    time_range: 'all',
    mode: 'hybrid',
  });

  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Sync initial query if passed
  useEffect(() => {
    if (initialQuery) {
      setFilter((prev) => ({ ...prev, keyword: initialQuery }));
    }
  }, [initialQuery]);

  // Execute 3-way hybrid search
  const results = useMemo(() => {
    return execute3WaySearch(filter, contacts, companies, departments, cards);
  }, [filter, contacts, companies, departments, cards]);

  const handleSpecialQuery = (type: 'who_buys' | 'jiading_people' | 'recent_3m' | 'precision_stamp') => {
    switch (type) {
      case 'who_buys':
        setFilter({
          keyword: '採購',
          mode: 'hybrid',
          company_id: undefined,
          department_id: undefined,
          time_range: 'all',
        });
        break;
      case 'jiading_people':
        setFilter({
          keyword: '珈鼎',
          company_id: 'c-jiading',
          mode: 'structured',
          time_range: 'all',
        });
        break;
      case 'recent_3m':
        setFilter({
          keyword: '',
          time_range: '90d',
          mode: 'structured',
        });
        break;
      case 'precision_stamp':
        setFilter({
          keyword: '做精密沖壓的供應商',
          mode: 'semantic',
          time_range: 'all',
        });
        break;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold text-[#f4f4f5] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Search className="w-5 h-5" />
            </div>
            <span>三路混合檢索引擎 (3-Way Hybrid Search)</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            路徑 1：結構化篩選 + 路徑 2：字面模糊 (pg_trgm) + 路徑 3：語意檢索 (bge-m3 1024d) • RRF 融合 (k=60)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
              showAdvanced
                ? 'bg-blue-600/10 text-blue-400 border-blue-500/20 shadow-sm'
                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {showAdvanced ? '收合進階過濾器' : '展開進階過濾條件'}
          </button>
        </div>
      </div>

      {/* Special One-Click Executive Presets */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          規格書指定特殊查詢型態（一鍵快速決策）：
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleSpecialQuery('who_buys')}
            className="px-3 py-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-blue-500/50 rounded-lg flex items-center gap-1.5 transition-all"
          >
            <Briefcase className="w-3.5 h-3.5 text-blue-400" />
            「誰是負責採購的？」(跨公司採購聚合)
          </button>

          <button
            onClick={() => handleSpecialQuery('jiading_people')}
            className="px-3 py-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-blue-500/50 rounded-lg flex items-center gap-1.5 transition-all"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            「珈鼎公司我認識哪些人？」(依職級排序)
          </button>

          <button
            onClick={() => handleSpecialQuery('precision_stamp')}
            className="px-3 py-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-blue-500/50 rounded-lg flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            「做精密沖壓的供應商」(自然語言語意檢索)
          </button>

          <button
            onClick={() => handleSpecialQuery('recent_3m')}
            className="px-3 py-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-blue-500/50 rounded-lg flex items-center gap-1.5 transition-all"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            「近 90 天內認識的人脈」(時間軸檢視)
          </button>
        </div>
      </div>

      {/* Main Search Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filter.keyword}
            onChange={(e) => setFilter({ ...filter, keyword: e.target.value })}
            placeholder="輸入自然語言問題或關鍵字，例如：「做沖壓的模具廠」、「林志豪」、「統編 24519803」..."
            className="w-full bg-zinc-950 border border-zinc-800 text-[#f4f4f5] text-sm rounded-lg pl-11 pr-24 py-3 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 placeholder:text-zinc-500"
          />
          {filter.keyword && (
            <button
              onClick={() => setFilter({ ...filter, keyword: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 px-2 py-1 rounded"
            >
              清空
            </button>
          )}
        </div>

        {/* Advanced Filters Drawer */}
        {showAdvanced && (
          <div className="pt-3 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-zinc-400 block mb-1">特定公司篩選</label>
              <select
                value={filter.company_id || ''}
                onChange={(e) => setFilter({ ...filter, company_id: e.target.value || undefined })}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded p-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">全部公司</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.canonical_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">最低職級 (權重)</label>
              <select
                value={filter.min_rank || ''}
                onChange={(e) =>
                  setFilter({ ...filter, min_rank: e.target.value ? Number(e.target.value) : undefined })
                }
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded p-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">不限職級</option>
                <option value="90">90 (總經理/CEO 以上)</option>
                <option value="70">70 (廠長/處長/主管以上)</option>
                <option value="50">50 (課長/副理以上)</option>
                <option value="30">30 (專員/工程師以上)</option>
              </select>
            </div>

            <div>
              <label className="text-zinc-400 block mb-1">認識時間範圍</label>
              <select
                value={filter.time_range || 'all'}
                onChange={(e) => setFilter({ ...filter, time_range: e.target.value as any })}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded p-2 focus:outline-none focus:border-blue-500"
              >
                <option value="all">不限時間</option>
                <option value="30d">30 天內認識</option>
                <option value="90d">90 天內認識</option>
                <option value="180d">半年內認識</option>
                <option value="365d">一年內認識</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>
          檢索結果：共找到 <strong className="text-blue-400 font-mono text-sm">{results.length}</strong> 位人脈聯絡人
        </span>
        <span className="font-mono text-[11px] text-zinc-500">
          RRF 融合分數 (k=60) • 標示命中來源
        </span>
      </div>

      {/* Results List */}
      <div className="space-y-3">
        {results.length === 0 ? (
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500 text-sm">
            找不到符合條件的聯絡人。請嘗試更換關鍵字或放寬進階篩選條件。
          </div>
        ) : (
          results.map((item) => {
            const rankMeta = getTitleRankMeta(item.contact.title_rank);

            return (
              <div
                key={item.contact.id}
                id={`search-item-${item.contact.id}`}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Left: Info */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-[#f4f4f5]">
                        {item.contact.name}
                      </span>
                      {item.contact.is_primary_contact && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded">
                          <Star className="w-3 h-3 fill-blue-400" />
                          主要窗口
                        </span>
                      )}
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded border ${rankMeta.badgeColor}`}
                      >
                        Rank {item.contact.title_rank} • {item.contact.title_raw}
                      </span>
                      <span className="text-xs font-mono font-bold text-blue-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                        RRF: {item.rrf_score.toFixed(4)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-300">
                      <span className="font-semibold text-zinc-200">
                        {item.company.canonical_name}
                      </span>
                      {item.department && (
                        <span className="text-zinc-400">• {item.department.name}</span>
                      )}
                      <span className="font-mono text-zinc-500">
                        (統編: {item.company.tax_id})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 pt-0.5">
                      {item.contact.mobile && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-zinc-400" />
                          {item.contact.mobile}
                        </span>
                      )}
                      {item.contact.email && (
                        <span className="flex items-center gap-1 text-zinc-300">
                          <Mail className="w-3 h-3 text-zinc-400" />
                          {item.contact.email}
                        </span>
                      )}
                      {item.card.acquired_event && (
                        <span className="text-[11px] text-zinc-500">
                          場合: {item.card.acquired_event}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => onSelectCard(item.card, item.contact, item.company)}
                      className="px-2.5 py-1.5 text-xs text-zinc-300 hover:text-blue-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 flex items-center gap-1 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      名片原圖
                    </button>

                    <button
                      onClick={() => downloadVCard(item.contact, item.company, item.department)}
                      className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded border border-zinc-800 transition-colors"
                      title="下載 vCard"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Hit Sources Attribution Badges */}
                <div className="pt-2 border-t border-zinc-800/60 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-zinc-500 font-mono">命中原因：</span>
                  {item.hit_sources.map((hit, idx) => (
                    <span
                      key={idx}
                      className={`text-[10px] px-2 py-0.5 rounded border font-mono flex items-center gap-1 ${
                        hit.type === 'structured'
                          ? 'bg-blue-950/80 text-blue-300 border-blue-800/60'
                          : hit.type === 'semantic'
                          ? 'bg-purple-950/80 text-purple-300 border-purple-800/60'
                          : 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                      }`}
                    >
                      <span>[{hit.field}]</span>
                      <span>{hit.reason}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
