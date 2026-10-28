import React, { useState } from 'react';
import {
  FlaskConical,
  Cpu,
  ShieldCheck,
} from 'lucide-react';
import {
  normalizeCompanyName,
  calculateTrigramSimilarity,
  validateTaiwanTaxId,
} from '../utils/entityResolution';

export const VerificationTestbench: React.FC = () => {
  // Test A state: Trigram string testing
  const [compA, setCompA] = useState('珈鼎企業有限公司');
  const [compB, setCompB] = useState('珈鼎科技');

  // Test B state: Tax ID check
  const [testTaxId, setTestTaxId] = useState('24519803');

  // Normalization results
  const normA = normalizeCompanyName(compA);
  const normB = normalizeCompanyName(compB);
  const rawTrigram = calculateTrigramSimilarity(compA, compB);
  const normTrigram = calculateTrigramSimilarity(normA, normB);

  // Tax ID check
  const taxIdResult = validateTaiwanTaxId(testTaxId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold text-[#f4f4f5] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FlaskConical className="w-5 h-5" />
            </div>
            <span>階段 2 前置驗證試驗場 (Verification Testbench)</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            重現 docs/03_stage2_prep_verification.md 之驗證 A (Trigram 弱點補強) 與驗證 B (VLM Bake-off 實測架構)
          </p>
        </div>

        <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-full self-start">
          示範驗證台（效能與顯存數值為示意）
        </span>
      </div>

      {/* Verification A: Trigram Chinese Short String Tester */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm text-[#f4f4f5]">
              驗證 A 實測：繁體中文公司名正規化 (Normalization) 與 Trigram 相似度
            </h3>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            解決 pg_trgm 3字元切分在中文短字串假陰性之缺陷
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">測試公司名稱 A</label>
            <input
              type="text"
              value={compA}
              onChange={(e) => setCompA(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
            <div className="mt-1 text-xs text-zinc-400 font-mono">
              正規化去後綴：<span className="text-blue-400 font-bold">{normA}</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">測試公司名稱 B</label>
            <input
              type="text"
              value={compB}
              onChange={(e) => setCompB(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
            <div className="mt-1 text-xs text-zinc-400 font-mono">
              正規化去後綴：<span className="text-blue-400 font-bold">{normB}</span>
            </div>
          </div>
        </div>

        {/* Comparison Box */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-xs text-rose-400 font-medium block">
              未經正規化原始字串 Trigram 相似度
            </span>
            <div className="text-2xl font-mono font-bold text-rose-300">
              {(rawTrigram * 100).toFixed(1)}%
            </div>
            <p className="text-[11px] text-zinc-500">
              因為「股份有限公司/企業」稀釋權重，分數偏低易被誤判為不同公司（假陰性）。
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-emerald-400 font-medium block">
              經過正規化後純核心字串 Trigram 相似度
            </span>
            <div className="text-2xl font-mono font-bold text-emerald-400">
              {(normTrigram * 100).toFixed(1)}%
            </div>
            <p className="text-[11px] text-zinc-500">
              成功剔除共通組織字首字尾干擾，精確反映主要品牌識別度！
            </p>
          </div>
        </div>
      </div>

      {/* Verification B: Hardware VRAM Budget Allocation */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm text-[#f4f4f5]">
              驗證 B 決策架構：NVIDIA RTX 4070 Ti SUPER (16GB VRAM) 負載預算圖
            </h3>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            RapidOCR (CPU 3.1s) + Ollama VLM (GPU 1.1s)
          </span>
        </div>

        {/* VRAM allocation bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>總顯存：16,384 MB (16GB)</span>
            <span>常態峰值：約 7,858 MB (顯存餘裕 &gt; 50%)</span>
          </div>

          <div className="w-full bg-zinc-950 border border-zinc-800 rounded-full h-6 overflow-hidden flex">
            {/* ComfyUI idle baseline */}
            <div
              style={{ width: '2.5%' }}
              className="bg-zinc-700 h-full flex items-center justify-center text-[10px] text-zinc-200 font-mono"
              title="ComfyUI 常駐閒置: 358 MB"
            >
              ComfyUI
            </div>
            {/* Ollama bge-m3 */}
            <div
              style={{ width: '13.5%' }}
              className="bg-blue-600 h-full flex items-center justify-center text-[10px] text-white font-bold font-mono"
              title="bge-m3 1024d 向量模型: 2,200 MB"
            >
              bge-m3
            </div>
            {/* VLM Vision Language Model */}
            <div
              style={{ width: '32%' }}
              className="bg-purple-600/80 h-full flex items-center justify-center text-[10px] text-zinc-100 font-bold font-mono"
              title="MiniCPM-V 2.6 / Qwen2-VL: 5,300 MB"
            >
              VLM (MiniCPM-V)
            </div>
            {/* Free headroom */}
            <div
              style={{ width: '52%' }}
              className="bg-zinc-900/50 h-full flex items-center justify-center text-[10px] text-emerald-400 font-mono"
            >
              安全顯存緩衝區 (8,526 MB 可供爆發或批次)
            </div>
          </div>
        </div>

        {/* Bake-off benchmark summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
            <span className="font-bold text-zinc-200 block">
              方案一：glm-ocr (純端到端 VLM)
            </span>
            <ul className="space-y-1 text-zinc-400 list-disc list-inside">
              <li>單張推論耗時：23.4 秒（過慢）</li>
              <li>顯存佔用：5.8 GB</li>
              <li>易出現幻覺、數字統編錯字不易由 Regex 反向驗證</li>
              <li className="text-rose-400 font-semibold">結論：不採用</li>
            </ul>
          </div>

          <div className="p-4 bg-zinc-950 border border-emerald-900/40 rounded-lg space-y-2">
            <span className="font-bold text-emerald-400 block">
              方案二：RapidOCR (CPU) + MiniCPM-V 2.6 (VLM) (獲勝方案)
            </span>
            <ul className="space-y-1 text-zinc-300 list-disc list-inside">
              <li>單張總耗時：4.2 秒（RapidOCR 3.1s + VLM 1.1s）</li>
              <li>顯存佔用：4.3 GB</li>
              <li>文字檢測與版面座標由 CPU RapidOCR 錨定，數字精準度 100%</li>
              <li className="text-emerald-400 font-semibold">結論：已定案為階段 2 核心架構</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Verification C: Taiwan Tax ID Algorithm Check */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm text-[#f4f4f5]">
              台灣財政部統一編號 8 碼檢查碼演算法驗證
            </h3>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            乘數 [1, 2, 1, 2, 1, 2, 4, 1] • mod 10 / 第 7 碼為 7 邏輯
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <label className="text-xs text-zinc-400 block mb-1">
              輸入 8 碼統編測試（例如：24519803、53128409、12345678）
            </label>
            <input
              type="text"
              value={testTaxId}
              onChange={(e) => setTestTaxId(e.target.value.trim())}
              maxLength={8}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="sm:w-64">
            <label className="text-xs text-zinc-400 block mb-1">檢驗結果</label>
            <div
              className={`px-3 py-2 rounded text-xs font-mono font-bold border ${
                taxIdResult.isValid
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                  : 'bg-rose-950/80 text-rose-300 border-rose-800'
              }`}
            >
              {taxIdResult.isValid ? '✓ 合法台灣公司統編' : `✗ 非法 (${taxIdResult.reason})`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
