import * as source from './syntheticData';
import { evaluateEntityMatch, validateTaiwanTaxId } from '../utils/entityResolution';

// Generated check digits validate the format only, never a real business registration.
export function demoTaxId(value: string): string {
  if (!/^\d{8}$/.test(value)) return value;
  for (let digit = 0; digit <= 9; digit++) {
    const candidate = value.slice(0, 7) + digit;
    if (validateTaiwanTaxId(candidate).isValid) return candidate;
  }
  return '';
}

const replacements = source.INITIAL_COMPANIES.flatMap((company, index) => [
  [company.tax_id, demoTaxId(company.tax_id)],
  [company.domain, `company-${index + 1}.example.com`],
]);

export function demoText(value: string): string {
  return replacements.reduce((text, [from, to]) => from ? text.split(from).join(to) : text, value)
    .replace(/https:\/\/images\.unsplash\.com\/[^"\s]+/g, `${import.meta.env.BASE_URL}demo-card.svg`);
}

function prepare<T>(value: T): T {
  return JSON.parse(demoText(JSON.stringify(value))) as T;
}

export const INITIAL_COMPANIES = prepare(source.INITIAL_COMPANIES);
export const INITIAL_CONTACTS = prepare(source.INITIAL_CONTACTS);
export const INITIAL_DEPARTMENTS = prepare(source.INITIAL_DEPARTMENTS);
export const INITIAL_OFFLINE_QUEUE = prepare(source.INITIAL_OFFLINE_QUEUE);
// Keep the original relative ages, so the "recent contacts" demo works in any month.
export const INITIAL_CARDS = prepare(source.INITIAL_CARDS).map(card => {
  const age = Date.parse('2026-09-07') - Date.parse(card.acquired_at);
  return { ...card, acquired_at: new Date(Date.now() - Math.max(0, age)).toISOString().slice(0, 10) };
});
export const INITIAL_MERGE_QUEUE = prepare(source.INITIAL_MERGE_QUEUE).map(item => {
  const target = INITIAL_COMPANIES.find(company => company.id === item.target_company_id);
  if (!target) return item;
  const result = evaluateEntityMatch({
    companyName: item.source_company_name, taxId: item.source_tax_id,
    email: item.source_email, phone: item.source_phone, address: item.source_address,
  }, target);
  return { ...item, calculated_score: result.totalScore, match_reasons: result.reasons };
});
