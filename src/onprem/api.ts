export interface Profile { id: string; username: string; role: 'admin' | 'member'; active: boolean }
export interface ContactData {
  name: string; company: string; department: string; title: string; email: string;
  mobile: string; phone: string; extension: string; address: string; tax_id: string;
  notes: string; tags: string[]; acquired_at: string | null;
}
export interface ContactRecord { id: string; revision: number; data: ContactData; sources?: string[]; score?: number }
export interface CardRecord { id: string; contact_id: string | null; verified: boolean; ocr_text: string | null; image_url: string; duplicate?: boolean }
export interface JobRecord { id: string; kind: string; target_id: string; status: string; error: string | null; attempts: number }
export const emptyContact = (): ContactData => ({ name: '', company: '', department: '', title: '', email: '', mobile: '', phone: '', extension: '', address: '', tax_id: '', notes: '', tags: [], acquired_at: new Date().toISOString().slice(0, 10) });

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, { ...options, credentials: 'same-origin',
    headers: { ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login' && path !== '/auth/me') window.dispatchEvent(new Event('omnicard-session-expired'));
    const body = await response.json().catch(() => null);
    const detail = body?.detail;
    throw new Error(typeof detail === 'string' ? detail : `操作失敗（HTTP ${response.status}），請檢查欄位或服務狀態。`);
  }
  return response.json();
}
export const post = <T>(path: string, value?: unknown) => api<T>(path, { method: 'POST', body: value === undefined ? undefined : JSON.stringify(value) });
