import { describe, expect, it, vi } from 'vitest';
import { validateTaiwanTaxId, inferTitleRank, evaluateEntityMatch } from './utils/entityResolution';
import { execute3WaySearch } from './utils/searchEngine';
import { generateVCard3 } from './utils/exportTools';
import { INITIAL_CONTACTS, INITIAL_COMPANIES, INITIAL_CARDS, INITIAL_DEPARTMENTS, INITIAL_MERGE_QUEUE } from './data/demoData';

describe('DEMO correctness', () => {
  it.each(['04595257', '10458575', '10458574', '28941725', '80193742'])('accepts current tax checksum %s', value => {
    expect(validateTaiwanTaxId(value).isValid).toBe(true);
  });
  it.each(['00000000', '12345678', '24519803', '123', 'abcdefgh'])('rejects invalid/demo placeholder %s', value => {
    expect(validateTaiwanTaxId(value).isValid).toBe(false);
  });
  it('keeps fixture check digits, domains and merge scores consistent', () => {
    expect(INITIAL_COMPANIES.every(c => validateTaiwanTaxId(c.tax_id).isValid && c.domain.endsWith('.example.com'))).toBe(true);
    for (const item of INITIAL_MERGE_QUEUE) {
      const company = INITIAL_COMPANIES.find(c => c.id === item.target_company_id)!;
      const result = evaluateEntityMatch({ companyName: item.source_company_name, taxId: item.source_tax_id, email: item.source_email, phone: item.source_phone, address: item.source_address }, company);
      expect(item.calculated_score).toBe(result.totalScore);
      expect(item.match_reasons).toEqual(result.reasons);
    }
  });
  it.each([['執行副總經理', 80], ['Vice President', 80], ['總經理', 90], ['CTO', 90], ['首席財務官', 90]])('ranks %s correctly', (title, rank) => {
    expect(inferTitleRank(String(title))).toBe(rank);
  });
  it('does not claim phone matches for text-only searches', () => {
    const results = execute3WaySearch({ keyword: '珈鼎企業', mode: 'hybrid' }, INITIAL_CONTACTS, INITIAL_COMPANIES, INITIAL_DEPARTMENTS, INITIAL_CARDS);
    expect(results.flatMap(r => r.hit_sources).some(h => h.field === '手機')).toBe(false);
  });
  it('uses the current clock and excludes missing, future or invalid card dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-06-30T12:00:00Z'));
    try {
      const ct = INITIAL_CONTACTS[0];
      const search = (date?: string) => execute3WaySearch({ keyword: '', mode: 'hybrid', time_range: '30d' }, [ct], INITIAL_COMPANIES, [], date ? [{ ...INITIAL_CARDS[0], contact_id: ct.id, acquired_at: date }] : []);
      expect(search('2030-06-20')).toHaveLength(1);
      for (const date of [undefined, 'invalid', '2030-07-01', '2030-01-01']) expect(search(date)).toHaveLength(0);
    } finally { vi.useRealTimers(); }
  });
  it('escapes vCard values and folds UTF-8 lines without corrupting Chinese', () => {
    const notes = '長字串測試'.repeat(40) + '\n特殊;逗號,反斜線\\';
    const card = generateVCard3({ ...INITIAL_CONTACTS[0], name: '測試;姓名,', notes, extension: '123' }, INITIAL_COMPANIES[0]);
    const unfolded = card.replace(/\r\n /g, '');
    expect(unfolded).toContain('測試\\;姓名\\,');
    expect(unfolded).toContain('\\n特殊\\;逗號\\,反斜線\\\\');
    expect(unfolded).toContain('\\n分機: 123');
    expect(card.endsWith('END:VCARD\r\n')).toBe(true);
    expect(card.split('\r\n').every(line => new TextEncoder().encode(line).length <= 75)).toBe(true);
  });
});
