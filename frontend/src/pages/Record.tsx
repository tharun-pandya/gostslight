import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Upload } from 'lucide-react'
import { api, DEMO } from '../services/api'
import { ErrorBox } from '../components/ui'
import { useToast } from '../hooks/useToast'

export function Record({ onCreated }: { onCreated: (id: string) => void }) {
  const toast = useToast()
  const [blob, setBlob] = useState<Blob | null>(null); const [url, setUrl] = useState(''); const [rec, setRec] = useState(false); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const mr = useRef<MediaRecorder | null>(null); const chunks = useRef<Blob[]>([])
  const [f, setF] = useState({ title: '', storyteller: '', recorded_on: '', places: '', event: '', tags: '', language: 'auto' }); const [consent, setConsent] = useState(false)
  useEffect(() => { if (blob) { const u = URL.createObjectURL(blob); setUrl(u); return () => URL.revokeObjectURL(u) } }, [blob])
  if (DEMO) return <div className="card"><h2 className="font-serif text-2xl">Recording is disabled in the demo</h2><p className="text-muted mt-2">The public demo never receives private recordings. Run Ghostlight locally to record or import stories.</p></div>
  const start = async () => {
    setErr('')
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t))
      const r = new MediaRecorder(s, mime ? { mimeType: mime } : undefined); chunks.current = []
      r.ondataavailable = e => chunks.current.push(e.data)
      r.onstop = () => { setBlob(new Blob(chunks.current, { type: r.mimeType })); s.getTracks().forEach(t => t.stop()) }
      r.start(); mr.current = r; setRec(true)
    } catch { setErr('Microphone unavailable or permission denied.') }
  }
  const stop = () => { mr.current?.stop(); setRec(false) }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!blob) return; setBusy(true); setErr('')
    const fd = new FormData(); Object.entries(f).forEach(([k, v]) => fd.append(k, v)); fd.append('consent', String(consent)); fd.append('audio', blob, 'recording')
    try { const s = await api.createStory(fd); toast('Story saved to your encrypted vault'); onCreated(s.id) } catch (x: any) { setErr(x.message) } finally { setBusy(false) }
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })
  return <form onSubmit={submit} className="space-y-4 max-w-2xl">
    <h2 className="font-serif text-3xl">Record or import a story</h2>
    <div className="card flex flex-wrap gap-3 items-center">
      {!rec ? <button type="button" className="btn" onClick={start}><Mic size={18} aria-hidden /> Record</button> : <button type="button" className="btn-danger" onClick={stop}><Square size={18} aria-hidden /> Stop</button>}
      <label className="btn-ghost cursor-pointer"><Upload size={18} aria-hidden /> Upload audio<input type="file" accept="audio/*" className="sr-only" onChange={e => e.target.files?.[0] && setBlob(e.target.files[0])} /></label>
      <span className="text-sm text-muted">Max 50 MB · 30 min. Format is verified from file contents on the server.</span>
      {rec && <span role="status" className="text-amber">Recording…</span>}
      {url && <audio src={url} controls className="w-full" aria-label="Preview before saving" />}</div>
    <label className="block">Story title<input className="input mt-1" required value={f.title} onChange={set('title')} maxLength={160} /></label>
    <div className="grid md:grid-cols-2 gap-3">
      <label>Storyteller<input className="input mt-1" value={f.storyteller} onChange={set('storyteller')} /></label>
      <label>Recording date<input type="date" className="input mt-1" value={f.recorded_on} onChange={set('recorded_on')} /></label>
      <label>Places (comma separated)<input className="input mt-1" value={f.places} onChange={set('places')} /></label>
      <label>Event<input className="input mt-1" value={f.event} onChange={set('event')} /></label>
      <label>Tags<input className="input mt-1" value={f.tags} onChange={set('tags')} /></label>
      <label>Spoken language<select className="input mt-1" value={f.language} onChange={set('language')}><option value="auto">Detect automatically</option><option value="te">Telugu</option><option value="en">English</option><option value="hi">Hindi</option></select></label></div>
    <label className="flex gap-2 items-start"><input type="checkbox" className="mt-1" checked={consent} onChange={e => setConsent(e.target.checked)} /> I confirm I have permission to record and preserve this story, and that the storyteller (or their family) agrees to it being processed on this computer.</label>
    {err && <ErrorBox msg={err} />}
    <button className="btn" disabled={!blob || !consent || busy || !f.title}>{busy ? 'Encrypting & saving…' : 'Save story'}</button></form>
}
