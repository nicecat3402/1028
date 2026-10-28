import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { INITIAL_CONTACTS, INITIAL_COMPANIES, INITIAL_DEPARTMENTS, INITIAL_CARDS } from './data/syntheticData';
import { execute3WaySearch } from './utils/searchEngine';
import { HybridSearchView } from './components/HybridSearchView';
import { ExportManagementView } from './components/ExportManagementView';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { SearchFilter } from './types';

const props = { contacts: INITIAL_CONTACTS, companies: INITIAL_COMPANIES, departments: INITIAL_DEPARTMENTS, cards: INITIAL_CARDS };
const filter: SearchFilter = { keyword: '', mode: 'hybrid', time_range: 'all' };

describe('Phase 0 regressions', () => {
  it('returns contacts without card images as null, not a non-existent Card', () => {
    const results = execute3WaySearch(filter, props.contacts, props.companies, props.departments, props.cards);
    expect(results).toHaveLength(INITIAL_CONTACTS.length);
    expect(results.filter(r => r.card === null)).toHaveLength(10);
    expect(results.every(r => r.card !== undefined)).toBe(true);
  });

  it('renders the search page with missing cards without throwing', () => {
    const html = renderToStaticMarkup(<HybridSearchView {...props} onSelectCard={() => {}} />);
    expect(html).toContain('尚無名片原圖');
    expect(html).toContain('disabled');
  });

  it('searches and filters a newly imported contact with no tags or department', () => {
    const { tags: _tags, department_id: _department, ...contact } = INITIAL_CONTACTS[0];
    const results = execute3WaySearch({ ...filter, keyword: contact.name }, [contact], props.companies, [], []);
    expect(results).toHaveLength(1);
    expect(results[0].card).toBeNull();
    expect(() => execute3WaySearch({ ...filter, tags: ['採購'] }, [contact], props.companies, [], [])).not.toThrow();
  });

  it('renders a local QR SVG without sending vCard to an external image endpoint', () => {
    const html = renderToStaticMarkup(<ExportManagementView {...props} />);
    expect(html).toContain('vCard QR Code（本機產生）');
    expect(html).toContain('<svg');
    expect(html).not.toContain('api.qrserver.com');
    expect(readFileSync(new URL('./components/ExportManagementView.tsx', import.meta.url), 'utf8')).not.toContain('api.qrserver.com');
  });

  it('handles an empty contact list in the export view', () => {
    const html = renderToStaticMarkup(<ExportManagementView {...props} contacts={[]} />);
    expect(html).toContain('尚無聯絡人可產生 QR Code');
  });

  it('renders the error recovery screen instead of a blank page', () => {
    const boundary = new ErrorBoundary({ children: null });
    boundary.state = ErrorBoundary.getDerivedStateFromError();
    expect(renderToStaticMarkup(boundary.render())).toContain('重新載入網站');
  });
});
