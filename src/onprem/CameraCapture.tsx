import { useEffect, useRef, useState } from 'react';

export function CameraCapture({ onCapture }: { onCapture: (file: File) => Promise<void> }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const mounted = useRef(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const stop = () => { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; setActive(false); };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; stream.current?.getTracks().forEach(t => t.stop()); }; }, []);
  return <div className="panel space-y-3">
    <h2 className="font-semibold">相機拍攝</h2>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    <video ref={video} autoPlay muted playsInline className={active ? 'w-full max-h-80' : 'hidden'} />
    {!active ? <button disabled={busy} onClick={async () => {
      setError(''); setBusy(true);
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('相機需要 HTTPS 或 localhost；也可使用下方圖片上傳。');
        const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (!mounted.current) { media.getTracks().forEach(t => t.stop()); return; }
        stream.current = media;
        if (video.current) video.current.srcObject = media;
        setActive(true);
      } catch (e) { setError(e instanceof Error ? e.message : '無法啟動相機'); } finally { if (mounted.current) setBusy(false); }
    }}>開啟相機</button> : <div className="flex gap-3"><button disabled={busy} onClick={async () => {
      const v = video.current;
      if (!v?.videoWidth) return;
      setBusy(true); setError('');
      try {
        const canvas = document.createElement('canvas'); canvas.width = v.videoWidth; canvas.height = v.videoHeight;
        canvas.getContext('2d')?.drawImage(v, 0, 0);
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('無法擷取影像');
        await onCapture(new File([blob], 'camera.png', { type: 'image/png' })); stop();
      } catch (e) { setError(e instanceof Error ? e.message : '上傳失敗'); } finally { if (mounted.current) setBusy(false); }
    }}>拍攝並上傳</button><button disabled={busy} onClick={stop}>關閉相機</button></div>}
  </div>;
}
