import { useEffect, useRef, useState } from 'react';
import { api, post, type CardRecord, type ContactRecord, type ContactData, emptyContact } from './api';

export function ContactEditor({ contact, card, source, onClose, onSaved }: {
  contact?: ContactRecord; card?: CardRecord; source?: ContactRecord; onClose: () => void; onSaved: () => void;
}) {
  const [data, setData] = useState<ContactData>(contact?.data || emptyContact());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const closing = useRef(onClose); closing.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => { dialog.current?.close(); previous?.focus(); };
  }, []);
  const fields: [keyof ContactData, string, number][] = [
    ['name', '姓名', 100], ['company', '公司', 200], ['department', '部門', 100], ['title', '職稱', 100],
    ['email', 'Email', 254], ['mobile', '手機', 60], ['phone', '電話', 60], ['extension', '分機', 20],
    ['address', '地址', 400], ['tax_id', '統一編號', 8],
  ];
  return <dialog ref={dialog} aria-label={card ? '名片人工校正' : '聯絡人編輯'} onCancel={e => { if (busy) e.preventDefault(); else closing.current(); }}>
    <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">{card ? '名片人工校正' : contact ? '編輯聯絡人' : '新增聯絡人'}</h2><button disabled={busy} onClick={onClose}>關閉</button></div>
    {card && <div className="grid md:grid-cols-2 gap-4 mb-4"><img src={card.image_url} alt="待核對名片原圖" className="max-h-72 w-full object-contain" />
      <label>OCR 原始文字（模型輸出需人工核對）<textarea rows={8} readOnly value={card.ocr_text || '尚未辨識完成；可以先手動輸入。'} /></label></div>}
    {source && <div className="panel mb-4 space-y-2"><h3>人工合併確認</h3><p>下方表單是合併後保留的資料。來源聯絡人將刪除，圖片移至目標；請先複製需要保留的欄位。</p><pre className="whitespace-pre-wrap break-all text-sm">{JSON.stringify(source.data, null, 2)}</pre></div>}
    {error && <p role="alert" className="text-red-300 mb-4">{error}</p>}
    <form onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError('');
      try {
        if (source && contact) await post('/contacts-merge', { data, source_id: source.id, source_revision: source.revision, target_id: contact.id, target_revision: contact.revision });
        else if (card) await post(`/cards/${card.id}/review`, { data });
        else if (contact) await api(`/contacts/${contact.id}`, { method: 'PUT', body: JSON.stringify({ revision: contact.revision, data }) });
        else await post('/contacts', data);
        onSaved();
      } catch (e) { setError(e instanceof Error ? e.message : '儲存失敗'); } finally { setBusy(false); }
    }} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">{fields.map(([key, label, max]) => <label key={key}>{label}
        <input required={key === 'name'} maxLength={max} value={String(data[key] ?? '')} onChange={e => setData({ ...data, [key]: e.target.value })} />
      </label>)}<label>認識日期<input type="date" value={data.acquired_at || ''} onChange={e => setData({ ...data, acquired_at: e.target.value || null })} /></label>
        <label>標籤（以逗號分隔）<input value={data.tags.join(',')} onChange={e => setData({ ...data, tags: e.target.value.split(',').filter(Boolean) })} /></label></div>
      <label>備註<textarea rows={4} maxLength={4000} value={data.notes} onChange={e => setData({ ...data, notes: e.target.value })} /></label>
      <p className="text-sm text-zinc-400">儲存至團隊共用資料庫。AI 向量索引會於背景更新。</p>
      <button disabled={busy} type="submit">{busy ? '儲存中…' : source ? '確認合併並刪除來源記錄' : card ? '確認校正並建立聯絡人' : '儲存聯絡人'}</button>
    </form>
  </dialog>;
}
