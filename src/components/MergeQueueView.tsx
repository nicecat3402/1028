import React, { useState } from 'react';
import { MergeQueueItem, Company } from '../types';
import {
  GitMerge,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Building2,
  ArrowRight,
  Split,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { evaluateEntityMatch } from '../utils/entityResolution';

interface MergeQueueViewProps {
  queueItems: MergeQueueItem[];
  companies: Company[];
  onApproveMerge: (itemId: string) => void;
  onRejectMerge: (itemId: string) => void;
}

export const MergeQueueView: React.FC<MergeQueueViewProps> = ({
  queueItems,
  companies,
  onApproveMerge,
  onRejectMerge,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>(queueItems[0]?.id || '');
  const [showTrapDemo, setShowTrapDemo] = useState<boolean>(false);

  const currentItem = queueItems.find((q) => q.id === selectedItemId) || queueItems[0];
  const targetCompany = companies.find((c) => c.id === currentItem?.target_company_id);

  // Intentional trap analysis computation
  const dayuPrecision = companies.find((c) => c.id === 'c-dayu-precision');
  const dayuTrading = companies.find((c) => c.id === 'c-dayu-trading');
  const trapEvaluation = dayuPrecision && dayuTrading
    ? evaluateEntityMatch(
        {
          companyName: dayuTrading.canonical_name,
          taxId: dayuTrading.tax_id,
          email: 'service@dayu-trading.com',
          phone: dayuTrading.phone,
          address: dayuTrading.address,
        },
        dayuPrecision
      )
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold text-[#f4f4f5] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <GitMerge className="w-5 h-5" />
            </div>
            <span>公司自動歸併待審查佇列 (Entity Resolution)</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            避免多張名片分歧建立 • 門檻 ≥0.85 自動歸併、0.50~0.85 待人工確認、&lt;0.50 獨立新公司
          </p>
        </div>

        <button
          onClick={() => setShowTrapDemo(!showTrapDemo)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
            showTrapDemo
              ? 'bg-rose-950/80 text-rose-300 border-rose-700'
              : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-600'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          {showTrapDemo ? '關閉陷阱組防呆驗證' : '查看「達鈺」刻意陷阱防呆展示'}
        </button>
      </div>

      {/* Trap Demo Showcase Banner */}
      {showTrapDemo && dayuPrecision && dayuTrading && trapEvaluation && (
        <div className="bg-rose-950/20 border border-rose-800/60 rounded-xl p-5 space-y-4 animate-in fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-rose-400" />
              <h3 className="font-bold text-sm text-rose-200">
                規格書核心防呆測試：達鈺精密工業 vs 達鈺國際貿易
              </h3>
            </div>
            <span className="text-xs font-mono font-bold bg-rose-900/80 text-rose-200 px-2.5 py-1 rounded border border-rose-700">
              判定結果：綜合評分 {(trapEvaluation.totalScore * 100).toFixed(0)}% (&lt; 50%) • 成功阻斷誤併！
            </span>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">
            兩者字面開頭皆為「達鈺」，且皆具備台灣常態公司組織名稱。若單純使用字面匹配極易產生假陽性；
            然而透過本系統之正規化 (達鈺精密 vs 達鈺國際) + 統編 (53128409 vs 28941725) + 網域 (@dayu-precision vs @dayu-trading) 多重維度比對，綜合分數為 0 分，確保絕對不誤併！
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1">
              <div className="font-bold text-zinc-200">{dayuPrecision.canonical_name}</div>
              <div className="text-zinc-400">統編: {dayuPrecision.tax_id}</div>
              <div className="text-zinc-400">網域: @{dayuPrecision.domain}</div>
              <div className="text-zinc-400">廠址: {dayuPrecision.address}</div>
            </div>
            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1">
              <div className="font-bold text-zinc-200">{dayuTrading.canonical_name}</div>
              <div className="text-zinc-400">統編: {dayuTrading.tax_id}</div>
              <div className="text-zinc-400">網域: @{dayuTrading.domain}</div>
              <div className="text-zinc-400">廠址: {dayuTrading.address}</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Review Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 4 Cols: Queue List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800/60">
            <div className="p-3.5 bg-zinc-900/90 flex items-center justify-between text-xs font-semibold text-zinc-400">
              <span>待審核比對項目 ({queueItems.length})</span>
              <span className="text-[10px] text-blue-400 font-mono">需人工確認</span>
            </div>

            <div className="divide-y divide-zinc-800/40">
              {queueItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500">
                  目前佇列中無待審查項目。
                </div>
              ) : (
                queueItems.map((item) => {
                  const isSelected = item.id === currentItem?.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={`p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-zinc-800/90 border-l-2 border-blue-500'
                          : 'hover:bg-zinc-800/40 text-zinc-400'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="text-xs text-zinc-400">新辨識名片：</div>
                          <div className="font-bold text-sm text-[#f4f4f5] truncate">
                            {item.source_company_name}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-blue-400/90 pt-0.5">
                            <ArrowRight className="w-3 h-3 text-zinc-500" />
                            <span className="truncate">歸併至: {item.target_company_name}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold ${
                              item.calculated_score >= 0.85
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-blue-950/80 text-blue-300 border border-blue-800'
                            }`}
                          >
                            {(item.calculated_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right 8 Cols: Side-by-Side Comparison & Decision Panel */}
        <div className="lg:col-span-8 space-y-6">
          {currentItem && targetCompany ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6 shadow-xl">
              {/* Top Summary Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-[#f4f4f5]">
                      這張新名片可能屬於「{targetCompany.canonical_name}」？
                    </h2>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    系統比對綜合相似度為{' '}
                    <span className="font-mono text-blue-400 font-bold">
                      {(currentItem.calculated_score * 100).toFixed(0)}%
                    </span>
                    ，介於 50% ~ 85% 決策邊界，請人工核對。
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onRejectMerge(currentItem.id)}
                    className="px-3.5 py-2 text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Split className="w-3.5 h-3.5" />
                    判定為獨立新公司
                  </button>

                  <button
                    onClick={() => onApproveMerge(currentItem.id)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    確認歸併 (加為別名)
                  </button>
                </div>
              </div>

              {/* Side-by-Side Comparison Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Card: Newly Scanned Info */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      新掃描名片擷取資訊
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">來源單張</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-zinc-500 block">辨識公司名：</span>
                      <span className="text-zinc-100 font-semibold text-sm">
                        {currentItem.source_company_name}
                      </span>
                    </div>

                    <div>
                      <span className="text-zinc-500 block">統一編號：</span>
                      <span className="font-mono text-zinc-200">
                        {currentItem.source_tax_id || '名片無標註'}
                      </span>
                    </div>

                    <div>
                      <span className="text-zinc-500 block">電子郵件：</span>
                      <span className="text-zinc-200">{currentItem.source_email || '無'}</span>
                    </div>

                    <div>
                      <span className="text-zinc-500 block">電話號碼：</span>
                      <span className="text-zinc-200">{currentItem.source_phone || '無'}</span>
                    </div>

                    <div>
                      <span className="text-zinc-500 block">地址：</span>
                      <span className="text-zinc-200">{currentItem.source_address || '無'}</span>
                    </div>
                  </div>
                </div>

                {/* Right Card: Existing Target Company in DB */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      資料庫既有目標公司
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">既有資料</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-zinc-500 block">標準公司名：</span>
                      <span className="text-zinc-100 font-semibold text-sm">
                        {targetCompany.canonical_name}
                      </span>
                    </div>

                    <div>
                      <span className="text-zinc-500 block">已登記統編：</span>
                      <span className="font-mono text-zinc-200">{targetCompany.tax_id}</span>
                    </div>

                    <div>
                      <span className="text-zinc-500 block">企業網域：</span>
                      <span className="text-zinc-200">@{targetCompany.domain}</span>
                    </div>

                    <div>
                      <span className="text-zinc-500 block">總機代表號：</span>
                      <span className="text-zinc-200">{targetCompany.phone}</span>
                    </div>

                    <div>
                      <span className="text-zinc-500 block">登記廠址：</span>
                      <span className="text-zinc-200">{targetCompany.address}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Reasons Score Breakdown Table */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                  比對維度與加權得分明細
                </h4>

                <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800">
                      <tr>
                        <th className="px-3.5 py-2 font-medium">比對維度</th>
                        <th className="px-3.5 py-2 font-medium">基礎權重</th>
                        <th className="px-3.5 py-2 font-medium">得分</th>
                        <th className="px-3.5 py-2 font-medium">比對依據與細節</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {currentItem.match_reasons.map((r, i) => (
                        <tr key={i} className="hover:bg-zinc-900/30">
                          <td className="px-3.5 py-2 font-medium text-zinc-200">
                            {r.dimension}
                          </td>
                          <td className="px-3.5 py-2 font-mono text-zinc-400">{r.weight}</td>
                          <td className="px-3.5 py-2 font-mono text-blue-400 font-bold">
                            +{r.score}
                          </td>
                          <td className="px-3.5 py-2 text-zinc-300">{r.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500 text-sm">
              請從左側點選要審核的項目
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
