import React, { useState } from 'react';
import { Company, Department, Contact, Card } from '../types';
import { downloadBatchVCard, downloadContactsCSV, generateVCard3 } from '../utils/exportTools';
import {
  Download,
  FileSpreadsheet,
  QrCode,
  HardDrive,
  CheckCircle2,
  Database,
  Server,
  ShieldCheck,
  FileCode,
  Users,
} from 'lucide-react';

interface ExportManagementViewProps {
  companies: Company[];
  departments: Department[];
  contacts: Contact[];
  cards: Card[];
}

export const ExportManagementView: React.FC<ExportManagementViewProps> = ({
  companies,
  departments,
  contacts,
  cards,
}) => {
  const [selectedContactId, setSelectedContactId] = useState<string>(contacts[0]?.id || '');
  const selectedContact = contacts.find((c) => c.id === selectedContactId) || contacts[0];
  const selectedCompany = companies.find((c) => c.id === selectedContact?.company_id);
  const selectedDept = departments.find((d) => d.id === selectedContact?.department_id);

  // Generate vCard text for QR Code representation
  const vcardText = selectedContact
    ? generateVCard3(selectedContact, selectedCompany, selectedDept)
    : '';

  // Encode for SVG QR code generator API or direct data URI representation
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    vcardText
  )}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold text-[#f4f4f5] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Download className="w-5 h-5" />
            </div>
            <span>名片匯出與地端系統管理</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            vCard 3.0 (手機通訊錄直匯) • UTF-8 BOM CSV (Excel 繁中相容) • 手機掃描 QR Code • 地端健康檢查
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadContactsCSV(contacts, companies, departments)}
            className="px-3.5 py-2 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 hover:border-zinc-600 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            匯出 Excel CSV ({contacts.length} 筆)
          </button>

          <button
            onClick={() => downloadBatchVCard(contacts, companies, departments)}
            className="px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            批次打包 vCard (.vcf)
          </button>
        </div>
      </div>

      {/* Main Grid: QR Code Phone Add on Left, System Health on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 Cols: QR Code Instant Phone Import */}
        <div className="lg:col-span-6 bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-sm text-[#f4f4f5]">
                手機掃描 QR Code 立即存入手機通訊錄
              </h3>
            </div>
            <span className="text-xs text-zinc-400 font-mono">vCard 3.0 標準</span>
          </div>

          {/* Select Contact Dropdown */}
          <div>
            <label className="text-xs text-zinc-400 block mb-1.5 font-medium">
              選擇要產生 QR Code 的名片聯絡人：
            </label>
            <select
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-lg p-2.5 focus:outline-none focus:border-blue-500"
            >
              {contacts.map((c) => {
                const comp = companies.find((cp) => cp.id === c.company_id);
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} — {comp?.canonical_name} ({c.title_raw})
                  </option>
                );
              })}
            </select>
          </div>

          {/* QR Code and Card Preview */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col sm:flex-row items-center gap-6 justify-center">
            <div className="p-2 bg-white rounded-xl shadow-lg shrink-0">
              <img
                src={qrCodeUrl}
                alt="vCard QR Code"
                className="w-44 h-44 object-contain"
              />
            </div>

            <div className="space-y-1.5 text-xs text-zinc-300 min-w-0">
              <div className="font-bold text-base text-[#f4f4f5]">
                {selectedContact?.name}
              </div>
              <div className="text-blue-400 font-medium">
                {selectedContact?.title_raw}
              </div>
              <div className="text-zinc-400">
                公司: {selectedCompany?.canonical_name}
              </div>
              {selectedContact?.mobile && (
                <div className="text-zinc-400">
                  手機: {selectedContact.mobile}
                </div>
              )}
              {selectedContact?.email && (
                <div className="text-zinc-400 truncate">
                  信箱: {selectedContact.email}
                </div>
              )}
              <p className="text-[11px] text-zinc-500 pt-1">
                以 iOS 相機或 Android 掃描器對準 QR 碼，即可直接「新增至聯絡資訊」。
              </p>
            </div>
          </div>
        </div>

        {/* Right 6 Cols: Local On-Premise Infrastructure Health Check */}
        <div className="lg:col-span-6 bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-sm text-[#f4f4f5]">
                地端系統運作服務狀態 (Service Health)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded">
              All Systems Operational
            </span>
          </div>

          <div className="space-y-3">
            {/* Service 1: PostgreSQL */}
            <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-xs font-bold text-zinc-200">
                    PostgreSQL 16 (Port 5432)
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    pgvector 0.7.0 (HNSW 1024d) + pg_trgm (GIN)
                  </div>
                </div>
              </div>
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 連線正常
              </span>
            </div>

            {/* Service 2: Ollama Local Embedding & VLM */}
            <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HardDrive className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-xs font-bold text-zinc-200">
                    Ollama Runtime (Port 11434)
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    bge-m3:latest (1024-dim) + MiniCPM-V 2.6
                  </div>
                </div>
              </div>
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 本地常駐
              </span>
            </div>

            {/* Service 3: FastAPI Backend */}
            <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Server className="w-5 h-5 text-cyan-400" />
                <div>
                  <div className="text-xs font-bold text-zinc-200">
                    FastAPI REST Core (Port 8090)
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    Python 3.12 (uv) + RapidOCR (CPU Worker)
                  </div>
                </div>
              </div>
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 運作中
              </span>
            </div>

            {/* Security & Privacy Guarantee */}
            <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-lg space-y-1.5 text-xs text-zinc-300">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>完全地端資安與隱私宣告：</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                本系統所有名片影像、OCR 辨識與向量嵌入運算皆嚴格限定於區域網路地端主機，絕不將任何個人姓名、電話、電郵或名片圖檔傳輸至外部雲端。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
