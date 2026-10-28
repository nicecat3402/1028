import { Contact, Company, Department, Card, SearchFilter, SearchResultItem, HitSource } from '../types';
import { computePgTrgmSimilarity, normalizeCompanyName } from './entityResolution';

// Semantic concept knowledge base for bge-m3 dense retrieval simulation
const SEMANTIC_CONCEPTS: {
  keywords: string[];
  semanticThemes: string[];
}[] = [
  {
    keywords: ['精密沖壓', '金屬沖壓', '模具', '沖床', '沖孔', '五金沖壓', '機構件'],
    semanticThemes: ['金屬加工', '精密沖壓', '模具設計', '機構組件', '0.02mm'],
  },
  {
    keywords: ['採購', '買家', '招標', '資材', '詢價', '發包', '供應商管理', '報價'],
    semanticThemes: ['採購', '採購負責人', '發包經理', '資材採購部', '客戶對接', '報價'],
  },
  {
    keywords: ['半導體', '晶圓', '石英', '治具', '夾具', '竹科', '先進材料'],
    semanticThemes: ['半導體耗材', '晶圓夾治具', '高純度石英', '先進材料', '材料博士'],
  },
  {
    keywords: ['自動化', '機械手臂', '機器人', 'AGV', '伺服', 'PLC', '智慧工廠', '產線整合'],
    semanticThemes: ['機械手臂', '伺服控制', 'AGV無人搬運', '智慧工廠', '系統整合'],
  },
  {
    keywords: ['國貿', '報關', '進出口', '外貿', '海運', '空運', '關稅'],
    semanticThemes: ['國際貿易', '原物料進出口', '報關物流', '海外採購', '保稅倉儲'],
  },
  {
    keywords: ['車載', '車用', 'PCB', '電路板', 'SMT', 'ECU'],
    semanticThemes: ['SMT表面黏著', 'PCB電路板', '工控主機板', '車載電子'],
  },
  {
    keywords: ['光學', '鏡頭', 'AOI', '檢測', '相機', '影像辨識'],
    semanticThemes: ['光學鏡頭', 'AOI自動光學檢測', '工業相機', '視覺辨識'],
  },
  {
    keywords: ['老闆', '決策', '負責人', '高層', '創辦人', '董事長', '總裁'],
    semanticThemes: ['決策層', '創辦人', '董事長兼總裁', '公會理事'],
  },
];

/**
 * 3-Way Hybrid Search with Reciprocal Rank Fusion (RRF k=60)
 */
export function execute3WaySearch(
  filter: SearchFilter,
  contacts: Contact[],
  companies: Company[],
  departments: Department[],
  cards: Card[]
): SearchResultItem[] {
  const companyMap = new Map(companies.map((c) => [c.id, c]));
  const deptMap = new Map(departments.map((d) => [d.id, d]));
  const cardMap = new Map(cards.map((c) => [c.contact_id, c]));

  // Step 1: Pre-filter candidates based on hard structured constraints
  let candidates = contacts.filter((ct) => {
    const comp = companyMap.get(ct.company_id);
    const card = cardMap.get(ct.id);

    // Filter by Company
    if (filter.company_id && ct.company_id !== filter.company_id) {
      return false;
    }

    // Filter by Department
    if (filter.department_id && ct.department_id !== filter.department_id) {
      return false;
    }

    // Filter by Title Rank Range
    if (filter.min_rank !== undefined && ct.title_rank < filter.min_rank) {
      return false;
    }
    if (filter.max_rank !== undefined && ct.title_rank > filter.max_rank) {
      return false;
    }

    // Filter by Tags
    if (filter.tags && filter.tags.length > 0) {
      const allTags = [...(ct.tags ?? []), ...(comp?.industry_tags || [])];
      const hasAll = filter.tags.every((t) => allTags.some((at) => at.toLowerCase().includes(t.toLowerCase())));
      if (!hasAll) return false;
    }

    // Filter by Time Range
    if (filter.time_range && filter.time_range !== 'all') {
      if (!card) return false;
      const cardDate = new Date(card.acquired_at).getTime();
      const now = Date.now();
      const days = (now - cardDate) / (1000 * 3600 * 24);
      if (!Number.isFinite(days) || days < 0) return false;
      if (filter.time_range === '30d' && days > 30) return false;
      if (filter.time_range === '90d' && days > 90) return false;
      if (filter.time_range === '180d' && days > 180) return false;
      if (filter.time_range === '365d' && days > 365) return false;
    }

    return true;
  });

  const query = filter.keyword ? filter.keyword.trim().toLowerCase() : '';

  // If no keyword, return structured filtered results ordered by primary contact & rank
  if (!query) {
    return candidates
      .sort((a, b) => {
        if (a.is_primary_contact !== b.is_primary_contact) {
          return a.is_primary_contact ? -1 : 1;
        }
        return b.title_rank - a.title_rank;
      })
      .map((ct) => {
        const comp = companyMap.get(ct.company_id)!;
        const dept = ct.department_id ? deptMap.get(ct.department_id) : undefined;
        const card = cardMap.get(ct.id) ?? null;
        return {
          contact: ct,
          company: comp,
          department: dept,
          card,
          rrf_score: 1.0,
          hit_sources: [
            {
              type: 'structured',
              field: '階層篩選',
              score: 1.0,
              reason: '符合結構化條件約束',
            },
          ],
        };
      });
  }

  // --- PATH 1: Structured Matching (Exact field match on name, tax_id, email, phone) ---
  const path1Scores = new Map<string, { score: number; hits: HitSource[] }>();
  candidates.forEach((ct) => {
    const comp = companyMap.get(ct.company_id);
    const hits: HitSource[] = [];
    let score = 0;

    if (ct.name.toLowerCase().includes(query)) {
      score += 1.0;
      hits.push({ type: 'structured', field: '姓名', score: 1.0, reason: `姓名完全包含「${query}」` });
    }
    if (ct.email.toLowerCase().includes(query)) {
      score += 0.9;
      hits.push({ type: 'structured', field: 'Email', score: 0.9, reason: `電子郵件匹配「${query}」` });
    }
    const phoneQuery = query.replace(/\D/g, '');
    if (phoneQuery.length >= 4 && ct.mobile.replace(/\D/g, '').includes(phoneQuery)) {
      score += 0.9;
      hits.push({ type: 'structured', field: '手機', score: 0.9, reason: `手機號碼匹配` });
    }
    if (comp?.tax_id && comp.tax_id.includes(query)) {
      score += 1.0;
      hits.push({ type: 'structured', field: '統一編號', score: 1.0, reason: `統編精確符合 (${comp.tax_id})` });
    }
    if (score > 0) {
      path1Scores.set(ct.id, { score, hits });
    }
  });

  // --- PATH 2: Literal Fuzzy Match (pg_trgm style on Company Name, Title, Dept) ---
  const path2Scores = new Map<string, { score: number; hits: HitSource[] }>();
  candidates.forEach((ct) => {
    const comp = companyMap.get(ct.company_id);
    const dept = ct.department_id ? deptMap.get(ct.department_id) : undefined;
    const hits: HitSource[] = [];
    let maxSim = 0;

    // Company Trigram
    if (comp) {
      const compSim = computePgTrgmSimilarity(comp.canonical_name, query).similarity;
      const normCompSim = computePgTrgmSimilarity(normalizeCompanyName(comp.canonical_name), normalizeCompanyName(query)).similarity;
      const effectiveSim = Math.max(compSim, normCompSim);
      if (effectiveSim >= 0.25 || comp.canonical_name.includes(query)) {
        maxSim = Math.max(maxSim, effectiveSim || 0.5);
        hits.push({
          type: 'fuzzy',
          field: '公司名稱',
          score: effectiveSim || 0.6,
          reason: `公司字面相似度 ${(effectiveSim * 100).toFixed(0)}%`,
        });
      }
    }

    // Title Trigram
    const titleSim = computePgTrgmSimilarity(ct.title_raw, query).similarity;
    if (titleSim >= 0.25 || ct.title_raw.includes(query)) {
      maxSim = Math.max(maxSim, titleSim || 0.5);
      hits.push({
        type: 'fuzzy',
        field: '職稱',
        score: titleSim || 0.6,
        reason: `職稱符合 (${ct.title_raw})`,
      });
    }

    // Dept Trigram
    if (dept) {
      const deptSim = computePgTrgmSimilarity(dept.name, query).similarity;
      if (deptSim >= 0.25 || dept.name.includes(query)) {
        maxSim = Math.max(maxSim, deptSim || 0.5);
        hits.push({
          type: 'fuzzy',
          field: '部門',
          score: deptSim || 0.6,
          reason: `部門名稱匹配 (${dept.name})`,
        });
      }
    }

    if (maxSim > 0 || hits.length > 0) {
      path2Scores.set(ct.id, { score: maxSim, hits });
    }
  });

  // --- PATH 3: Semantic Dense Retrieval (Ollama bge-m3 1024-dim simulation) ---
  const path3Scores = new Map<string, { score: number; hits: HitSource[] }>();
  candidates.forEach((ct) => {
    const comp = companyMap.get(ct.company_id);
    const hits: HitSource[] = [];
    let semanticScore = 0;

    // Build dense text corpus
    const corpus = [
      comp?.canonical_name || '',
      ...(comp?.industry_tags || []),
      ct.title_raw,
      ct.notes,
      ...(ct.tags ?? []),
    ].join(' ').toLowerCase();

    // Check semantic theme activations
    for (const concept of SEMANTIC_CONCEPTS) {
      const queryMatches = concept.keywords.some((k) => query.includes(k) || k.includes(query));
      if (queryMatches) {
        // Measure match in contact's corpus
        const matchCount = concept.semanticThemes.filter((t) => corpus.includes(t.toLowerCase())).length;
        if (matchCount > 0) {
          const s = Math.min(0.98, 0.5 + matchCount * 0.15);
          semanticScore = Math.max(semanticScore, s);
          hits.push({
            type: 'semantic',
            field: '概念規則（示範）',
            score: s,
            reason: `命中「${concept.keywords[0]}」語意關聯範疇 (${(s * 100).toFixed(0)}% 相近)`,
          });
        }
      }
    }

    if (semanticScore > 0) {
      path3Scores.set(ct.id, { score: semanticScore, hits });
    }
  });

  // --- Reciprocal Rank Fusion (RRF with k=60) ---
  const K = 60;
  const p1Ranked = Array.from(path1Scores.entries()).sort((a, b) => b[1].score - a[1].score);
  const p2Ranked = Array.from(path2Scores.entries()).sort((a, b) => b[1].score - a[1].score);
  const p3Ranked = Array.from(path3Scores.entries()).sort((a, b) => b[1].score - a[1].score);

  const rrfScores = new Map<string, { rrf: number; hits: HitSource[] }>();

  // Add Path 1 RRF
  p1Ranked.forEach(([id, data], idx) => {
    const current = rrfScores.get(id) || { rrf: 0, hits: [] };
    current.rrf += 1 / (K + (idx + 1));
    current.hits.push(...data.hits);
    rrfScores.set(id, current);
  });

  // Add Path 2 RRF
  p2Ranked.forEach(([id, data], idx) => {
    const current = rrfScores.get(id) || { rrf: 0, hits: [] };
    current.rrf += 1 / (K + (idx + 1));
    current.hits.push(...data.hits);
    rrfScores.set(id, current);
  });

  // Add Path 3 RRF
  p3Ranked.forEach(([id, data], idx) => {
    const current = rrfScores.get(id) || { rrf: 0, hits: [] };
    current.rrf += 1 / (K + (idx + 1));
    current.hits.push(...data.hits);
    rrfScores.set(id, current);
  });

  // Rank results by RRF score
  const sorted = Array.from(rrfScores.entries())
    .sort((a, b) => b[1].rrf - a[1].rrf)
    .map(([id, { rrf, hits }]) => {
      const contact = candidates.find((c) => c.id === id)!;
      const company = companyMap.get(contact.company_id)!;
      const department = contact.department_id ? deptMap.get(contact.department_id) : undefined;
      const card = cardMap.get(id) ?? null;

      // Deduplicate hits
      const uniqueHits = hits.filter((h, i, arr) => arr.findIndex((x) => x.type === h.type && x.field === h.field) === i);

      return {
        contact,
        company,
        department,
        card,
        rrf_score: Math.round(rrf * 10000) / 10000,
        hit_sources: uniqueHits,
      };
    });

  return sorted;
}
