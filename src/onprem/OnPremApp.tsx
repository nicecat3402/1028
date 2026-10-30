import { useEffect, useRef, useState, type FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api, post, type Profile, type ContactRecord, type CardRecord, type JobRecord } from './api';
import { ContactEditor } from './ContactEditor';
import { CameraCapture } from './CameraCapture';
import { generateVCard3 } from '../utils/exportTools';

const text = (e: unknown) => e instanceof Error ? e.message : '發生未預期錯誤';
const jobNames: Record<string, string> = { queued: '等待處理', running: '處理中', done: '已完成', failed: '失敗' };

function vcard(c: ContactRecord) {
  return generateVCard3({ id: c.id, company_id: '', name: c.data.name, title_raw: c.data.title,
    title_rank: 30, mobile: c.data.mobile, direct_phone: c.data.phone, extension: c.data.extension,
    email: c.data.email, is_primary_contact: false, notes: c.data.notes }, {
    id: '', canonical_name: c.data.company, tax_id: c.data.tax_id, phone: c.data.phone,
    address: c.data.address, domain: '', industry_tags: [], aliases: [], created_at: '',
  }, c.data.department ? { id: '', company_id: '', parent_id: null, name: c.data.department, level: 1 } : undefined);
}

function download(name: string, value: string, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function OnPremApp() {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'contacts' | 'cards' | 'jobs' | 'settings'>('contacts');
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [editor, setEditor] = useState<{ contact?: ContactRecord; card?: CardRecord; source?: ContactRecord } | null>(null);
  const [duplicates, setDuplicates] = useState<{ target: ContactRecord; items: ContactRecord[] } | null>(null);
  const [qr, setQr] = useState<ContactRecord | null>(null);
  const [query, setQuery] = useState('');
  const [company, setCompany] = useState('');
  const [days, setDays] = useState('');
  const [searchState, setSearchState] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const requestVersion = useRef(0);

  useEffect(() => {
    let live = true;
    api<Profile>('/auth/me').then(u => { if (live) setUser(u); }).catch(e => { if (live && !text(e).includes('Login required')) setError(text(e)); }).finally(() => { if (live) setLoading(false); });
    const expired = () => { requestVersion.current++; setUser(null); setContacts([]); setCards([]); setJobs([]); setDuplicates(null); setEditor(null); setQr(null); setError('登入已過期，請重新登入。'); };
    window.addEventListener('omnicard-session-expired', expired);
    return () => { live = false; window.removeEventListener('omnicard-session-expired', expired); };
  }, []);

  async function loadContacts(page = offset) {
    const version = ++requestVersion.current;
    const result = await api<{ items: ContactRecord[]; total: number }>(`/contacts?offset=${page}&limit=50`);
    if (version !== requestVersion.current) return;
    setContacts(result.items); setTotal(result.total); setSearchState('');
  }
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        if (tab === 'contacts') await loadContacts(offset);
        if (tab === 'cards') { const result = await api<CardRecord[]>('/cards'); if (!cancelled) setCards(result); }
        if (tab === 'jobs') { const result = await api<JobRecord[]>('/jobs'); if (!cancelled) setJobs(result); }
      } catch (e) { if (!cancelled) setError(text(e)); }
      if (!cancelled && (tab === 'cards' || tab === 'jobs')) timer = setTimeout(refresh, 5000);
    }
    void refresh();
    return () => { cancelled = true; clearTimeout(timer); requestVersion.current++; };
  }, [user, tab, offset]);

  async function action(fn: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await fn(); } catch (e) { setError(text(e)); } finally { setBusy(false); }
  }

  async function upload(file: File) {
    const form = new FormData(); form.append('file', file);
    const result = await api<CardRecord>('/cards', { method: 'POST', body: form });
    setNotice(result.duplicate ? '這張圖片已存在，已保留原有名片。' : '圖片已保存，OCR 已排入背景工作。');
    setCards(await api<CardRecord[]>('/cards'));
  }

  if (loading) return <div className="onprem p-8">正在連線到內網服務…</div>;
  if (!user) return <div className="onprem max-w-md mx-auto p-6 mt-12 space-y-5">
    <h1 className="text-2xl font-bold">OmniCard 內網團隊名片庫</h1><p>使用管理員建立的帳號登入。正式版不包含示範資料。</p>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); void action(async () => {
      setUser(await post<Profile>('/auth/login', { username: data.get('username'), password: data.get('password') })); setError('');
    }); }}>
      <label>帳號<input name="username" autoComplete="username" required /></label>
      <label>密碼<input name="password" type="password" autoComplete="current-password" required /></label>
      <button disabled={busy} type="submit">登入</button>
    </form>
  </div>;

  return <div className="onprem max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
    <header className="flex flex-wrap justify-between items-center gap-3"><div><h1 className="text-2xl font-bold">OmniCard 內網團隊名片庫</h1><p className="text-sm text-zinc-400">{user.username} · {user.role === 'admin' ? '管理員' : '團隊成員'} · 團隊共用資料</p></div>
      <button disabled={busy} onClick={() => void action(async () => { await post('/auth/logout'); requestVersion.current++; setUser(null); setContacts([]); setCards([]); setJobs([]); setDuplicates(null); setEditor(null); setQr(null); setOffset(0); setSearchState(''); setTab('contacts'); })}>登出</button></header>
    <nav aria-label="主要功能" className="flex flex-wrap gap-2">{([['contacts', '聯絡人與三路搜尋'], ['cards', '圖片／OCR 核對'], ['jobs', '背景工作'], ['settings', '帳號與系統']] as const).map(([id, label]) =>
      <button aria-current={tab === id ? 'page' : undefined} key={id} onClick={() => { setTab(id); setError(''); setNotice(''); }} className={tab === id ? 'text-blue-300' : ''}>{label}</button>)}</nav>
    {error && <p role="alert" className="panel text-red-300">{error}</p>}{notice && <p role="status" className="panel text-emerald-300">{notice}</p>}

    {tab === 'contacts' && <section className="space-y-4">
      <div className="flex flex-wrap gap-2"><button onClick={() => setEditor({})}>新增聯絡人</button>
        <a className="button" href="/api/export/contacts">匯出全部聯絡人 JSON</a>
        <button disabled={!contacts.length} onClick={() => download('contacts.vcf', contacts.map(vcard).join(''), 'text/vcard;charset=utf-8')}>匯出目前列表 vCard</button></div>
      <form className="panel grid sm:grid-cols-4 gap-3 items-end" onSubmit={e => { e.preventDefault(); void action(async () => {
        const version = ++requestVersion.current;
        const params = new URLSearchParams({ q: query, company }); if (days) params.set('days', days);
        const result = await api<{ items: ContactRecord[]; semantic: string; fuzzy: string }>(`/search?${params}`);
        if (version !== requestVersion.current) return;
        setContacts(result.items); setSearchState(result.semantic); setQr(null);
      }); }}>
        <label>搜尋內容<input value={query} maxLength={500} onChange={e => setQuery(e.target.value)} placeholder="公司、電話、產品或語意問題" /></label>
        <label>公司（完整名稱）<input value={company} onChange={e => setCompany(e.target.value)} /></label>
        <label>認識日期<select value={days} onChange={e => setDays(e.target.value)}><option value="">全部</option><option value="30">近 30 天</option><option value="90">近 90 天</option><option value="365">近一年</option></select></label>
        <button disabled={busy} type="submit">{busy ? '查詢中…' : '三路搜尋'}</button>
      </form>
      {searchState && <p role="status">{searchState === 'ready' ? '已使用地端 bge-m3 語意檢索＋RRF 排名融合。' : searchState === 'not_requested' ? '目前使用結構化條件瀏覽。' : '語意檢索未就緒：僅顯示可用路徑結果。請到背景工作／系統狀態檢查模型與索引。'}（最多 100 筆）</p>}
      {!contacts.length && <p className="panel">尚無符合條件的聯絡人。可以手動新增或上傳名片。</p>}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{contacts.map(c => <article key={c.id} className="panel space-y-2 min-w-0">
        <h2 className="text-lg font-bold">{c.data.name}</h2><p>{c.data.company} · {c.data.department}</p><p>{c.data.title}</p><p className="break-all text-zinc-400">{c.data.email} {c.data.mobile || c.data.phone}</p>
        {!!c.sources?.length && <p className="text-xs text-blue-300">命中：{c.sources.join(' / ')} · RRF {c.score?.toFixed(4)}</p>}
        <div className="flex flex-wrap gap-2"><button onClick={() => setEditor({ contact: c })}>編輯 {c.data.name}</button><button onClick={() => setQr(qr?.id === c.id ? null : c)}>QR / vCard</button>
          <button disabled={busy} onClick={() => void action(async () => setDuplicates({ target: c, items: await api<ContactRecord[]>(`/duplicates/${c.id}`) }))}>檢查重複</button>
          <button disabled={busy} onClick={() => { if (confirm(`刪除團隊聯絡人「${c.data.name}」？圖片仍保留供重新核對。`)) void action(async () => { await api(`/contacts/${c.id}?revision=${c.revision}`, { method: 'DELETE' }); setQr(null); await loadContacts(); }); }}>刪除</button></div>
        {qr?.id === c.id && <div className="space-y-3">{new TextEncoder().encode(vcard(c)).length <= 2000 ? <div className="bg-white p-3 w-fit"><QRCodeSVG value={vcard(c)} size={200} marginSize={4} title="本機聯絡人 QR Code" /></div> : <p>資料過長，請下載完整 vCard。</p>}<button onClick={() => download('contact.vcf', vcard(c), 'text/vcard;charset=utf-8')}>下載 vCard</button></div>}
      </article>)}</div>
      {duplicates && <div className="panel space-y-3"><h2>與「{duplicates.target.data.name}」姓名／Email／手機相同的候選</h2><p>候選不是同一人的保證；確認資料後才進行合併。</p>{duplicates.items.length === 0 && <p>沒有相同欄位的候選。</p>}{duplicates.items.map(source => <div key={source.id} className="flex flex-wrap gap-3"><span>{source.data.name} · {source.data.company} · {source.data.email}</span><button onClick={() => { setEditor({ contact: duplicates.target, source }); setDuplicates(null); }}>核對並合併此來源</button></div>)}<button onClick={() => setDuplicates(null)}>關閉候選</button></div>}
      <div className="flex gap-3 items-center"><button disabled={offset === 0 || !!searchState} onClick={() => setOffset(Math.max(0, offset - 50))}>上一頁</button><span>{searchState ? `${contacts.length} 筆搜尋結果` : `共 ${total} 筆，第 ${offset / 50 + 1} 頁`}</span><button disabled={offset + 50 >= total || !!searchState} onClick={() => setOffset(offset + 50)}>下一頁</button><button onClick={() => void action(async () => { setQuery(''); setCompany(''); setDays(''); if (offset) setOffset(0); else await loadContacts(0); })}>返回全部聯絡人</button></div>
    </section>}

    {tab === 'cards' && <section className="space-y-4"><CameraCapture onCapture={upload} />
      <div className="panel"><label>上傳名片（JPEG／PNG／WebP，單張最多 12MB、24MP）<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void action(() => upload(file)); }} /></label></div>
      <p className="text-sm text-zinc-400">最新 100 張；每 5 秒更新。原圖與 OCR 結果只經由內網服務傳送，辨識完成後需人工核對才建立聯絡人。</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{cards.map(c => <article key={c.id} className="panel space-y-3"><img src={c.image_url} alt="上傳名片" className="h-40 w-full object-contain" /><p>{c.verified ? '已人工核對' : c.ocr_text ? 'OCR 完成，待核對' : '等待 OCR，可先手動輸入'}</p>
        {!c.verified && <button onClick={() => setEditor({ card: c })}>校正名片</button>}
        {c.verified && <button onClick={() => void action(async () => { const contact = await api<ContactRecord>(`/contacts/${c.contact_id}`); setEditor({ contact }); })}>編輯已核對聯絡人</button>}
      </article>)}</div>
    </section>}

    {tab === 'jobs' && <section className="space-y-3"><h2 className="text-xl">背景 OCR／向量索引工作</h2><p>每 5 秒更新，失敗最多自動重試 3 次。模型不可用時不產生模擬結果。</p>
      {!jobs.length && <p>尚無工作。</p>}{jobs.map(j => <article key={j.id} className="panel flex flex-wrap justify-between gap-3"><div><strong>{j.kind === 'ocr' ? '名片 OCR' : '向量索引'} · {jobNames[j.status] || j.status}</strong><p className="text-xs text-zinc-400 break-all">{j.target_id} · 嘗試 {j.attempts} 次</p>{j.error && <p className="text-amber-300">{j.error}</p>}</div>{j.status === 'failed' && <button disabled={busy} onClick={() => void action(async () => { await post(`/jobs/${j.id}/retry`); setJobs(await api('/jobs')); })}>重試</button>}</article>)}</section>}

    {tab === 'settings' && <SettingsPanel user={user} onLogout={() => setUser(null)} />}
    {editor && <ContactEditor contact={editor.contact} card={editor.card} source={editor.source} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setQr(null); setDuplicates(null); void action(async () => { await loadContacts(); setCards(await api('/cards')); setNotice('已儲存至團隊資料庫。'); }); }} />}
  </div>;
}

function SettingsPanel({ user, onLogout }: { user: Profile; onLogout: () => void }) {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function perform(fn: () => Promise<void>) { setBusy(true); setError(''); try { await fn(); } catch (e) { setError(text(e)); } finally { setBusy(false); } }
  function passwordChange(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const data = new FormData(e.currentTarget);
    void perform(async () => { await post('/auth/password', Object.fromEntries(data)); onLogout(); });
  }
  return <section className="space-y-5">
    {error && <p role="alert" className="text-red-300">{error}</p>}
    <div className="panel space-y-3"><h2>真實服務狀態</h2><button disabled={busy} onClick={() => void perform(async () => setStatus(await api('/status')))}>查詢資料庫與模型狀態</button>{status && <pre className="text-sm whitespace-pre-wrap break-all">{JSON.stringify(status, null, 2)}</pre>}
      {user.role === 'admin' && <button disabled={busy} onClick={() => { if (confirm('清除現有向量並重新建立所有索引？重建期間搜尋會降級。')) void perform(async () => { const r = await post<{ queued: number }>('/admin/reindex'); setStatus({ queued: r.queued }); }); }}>重新建立向量索引</button>}</div>
    <form className="panel space-y-3 max-w-lg" onSubmit={passwordChange}><h2>更換密碼（完成後需重新登入）</h2><label>目前密碼<input name="current_password" type="password" required autoComplete="current-password" /></label><label>新密碼<input name="new_password" type="password" minLength={12} required autoComplete="new-password" /></label><button disabled={busy}>更換密碼</button></form>
    {user.role === 'admin' && <div className="panel space-y-4"><h2>團隊帳號管理</h2><button disabled={busy} onClick={() => void perform(async () => setUsers(await api('/users')))}>讀取帳號</button>
      {users.map(u => <div key={u.id} className="flex justify-between gap-3"><span>{u.username} · {u.role} · {u.active ? '啟用' : '停用'}</span>{u.id !== user.id && u.active && <button disabled={busy} onClick={() => { if (confirm(`停用 ${u.username} 並撤銷登入？`)) void perform(async () => { await api(`/users/${u.id}`, { method: 'DELETE' }); setUsers(await api('/users')); }); }}>停用</button>}</div>)}
      <form className="space-y-3 max-w-lg" onSubmit={e => { e.preventDefault(); const form = e.currentTarget; const data = new FormData(form); void perform(async () => { await post('/users', Object.fromEntries(data)); form.reset(); setUsers(await api('/users')); }); }}><label>新增帳號<input name="username" required maxLength={80} autoComplete="off" /></label><label>初始密碼<input name="password" type="password" minLength={12} required autoComplete="new-password" /></label><label>角色<select name="role"><option value="member">團隊成員</option><option value="admin">管理員</option></select></label><button disabled={busy}>建立帳號</button></form>
    </div>}
    {user.role === 'admin' && <div className="panel space-y-3"><h2>聯絡人 JSON 匯入</h2><p>僅接受本系統匯出的 version 1 格式，每次最多 1000 筆。相同 ID／內容會略過，衝突會整批取消；不含圖片或帳號復原。</p><label>選擇匯出檔<input type="file" accept="application/json,.json" disabled={busy} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void perform(async () => { if (file.size > 12 * 1024 * 1024) throw new Error('檔案超過 12MB'); const result = await post<{ added: number; skipped: number }>('/import/contacts', JSON.parse(await file.text())); setStatus(result); }); }} /></label></div>}
  </section>;
}
