import React, { useState } from 'react';
import {
  Company,
  Department,
  Contact,
  Card,
  TitleRankNumber,
} from '../types';
import { getTitleRankMeta } from '../utils/entityResolution';
import { downloadVCard } from '../utils/exportTools';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  ChevronRight,
  Star,
  Copy,
  Check,
  Download,
  Eye,
  Network,
  Users,
  Tag,
  ShieldAlert,
} from 'lucide-react';

interface CardsDirectoryProps {
  companies: Company[];
  departments: Department[];
  contacts: Contact[];
  cards: Card[];
  onSelectCard: (card: Card, contact: Contact, company: Company) => void;
  onUpdateContact: (contact: Contact) => void;
}

export const CardsDirectory: React.FC<CardsDirectoryProps> = ({
  companies,
  departments,
  contacts,
  cards,
  onSelectCard,
}) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companies[0]?.id || '');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'hierarchy' | 'org_chart'>('hierarchy');
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({
    'd-jd-exec': true,
    'd-jd-rd': true,
    'd-dp-mfg': true,
    'd-dp-procure': true,
    'd-dt-trade': true,
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Group departments and contacts for current company
  const currentCompany = companies.find((c) => c.id === selectedCompanyId) || companies[0];
  const companyDepts = departments.filter((d) => d.company_id === currentCompany?.id);
  const companyContacts = contacts.filter((c) => c.company_id === currentCompany?.id);
  const cardMap = new Map(cards.map((card) => [card.contact_id, card]));

  // Extract all unique industry tags
  const allTags = Array.from(new Set(companies.flatMap((c) => c.industry_tags)));

  // Filtered companies based on tag
  const filteredCompanies = selectedTag
    ? companies.filter((c) => c.industry_tags.includes(selectedTag))
    : companies;

  const toggleDept = (deptId: string) => {
    setExpandedDepts((prev) => ({
      ...prev,
      [deptId]: !prev[deptId],
    }));
  };

  const handleCopyContact = (c: Contact) => {
    const text = `${c.name} | ${c.title_raw}\n公司: ${currentCompany.canonical_name}\n手機: ${c.mobile}\n市話: ${c.direct_phone} 分機 ${c.extension}\nEmail: ${c.email}`;
    navigator.clipboard.writeText(text);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Directory Title & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold text-[#f4f4f5] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
            <span>公司階層人脈名片夾</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            預設依標準化企業主體歸併 • 部門階層 (部／課／組) 樹狀折疊 • 職級權重 (95~20) 自動排序
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="bg-zinc-900 border border-zinc-800 p-1 rounded-lg flex items-center">
            <button
              id="view-mode-hierarchy"
              onClick={() => setViewMode('hierarchy')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'hierarchy'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              階層折疊列表
            </button>
            <button
              id="view-mode-orgchart"
              onClick={() => setViewMode('org_chart')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'org_chart'
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              組織樹狀圖
            </button>
          </div>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Companies List & Tags (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Industry Tag Filters */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 mb-2">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-400" />
                產業領域快篩
              </span>
              {selectedTag && (
                <button
                  onClick={() => setSelectedTag(null)}
                  className="text-blue-400 hover:text-blue-300 text-[11px] underline"
                >
                  清除篩選
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                    selectedTag === tag
                      ? 'bg-blue-600/10 text-blue-300 border-blue-500/30 font-medium'
                      : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/60 hover:text-zinc-200 hover:border-zinc-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Companies List */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800">
            <div className="p-3 bg-zinc-900/90 text-xs font-semibold text-zinc-400 flex items-center justify-between">
              <span className="uppercase text-[11px] tracking-wider text-zinc-400 font-bold">已歸併公司 ({filteredCompanies.length})</span>
              <span className="text-[10px] text-zinc-500">點選切換公司</span>
            </div>

            <div className="max-h-[600px] overflow-y-auto divide-y divide-zinc-800/60">
              {filteredCompanies.map((company) => {
                const count = contacts.filter((c) => c.company_id === company.id).length;
                const isSelected = company.id === currentCompany?.id;
                const isTrap = company.id.includes('dayu');

                return (
                  <div
                    key={company.id}
                    id={`company-item-${company.id}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedCompanyId(company.id); } }}
                    onClick={() => setSelectedCompanyId(company.id)}
                    className={`p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-zinc-800/60 border-l-2 border-blue-500'
                        : 'hover:bg-zinc-800/40 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3
                            className={`font-semibold text-sm truncate ${
                              isSelected ? 'text-blue-300 font-bold' : 'text-zinc-200'
                            }`}
                          >
                            {company.canonical_name}
                          </h3>
                          {isTrap && (
                            <span className="bg-rose-950/80 text-rose-300 border border-rose-800/60 text-[10px] px-1 rounded font-mono">
                              陷阱組
                            </span>
                          )}
                        </div>

                        {company.aliases.length > 0 && (
                          <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                            <span className="text-zinc-500">別名:</span>
                            <span className="truncate">
                              {company.aliases.join('、')}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-2 text-xs text-zinc-400">
                          <span className="font-mono bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 text-[11px]">
                            統編 {company.tax_id}
                          </span>
                          <span className="truncate text-zinc-400">
                            @{company.domain}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-950 border border-zinc-800 text-blue-400">
                          {count} 人
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 8 Columns: Company Details & Hierarchical View */}
        <div className="lg:col-span-8 space-y-5">
          {/* Company Banner & Profile Card */}
          {currentCompany && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-[#f4f4f5]">
                      {currentCompany.canonical_name}
                    </h2>
                    {currentCompany.tax_id && (
                      <span className="font-mono text-xs px-2 py-0.5 bg-zinc-950 text-emerald-400 border border-emerald-500/20 rounded">
                        統編：{currentCompany.tax_id} <span className="text-emerald-500 font-sans ml-1">✓ 合法</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-zinc-400" />
                      <span>總機：{currentCompany.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-zinc-400" />
                      <span>企業網域：@{currentCompany.domain}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:col-span-2">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">廠址：{currentCompany.address}</span>
                    </div>
                  </div>

                  {currentCompany.notes && (
                    <div className="mt-2 text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{currentCompany.notes}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 sm:flex-col sm:items-end shrink-0">
                  {currentCompany.industry_tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* View Mode 1: Hierarchical Foldable Accordion (Company -> Dept -> Title Rank) */}
          {viewMode === 'hierarchy' ? (
            <div className="space-y-4">
              {companyDepts.length === 0 ? (
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-sm">
                  目前無登記部門，聯絡人直接歸屬於主公司。
                </div>
              ) : (
                companyDepts.map((dept) => {
                  const isExpanded = expandedDepts[dept.id] ?? true;
                  const deptContacts = companyContacts
                    .filter((c) => c.department_id === dept.id)
                    .sort((a, b) => b.title_rank - a.title_rank); // Sort by title_rank desc

                  return (
                    <div
                      key={dept.id}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm"
                    >
                      {/* Department Accordion Header */}
                      <button
                        onClick={() => toggleDept(dept.id)}
                        className="w-full px-4 py-3 bg-zinc-900 hover:bg-zinc-800/60 flex items-center justify-between border-b border-zinc-800 text-left transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-blue-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-zinc-400" />
                          )}
                          <div>
                            <span className="font-semibold text-sm text-zinc-200">
                              {dept.name}
                            </span>
                            {dept.code && (
                              <span className="ml-2 font-mono text-[10px] text-zinc-400 px-1.5 py-0.5 bg-zinc-950 rounded border border-zinc-800">
                                {dept.code}
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="text-xs text-zinc-400 font-mono">
                          {deptContacts.length} 位聯絡人
                        </span>
                      </button>

                      {/* Department Contacts List */}
                      {isExpanded && (
                        <div className="p-3 space-y-2.5">
                          {deptContacts.length === 0 ? (
                            <p className="text-xs text-zinc-500 py-3 text-center">
                              此部門尚無名片記錄
                            </p>
                          ) : (
                            deptContacts.map((contact) => {
                              const rankMeta = getTitleRankMeta(contact.title_rank);
                              const card = cardMap.get(contact.id);

                              return (
                                <div
                                  key={contact.id}
                                  id={`contact-card-${contact.id}`}
                                  className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl p-3.5 transition-all"
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    {/* Left: Contact Info */}
                                    <div className="space-y-1 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-base text-[#f4f4f5]">
                                          {contact.name}
                                        </span>

                                        {contact.is_primary_contact && (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-600/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                                            <Star className="w-3 h-3 fill-blue-400" />
                                            主要窗口
                                          </span>
                                        )}

                                        <span
                                          className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${rankMeta.badgeColor}`}
                                        >
                                          權重 {contact.title_rank} • {rankMeta.label}
                                        </span>
                                      </div>

                                      <div className="text-xs text-zinc-400 font-medium">
                                        {contact.title_raw}
                                      </div>

                                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 pt-1">
                                        {contact.mobile && (
                                          <span className="flex items-center gap-1 font-mono">
                                            <Phone className="w-3 h-3 text-zinc-500" />
                                            {contact.mobile}
                                          </span>
                                        )}
                                        {contact.direct_phone && (
                                          <span className="flex items-center gap-1">
                                            <span>市話: {contact.direct_phone}</span>
                                            {contact.extension && (
                                              <span className="text-blue-400 font-mono">
                                                分機 #{contact.extension}
                                              </span>
                                            )}
                                          </span>
                                        )}
                                        {contact.email && (
                                          <span className="flex items-center gap-1 text-zinc-300">
                                            <Mail className="w-3 h-3 text-zinc-500" />
                                            {contact.email}
                                          </span>
                                        )}
                                      </div>

                                      {contact.notes && (
                                        <p className="text-[11px] text-zinc-400 mt-1 italic">
                                          註記: {contact.notes}
                                        </p>
                                      )}
                                    </div>

                                    {/* Right: Quick Action Buttons */}
                                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                      {card && (
                                        <button
                                          onClick={() => onSelectCard(card, contact, currentCompany)}
                                          className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded-md border border-zinc-800 transition-colors"
                                          title="檢視名片原圖與 OCR 錨點"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                      )}

                                      <a
                                        href={`tel:${contact.mobile || contact.direct_phone}`}
                                        className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-md border border-zinc-800 transition-colors"
                                        title="撥打電話"
                                      >
                                        <Phone className="w-4 h-4" />
                                      </a>

                                      <a
                                        href={`mailto:${contact.email}`}
                                        className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded-md border border-zinc-800 transition-colors"
                                        title="發送郵件"
                                      >
                                        <Mail className="w-4 h-4" />
                                      </a>

                                      <button
                                        onClick={() => downloadVCard(contact, currentCompany, dept)}
                                        className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded-md border border-zinc-800 transition-colors"
                                        title="下載 vCard (.vcf)"
                                      >
                                        <Download className="w-4 h-4" />
                                      </button>

                                      <button
                                        onClick={() => handleCopyContact(contact)}
                                        className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md border border-zinc-800 transition-colors"
                                        title="複製全部聯絡資訊"
                                      >
                                        {copiedId === contact.id ? (
                                          <Check className="w-4 h-4 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-4 h-4" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* View Mode 2: Company Org Chart Tree View (依職級分層) */
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
              <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-[#f4f4f5] flex items-center gap-2">
                    <Network className="w-5 h-5 text-blue-400" />
                    <span>{currentCompany.canonical_name} • 組織職級人脈圖</span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    同公司內依 title_rank 權重自高階決策 (95) 排序至基層與行政 (20)
                  </p>
                </div>
              </div>

              {/* Ranks grouped ladder */}
              {[95, 90, 80, 70, 60, 50, 40, 30, 20].map((r) => {
                const rankNum = r as TitleRankNumber;
                const members = companyContacts.filter((c) => c.title_rank === rankNum);
                if (members.length === 0) return null;
                const meta = getTitleRankMeta(rankNum);

                return (
                  <div key={r} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${meta.badgeColor}`}
                      >
                        Rank {r} : {meta.label}
                      </span>
                      <div className="h-[1px] bg-zinc-800 flex-1"></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2">
                      {members.map((member) => {
                        const dept = companyDepts.find((d) => d.id === member.department_id);
                        const card = cardMap.get(member.id);

                        return (
                          <div
                            key={member.id}
                            role="button"
                            tabIndex={card ? 0 : -1}
                            onKeyDown={e => { if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelectCard(card, member, currentCompany); } }}
                            onClick={() => card && onSelectCard(card, member, currentCompany)}
                            className="bg-zinc-950 border border-zinc-800 hover:border-blue-500/50 p-3.5 rounded-xl cursor-pointer transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-zinc-100">
                                {member.name}
                              </span>
                              <span className="text-[11px] text-zinc-400 font-medium">
                                {dept?.name || '主公司'}
                              </span>
                            </div>
                            <div className="text-xs text-blue-300/90 mt-0.5">
                              {member.title_raw}
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-2 flex items-center justify-between font-mono">
                              <span className="font-sans">{member.email}</span>
                              <span>{member.mobile}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
