import React, { useState, useEffect, useRef } from 'react';
import { Card, Contact, Company } from '../types';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Mail,
  Building2,
  Download,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  Save,
  Layers,
} from 'lucide-react';
import { validateTaiwanTaxId, validateTaiwanMobile, getTitleRankMeta } from '../utils/entityResolution';
import { downloadVCard } from '../utils/exportTools';

interface CardDetailModalProps {
  card: Card;
  contact: Contact;
  company: Company;
  onClose: () => void;
  onSave: (updatedContact: Contact, updatedCard: Card) => void;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  card,
  contact,
  company,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Contact>({ ...contact });
  const [showBoxes, setShowBoxes] = useState<boolean>(true);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab' || !dialog) return;
      const elements = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]')].filter(el => el.getClientRects().length > 0);
      const first = elements[0], last = elements.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      timers.current.forEach(clearTimeout);
      previous?.focus();
    };
  }, []);

  // Validation states
  const taxIdVal = validateTaiwanTaxId(company.tax_id);
  const mobileValid = validateTaiwanMobile(formData.mobile);
  const rankMeta = getTitleRankMeta(formData.title_rank);

  const handleFieldChange = (field: keyof Contact, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    const updatedCard: Card = {
      ...card,
      is_verified: true,
    };
    onSave(formData, updatedCard);
    setSaveSuccess(true);
    timers.current.push(setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800));
  };

  const handleCopyAll = async () => {
    const text = `姓名: ${formData.name}\n公司: ${company.canonical_name}\n職稱: ${formData.title_raw} (權重: ${formData.title_rank})\n手機: ${formData.mobile}\n市話: ${formData.direct_phone} 分機 ${formData.extension}\nEmail: ${formData.email}\n地址: ${company.address}\n統編: ${company.tax_id}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      timers.current.push(setTimeout(() => setCopied(false), 2000));
    } catch { setCopied(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="名片辨識核對與欄位編輯" tabIndex={-1} className="bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-[#f4f4f5]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
              OCR
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#f4f4f5] flex items-center gap-2">
                <span>名片辨識核對與欄位編輯</span>
                {card.is_verified ? (
                  <span className="text-[11px] font-mono px-2 py-0.5 bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    已人工核對
                  </span>
                ) : (
                  <span className="text-[11px] font-mono px-2 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-800/60 rounded flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    待核對確認
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-400">
                模擬指紋（非影像雜湊）: <span className="font-mono text-zinc-400">{card.image_sha256.substring(0, 16)}...</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAll}
              className="px-3 py-1.5 text-xs text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '已複製' : '複製全部'}
            </button>

            <button
              onClick={() => downloadVCard(formData, company)}
              className="px-3 py-1.5 text-xs text-blue-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              vCard
            </button>

            <button
            aria-label="關閉名片詳情"
            onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Split view (Top/Left: Card Image & OCR, Bottom/Right: Editable Form) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Card Image & Bounding Box Overlay */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-semibold text-zinc-200">
                名片原圖採集（RapidOCR / VLM 版面座標比對）
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowBoxes(!showBoxes)}
                  className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition-colors ${
                    showBoxes
                      ? 'bg-blue-600/10 text-blue-300 border-blue-500/30'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  {showBoxes ? '隱藏 OCR 錨點' : '顯示 OCR 錨點'}
                </button>
                <button
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200"
                >
                  {isZoomed ? <ZoomOut className="w-3 h-3" /> : <ZoomIn className="w-3 h-3" />}
                  {isZoomed ? '還原縮放' : '放大檢視'}
                </button>
              </div>
            </div>

            <div className="relative bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex items-center justify-center p-2 min-h-[220px]">
              <div
                className={`relative transition-all duration-300 ${
                  isZoomed ? 'scale-125 my-8' : 'scale-100'
                } max-w-lg w-full aspect-[16/9] rounded-lg overflow-hidden border border-zinc-700/80 shadow-2xl bg-zinc-900 flex items-center justify-center`}
              >
                <img
                  src={card.image_url}
                  alt="名片原圖"
                  className="w-full h-full object-cover"
                />

                {/* Simulated Bounding Boxes Overlay */}
                {showBoxes &&
                  card.ocr_boxes.map((box, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'absolute',
                        left: `${box.x}%`,
                        top: `${box.y}%`,
                        width: `${box.width}%`,
                        height: `${box.height}%`,
                      }}
                      className="border border-blue-400/80 bg-blue-500/15 group cursor-pointer hover:bg-blue-500/30 transition-all rounded-sm flex items-start"
                      title={`${box.text} (信心度: ${(box.confidence * 100).toFixed(0)}%)`}
                    >
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 text-blue-300 text-[9px] px-1 rounded pointer-events-none -mt-4 whitespace-nowrap z-10 border border-blue-500/40">
                        {box.text} ({(box.confidence * 100).toFixed(0)}%)
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Section 2: Editable Structured Fields */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              結構化抽取出之欄位（標記黃底為信心度 &lt; 0.8 或格式待確認）
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Field: Name */}
              <div
                className={`p-3 rounded-lg border ${
                  card.confidence_scores.name < 0.8
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <label className="text-zinc-400 font-medium">姓名 (Name)</label>
                  <span className="text-[10px] font-mono text-zinc-400">
                    信心度: {(card.confidence_scores.name * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-[#f4f4f5] rounded px-2.5 py-1.5 text-sm font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Field: Title & Rank */}
              <div
                className={`p-3 rounded-lg border ${
                  card.confidence_scores.title < 0.8
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <label className="text-zinc-400 font-medium">原始職稱 (Title)</label>
                  <span className="text-[10px] font-mono text-zinc-400">
                    職級: {formData.title_rank} ({rankMeta.label})
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.title_raw}
                    onChange={(e) => handleFieldChange('title_raw', e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-700 text-[#f4f4f5] rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <select
                    value={formData.title_rank}
                    onChange={(e) => handleFieldChange('title_rank', Number(e.target.value))}
                    className="bg-zinc-900 border border-zinc-700 text-blue-400 text-xs rounded px-2 focus:outline-none"
                  >
                    <option value={95}>95 (董事長)</option>
                    <option value={90}>90 (總經理/CEO)</option>
                    <option value={80}>80 (副總/協理)</option>
                    <option value={70}>70 (廠長/處長)</option>
                    <option value={60}>60 (經理)</option>
                    <option value={50}>50 (副理/課長)</option>
                    <option value={40}>40 (組長/主任)</option>
                    <option value={30}>30 (工程師/專員)</option>
                    <option value={20}>20 (助理)</option>
                  </select>
                </div>
              </div>

              {/* Field: Mobile Phone */}
              <div
                className={`p-3 rounded-lg border ${
                  !mobileValid || card.confidence_scores.mobile < 0.8
                    ? 'bg-amber-500/10 border-amber-500/40'
                    : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <label className="text-zinc-400 font-medium flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    手機號碼 (Mobile 09XX)
                  </label>
                  {!mobileValid && (
                    <span className="text-[10px] text-amber-400 font-medium">
                      待確認格式
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.mobile}
                  onChange={(e) => handleFieldChange('mobile', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-[#f4f4f5] rounded px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Field: Direct Phone & Extension */}
              <div
                className={`p-3 rounded-lg border ${
                  card.confidence_scores.phone < 0.8
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <label className="text-zinc-400 font-medium">公司市話與分機</label>
                  <span className="text-[10px] font-mono text-zinc-400">
                    信心度: {(card.confidence_scores.phone * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.direct_phone}
                    onChange={(e) => handleFieldChange('direct_phone', e.target.value)}
                    placeholder="市話 02-..."
                    className="flex-1 bg-zinc-900 border border-zinc-700 text-[#f4f4f5] rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={formData.extension}
                    onChange={(e) => handleFieldChange('extension', e.target.value)}
                    placeholder="分機"
                    className="w-20 bg-zinc-900 border border-zinc-700 text-[#f4f4f5] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Field: Email */}
              <div
                className={`p-3 rounded-lg border ${
                  card.confidence_scores.email < 0.8
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <label className="text-zinc-400 font-medium flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    電子信箱 (Email)
                  </label>
                  <span className="text-[10px] font-mono text-zinc-400">
                    信心度: {(card.confidence_scores.email * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-[#f4f4f5] rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Field: Tax ID verification */}
              <div className="p-3 rounded-lg border bg-zinc-950 border-zinc-800">
                <div className="flex items-center justify-between text-xs mb-1">
                  <label className="text-zinc-400 font-medium flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    所屬公司統一編號
                  </label>
                  <span
                    className={`text-[10px] font-medium ${
                      taxIdVal.isValid ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {taxIdVal.reason}
                  </span>
                </div>
                <input
                  type="text"
                  disabled
                  value={company.tax_id || '未登記統編'}
                  className="w-full bg-zinc-900/60 border border-zinc-800 text-zinc-300 rounded px-2.5 py-1.5 text-sm font-mono cursor-not-allowed"
                />
              </div>

              {/* Field: Notes */}
              <div className="md:col-span-2 p-3 rounded-lg border bg-zinc-950 border-zinc-800">
                <label className="block text-xs text-zinc-400 font-medium mb-1">
                  商務備註與互動紀錄
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-[#f4f4f5] rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            取得場合：{card.acquired_event} ({card.acquired_at})
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-300 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700"
            >
              取消
            </button>

            <button
              onClick={handleSave}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-600/20"
            >
              <Save className="w-4 h-4" />
              {saveSuccess ? '已儲存核對！' : '確認核對並儲存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
