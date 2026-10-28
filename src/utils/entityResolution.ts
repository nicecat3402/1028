import { TitleRankNumber, Company } from '../types';

/**
 * PostgreSQL pg_trgm algorithm:
 * Word is padded with 2 leading spaces and 1 trailing space ("  " + s + " ").
 * All 3-character slices are extracted into a set of trigrams.
 */
export function getPgTrigrams(s: string): Set<string> {
  if (!s) return new Set();
  const clean = s.trim();
  const padded = '  ' + clean + ' ';
  const trigrams = new Set<string>();
  for (let i = 0; i <= padded.length - 3; i++) {
    trigrams.add(padded.substring(i, i + 3));
  }
  return trigrams;
}

/**
 * Calculate Jaccard similarity between trigram sets:
 * similarity = |A ∩ B| / |A ∪ B|
 */
export function computePgTrgmSimilarity(a: string, b: string): {
  similarity: number;
  trigramsA: string[];
  trigramsB: string[];
  intersection: string[];
  unionCount: number;
} {
  const setA = getPgTrigrams(a);
  const setB = getPgTrigrams(b);
  const listA = Array.from(setA);
  const listB = Array.from(setB);

  const intersection: string[] = [];
  setA.forEach((item) => {
    if (setB.has(item)) {
      intersection.push(item);
    }
  });

  const unionSet = new Set([...listA, ...listB]);
  const unionCount = unionSet.size;
  const similarity = unionCount === 0 ? 0 : intersection.length / unionCount;

  return {
    similarity: Math.round(similarity * 10000) / 10000,
    trigramsA: listA,
    trigramsB: listB,
    intersection,
    unionCount,
  };
}

/**
 * Convenience helper returning numeric similarity
 */
export function calculateTrigramSimilarity(a: string, b: string): number {
  return computePgTrgmSimilarity(a, b).similarity;
}

/**
 * Company Name Normalization (備援方案 1 核心)
 * - 移除組織後綴：股份有限公司、有限公司、(股)、(有)、企業社、工廠、Co., Ltd.、Inc.、Corp.、LLC
 * - 全形轉半形、繁簡統一、小寫
 * - 移除標點符號與多餘空白
 */
export function normalizeCompanyName(name: string): string {
  if (!name) return '';

  let normalized = name.trim();

  // Full-width to half-width for alphanumeric
  normalized = normalized.replace(/[\uFF01-\uFF5E]/g, (ch) => {
    return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
  });

  // Remove common Taiwan / Global corporate suffixes
  const suffixes = [
    /股份有限公司/gi,
    /有限公司/gi,
    /企業社/gi,
    /實業社/gi,
    /工廠/gi,
    /\(股\)/gi,
    /（股）/gi,
    /\(有\)/gi,
    /（有）/gi,
    /co\.,?\s*ltd\.?/gi,
    /corporation/gi,
    /corp\.?/gi,
    /incorporated/gi,
    /inc\.?/gi,
    /llc/gi,
    /gmbh/gi,
    /group/gi,
    /集團/gi,
  ];

  for (const pattern of suffixes) {
    normalized = normalized.replace(pattern, '');
  }

  // Remove punctuation & brackets
  normalized = normalized.replace(/[()（）「」『』,.\-_—/\\#\s]/g, '');

  return normalized.toLowerCase().trim();
}

/**
 * 台灣統一編號 8 碼演算法驗證
 * 乘數：[1, 2, 1, 2, 1, 2, 4, 1]
 * 2023 年起採 mod 5；第 7 位為 7 時，數位和 10 可視為 0 或 1（sum 與 sum+1 模 5）。
 * 僅檢查格式／檢查碼，不代表該號碼已登記。
 */
export function validateTaiwanTaxId(taxId: string): { isValid: boolean; reason: string } {
  if (!taxId) return { isValid: false, reason: '統編為空' };
  const clean = taxId.replace(/\s+/g, '');
  if (!/^\d{8}$/.test(clean)) {
    return { isValid: false, reason: '必須為 8 碼數字' };
  }

  const weights = [1, 2, 1, 2, 1, 2, 4, 1];
  const digits = clean.split('').map(Number);

  let sum = 0;
  for (let i = 0; i < 8; i++) {
    const product = digits[i] * weights[i];
    // 十位數 + 個位數
    sum += Math.floor(product / 10) + (product % 10);
  }

  if (clean === '00000000') return { isValid: false, reason: '全零為示意佔位值，不可作為統編' };
  if (sum % 5 === 0) {
    return { isValid: true, reason: '合法統一編號（標準檢核碼通過）' };
  }

  // 例外規則：第 7 碼 (index 6) 為 7
  if (digits[6] === 7) {
    // 當第 7 碼是 7，乘數 4 產生 28，十位數加個位數為 10
    // 10 -> 1 相差 -9，mod 5 下等價於 sum+1。
    const altSum = sum + 1;
    if (altSum % 5 === 0) {
      return { isValid: true, reason: '合法統一編號（第 7 位為 7 之特殊規則通過）' };
    }
  }

  return { isValid: false, reason: '檢核碼驗證失敗（非合法統編）' };
}

/**
 * 台灣手機號碼驗證
 * 支援 09XXXXXXXX / +886-9XXXXXXXX / 09XX-XXX-XXX
 */
export function validateTaiwanMobile(mobile: string): boolean {
  if (!mobile) return false;
  const clean = mobile.replace(/[-+ \s()]/g, '');
  return /^09\d{8}$/.test(clean) || /^8869\d{8}$/.test(clean);
}

/**
 * 判斷是否為公用或免費 Email 網域 (不可作為企業比對依據)
 */
export function isFreeEmailDomain(domain: string): boolean {
  if (!domain) return true;
  const d = domain.toLowerCase().trim();
  const freeDomains = [
    'gmail.com',
    'yahoo.com',
    'yahoo.com.tw',
    'hotmail.com',
    'outlook.com',
    'icloud.com',
    'msn.com',
    'me.com',
    'qq.com',
    '163.com',
  ];
  return freeDomains.some((f) => d.includes(f));
}

export interface MatchEvaluation {
  dimension: string;
  weight: number;
  score: number;
  detail: string;
}

export interface EntityResolutionResult {
  totalScore: number;
  decision: 'auto_merge' | 'merge_queue' | 'new_company';
  reasons: MatchEvaluation[];
  isNormalizedIdentical: boolean;
}

/**
 * Entity Resolution Engine (修正後定案演算法)
 * 權重分佈：
 * 1. 統一編號完全相符: 1.00 (黃金鍵)
 * 2. 企業 Email 網域相符: 0.85 (排除免費信箱)
 * 3. 正規化公司名完全相符: 0.80
 * 4. 正規化公司名 Trigram 相似度: 0.40 (僅在去後綴後的短名上計算)
 * 5. 總機電話主號相符: 0.35
 * 6. 標準化地址相符: 0.25
 *
 * 門檻：
 * >= 0.85: 自動歸併
 * 0.50 ~ 0.85: 排入待確認佇列
 * < 0.50: 獨立建立新公司
 */
export function evaluateEntityMatch(
  source: {
    companyName: string;
    taxId?: string;
    email?: string;
    phone?: string;
    address?: string;
  },
  target: Company
): EntityResolutionResult {
  const evaluations: MatchEvaluation[] = [];

  // 1. 統一編號
  if (source.taxId && target.tax_id) {
    const cleanSourceTax = source.taxId.trim();
    const cleanTargetTax = target.tax_id.trim();
    const isValid = validateTaiwanTaxId(cleanSourceTax).isValid;

    if (isValid && cleanSourceTax === cleanTargetTax) {
      evaluations.push({
        dimension: '統一編號 (8碼)',
        weight: 1.0,
        score: 1.0,
        detail: `統編完全相符 (${cleanSourceTax})，直接達到黃金判定`,
      });
    }
  }

  // 2. Email 網域
  if (source.email && target.domain) {
    const emailDomain = source.email.split('@')[1]?.toLowerCase().trim() || '';
    const targetDomain = target.domain.replace(/^@/, '').toLowerCase().trim();

    if (emailDomain && targetDomain && !isFreeEmailDomain(emailDomain)) {
      if (emailDomain === targetDomain || emailDomain.endsWith('.' + targetDomain)) {
        evaluations.push({
          dimension: '企業 Email 網域',
          weight: 0.85,
          score: 0.85,
          detail: `企業專用網域相符 (@${targetDomain})`,
        });
      }
    }
  }

  // 3. 正規化公司名稱完全相符
  const normSource = normalizeCompanyName(source.companyName);
  const normTarget = normalizeCompanyName(target.canonical_name);
  const isNormExact = normSource.length > 1 && normSource === normTarget;

  // Check aliases too
  const matchesAlias = target.aliases?.some(
    (alias) => normalizeCompanyName(alias) === normSource
  );

  if (isNormExact || matchesAlias) {
    evaluations.push({
      dimension: '正規化名稱完全相符',
      weight: 0.8,
      score: 0.8,
      detail: `去除後綴後核心名一致（${normSource} ↔ ${normTarget}）`,
    });
  }

  // 4. 正規化公司名稱 Trigram 相似度 (在正規化後的名稱計算)
  if (!isNormExact && normSource && normTarget) {
    const trigramResult = computePgTrgmSimilarity(normSource, normTarget);
    if (trigramResult.similarity >= 0.65) {
      evaluations.push({
        dimension: '正規化 Trigram 模糊度',
        weight: 0.4,
        score: Math.round(trigramResult.similarity * 0.4 * 100) / 100,
        detail: `正規化核心名稱 Trigram 相似度高達 ${(trigramResult.similarity * 100).toFixed(1)}%`,
      });
    }
  }

  // 5. 總機電話主號相符 (排除分機)
  if (source.phone && target.phone) {
    const cleanSourcePhone = source.phone.replace(/分機.*|ext.*|#.*/gi, '').replace(/\D/g, '');
    const cleanTargetPhone = target.phone.replace(/分機.*|ext.*|#.*/gi, '').replace(/\D/g, '');

    if (cleanSourcePhone.length >= 8 && cleanSourcePhone === cleanTargetPhone) {
      evaluations.push({
        dimension: '總機代表號相符',
        weight: 0.35,
        score: 0.35,
        detail: `市話代表號相符 (${target.phone})`,
      });
    }
  }

  // 6. 地址標準化相符
  if (source.address && target.address) {
    const cleanSourceAddr = source.address.replace(/[縣市區鄉鎮路街段巷弄號樓\s]/g, '');
    const cleanTargetAddr = target.address.replace(/[縣市區鄉鎮路街段巷弄號樓\s]/g, '');

    if (cleanSourceAddr.length > 5 && cleanTargetAddr.includes(cleanSourceAddr.substring(0, 8))) {
      evaluations.push({
        dimension: '標準化地址相符',
        weight: 0.25,
        score: 0.25,
        detail: `縣市與路段高契合度`,
      });
    }
  }

  // Calculate composite score (capped at 1.0)
  // We take the max of absolute high-confidence keys or the normalized sum
  let totalScore = 0;
  evaluations.forEach((e) => {
    totalScore += e.score;
  });
  totalScore = Math.min(1.0, Math.round(totalScore * 100) / 100);

  let decision: 'auto_merge' | 'merge_queue' | 'new_company';
  if (totalScore >= 0.85) {
    decision = 'auto_merge';
  } else if (totalScore >= 0.5) {
    decision = 'merge_queue';
  } else {
    decision = 'new_company';
  }

  return {
    totalScore,
    decision,
    reasons: evaluations,
    isNormalizedIdentical: isNormExact,
  };
}

/**
 * 職稱正規化權重對照與階層等級
 */
export function getTitleRankMeta(rank: TitleRankNumber): {
  label: string;
  category: string;
  badgeColor: string;
} {
  switch (rank) {
    case 95:
      return { label: '董事長 / 負責人 / 創辦人', category: '決策高層', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    case 90:
      return { label: '總經理 / 執行長 / CEO', category: '核心首長', badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30' };
    case 80:
      return { label: '副總經理 / 協理', category: '高階主管', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
    case 70:
      return { label: '廠長 / 處長 / 資深經理', category: '部門首長', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    case 60:
      return { label: '經理 / Manager', category: '中階主管', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
    case 50:
      return { label: '副理 / 課長', category: '基層主管', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    case 40:
      return { label: '組長 / 主任 / Supervisor', category: '現場督導', badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30' };
    case 30:
      return { label: '工程師 / 專員 / 業務代表', category: '專業執行', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
    case 20:
      return { label: '助理 / Assistant', category: '行政支援', badgeColor: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30' };
    default:
      return { label: '未定職級', category: '其他', badgeColor: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
  }
}

/**
 * Infer Title Rank (95 to 20) from raw title string
 */
export function inferTitleRank(titleRaw: string): TitleRankNumber {
  if (!titleRaw) return 30;
  const t = titleRaw.toLowerCase();

  if (/董事長|創辦人|負責人|chairman|founder/i.test(t)) return 95;
  if (/副總|協理|\bvp\b|vice president/i.test(t)) return 80;
  if (/總經理|執行長|總監|財務長|技術長|營運長|首席.*官|\b(ceo|cto|cfo|coo|president)\b|managing director/i.test(t)) return 90;
  if (/廠長|處長|資深經理|director/i.test(t)) return 70;
  if (/經理|理級|manager/i.test(t)) return 60;
  if (/副理|課長|section chief/i.test(t)) return 50;
  if (/組長|主任|supervisor|leader/i.test(t)) return 40;
  if (/工程師|專員|業務|設計師|analyst|engineer|specialist/i.test(t)) return 30;
  if (/助理|管理員|總機|秘書|assistant/i.test(t)) return 20;

  return 30;
}
