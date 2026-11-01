import { useState } from 'react'
import { Play } from 'lucide-react'
import { api, DEMO } from '../services/api'
import { ErrorBox, fmt } from '../components/ui'
import type { AskResult } from '../types'

export function Ask({ open }: { open: (id: string, t?: number) => void }) {
  const [q, setQ] = useState(''); const [r, setR] = useState<AskResult | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const go = async (question: string) => { setQ(question); setBusy(true); setErr(''); setR(null); try { setR(await api.ask(question)) } catch (e: any) { setErr(e.message) } finally { setBusy(false) } }
  return <div className="space-y-4 max-w-2xl"><h2 className="font-serif text-3xl">Ask the Memories</h2>
    <p className="text-muted">Answers come only from your recordings and always show their sources. Ghostlight never speaks as the storyteller and never imagines what they would have said.</p>
    {DEMO && <div className="card"><p className="text-sm text-amber mb-2">Demo uses fictional sample memories. Choose an example question:</p><div className="flex flex-wrap gap-2">{api.demoQuestions().map(x => <button key={x} className="btn-ghost" onClick={() => go(x)}>{x}</button>)}</div></div>}
    {!DEMO && <form className="flex gap-2" onSubmit={e => { e.preventDefault(); q.trim() && go(q) }}><input className="input" aria-label="Your question" placeholder="What did grandmother say about Sankranti?" value={q} onChange={e => setQ(e.target.value)} /><button className="btn" disabled={busy}>Ask</button></form>}
    {busy && <p role="status" className="text-muted">Searching your recordings…</p>}{err && <ErrorBox msg={err} />}
    {r && <section className="card border-l-4 border-l-marigold" aria-live="polite">
      <p className="text-lg font-serif">{r.answer}</p>
      {r.mode === 'evidence_only' && <p className="text-sm text-amber mt-1">Gemma is unavailable, so these are the matching passages only. {r.notice}</p>}
      {r.citations.map(c => <div key={c.segment_id + c.story_id} className="mt-3 border-t border-bronze/30 pt-2"><div className="text-sm text-muted">Source: {c.story_title} · {fmt(c.start)}–{fmt(c.end)}</div>
        <blockquote className="italic text-amber">“{c.text}”</blockquote><button className="btn-ghost !py-1 mt-1" onClick={() => open(c.story_id, c.start)}><Play size={14} aria-hidden /> Listen to original recording</button></div>)}</section>}</div>
}
