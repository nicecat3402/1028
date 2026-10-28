import { Contact, Company, Department } from '../types';

/**
 * Generate vCard 3.0 standard text string
 */
export function generateVCard3(contact: Contact, company?: Company, department?: Department): string {
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N;CHARSET=UTF-8:${contact.name};;;;`,
    `FN;CHARSET=UTF-8:${contact.name}`,
  ];

  if (company) {
    const orgStr = department ? `${company.canonical_name};${department.name}` : company.canonical_name;
    lines.push(`ORG;CHARSET=UTF-8:${orgStr}`);
  }

  if (contact.title_raw) {
    lines.push(`TITLE;CHARSET=UTF-8:${contact.title_raw}`);
  }

  if (contact.mobile) {
    lines.push(`TEL;TYPE=CELL,VOICE:${contact.mobile}`);
  }

  if (contact.direct_phone) {
    const phoneWithExt = contact.extension ? `${contact.direct_phone};${contact.extension}` : contact.direct_phone;
    lines.push(`TEL;TYPE=WORK,VOICE:${phoneWithExt}`);
  }

  if (contact.email) {
    lines.push(`EMAIL;TYPE=INTERNET,WORK:${contact.email}`);
  }

  if (company?.address) {
    lines.push(`ADR;TYPE=WORK;CHARSET=UTF-8:;;${company.address};;;;`);
  }

  // Custom X- fields
  lines.push(`X-TITLE-RANK:${contact.title_rank}`);
  if (company?.tax_id) {
    lines.push(`X-TAX-ID:${company.tax_id}`);
  }
  if (contact.notes) {
    lines.push(`NOTE;CHARSET=UTF-8:${contact.notes}`);
  }

  lines.push('END:VCARD');
  return lines.join('\r\n');
}

/**
 * Trigger download of vCard (.vcf)
 */
export function downloadVCard(contact: Contact, company?: Company, department?: Department): void {
  const vcardText = generateVCard3(contact, company, department);
  const blob = new Blob([vcardText], { type: 'text/vcard;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${contact.name}_${company?.canonical_name || '名片'}.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Trigger download of multiple contacts as batch vCard
 */
export function downloadBatchVCard(contacts: Contact[], companies: Company[], departments: Department[]): void {
  const compMap = new Map(companies.map((c) => [c.id, c]));
  const deptMap = new Map(departments.map((d) => [d.id, d]));

  const allVcards = contacts.map((ct) => {
    return generateVCard3(ct, compMap.get(ct.company_id), deptMap.get(ct.department_id));
  });

  const fullContent = allVcards.join('\r\n\r\n');
  const blob = new Blob([fullContent], { type: 'text/vcard;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `名片聯絡人批次匯出_${contacts.length}筆.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export contacts list to CSV format with UTF-8 BOM
 */
export function downloadContactsCSV(contacts: Contact[], companies: Company[], departments: Department[]): void {
  const compMap = new Map(companies.map((c) => [c.id, c]));
  const deptMap = new Map(departments.map((d) => [d.id, d]));

  const headers = [
    '姓名',
    '公司名稱',
    '部門',
    '職稱',
    '職級權重(95-20)',
    '手機',
    '市話',
    '分機',
    'Email',
    '統一編號',
    '公司地址',
    '主要對接窗口',
    '產業標籤',
    '備註',
  ];

  const rows = contacts.map((ct) => {
    const comp = compMap.get(ct.company_id);
    const dept = deptMap.get(ct.department_id);

    return [
      ct.name,
      comp?.canonical_name || '',
      dept?.name || '',
      ct.title_raw,
      ct.title_rank,
      ct.mobile,
      ct.direct_phone,
      ct.extension,
      ct.email,
      comp?.tax_id || '',
      comp?.address || '',
      ct.is_primary_contact ? '是' : '否',
      (comp?.industry_tags || []).join('; '),
      ct.notes,
    ].map((val) => `"${String(val).replace(/"/g, '""')}"`);
  });

  // Add UTF-8 BOM (\uFEFF) for Excel compatibility with Traditional Chinese
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `名片清單_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
