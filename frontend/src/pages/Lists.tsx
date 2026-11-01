import { useEffect, useState } from 'react'
import { api, DEMO } from '../services/api'
import { Empty, Skeleton, ErrorBox, fmt } from '../components/ui'
import { MemoryCard } from '../components/MemoryCard'
import type { Memory, Story } from '../types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export function Home({ go, open }: { go: (v: string) => void; open: (id: string, t?: number) => void }) {
  const [d, setD] = useState<{ s: Story[]; m: Memory[]; p: any[] } | null>(null); const [err, setErr] = useState('')
  useEffect(() => { Promise.all([api.stories(), api.archive(), api.people()]).then(([s, m, p]) => setD({ s, m, p })).catch(e => setErr(e.message)) }, [])
  if (err) return <ErrorBox msg={err} />; if (!d) return <Skeleton rows={4} />
  const dur = d.s.reduce((a, s) => a + (s.duration || 0), 0)
  const cats = Object.entries(d.m.reduce((a: Record<string, number>, m) => ({ ...a, [m.category]: (a[m.category] || 0) + 1 }), {})).map(([name, n]) => ({ name: name.replaceAll('_', ' ').toLowerCase(), n }))
  const stat = (v: string | number, l: string) => <div className="card"><div className="font-serif text-3xl text-amber">{v}</div><div className="text-sm text-muted">{l}</div></div>
  return <div className="space-y-6">
    <header><h2 className="font-serif text-3xl">A quiet archive</h2><p className="text-muted">Don’t recreate the person. Preserve the moments.</p></header>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{stat(d.s.length, 'preserved stories')}{stat(`${Math.round(dur / 60)} min`, 'of recorded voice')}{stat(d.m.length, 'reviewed memories')}{stat(d.p.length, 'people in the archive')}</div>
    {d.s.length === 0 ? <Empty title="No stories yet" hint="Record a conversation with someone you love, or import an existing recording."><button className="btn" onClick={() => go('record')}>Record the first story</button></Empty> : <>
      <section><h3 className="font-serif text-2xl mb-2">Recently added</h3><ul className="space-y-2">{d.s.slice(0, 4).map(s => <li key={s.id}><button className="card w-full text-left hover:bg-white/5" onClick={() => open(s.id)}><span className="font-serif text-lg">{s.title}</span><span className="block text-sm text-muted">{s.storyteller} · {s.status}</span></button></li>)}</ul></section>
      {cats.length > 0 && <section aria-label="Memories by category"><h3 className="font-serif text-2xl mb-2">What the stories hold</h3><div className="card h-56"><ResponsiveContainer><BarChart data={cats}><XAxis dataKey="name" stroke="#b9ad94" fontSize={11} /><YAxis allowDecimals={false} stroke="#b9ad94" /><Tooltip contentStyle={{ background: '#212127', border: '1px solid #a9744a' }} /><Bar dataKey="n" fill="#e0a526" /></BarChart></ResponsiveContainer></div></section>}
      <Timeline memories={d.m} open={open} /></>}
    <p className="text-sm text-muted">Processing status for transcription and extraction jobs is shown live inside each story.</p></div>
}

export function Timeline({ memories, open }: { memories: Memory[]; open: (id: string, t?: number) => void }) {
  const dated = memories.filter(m => m.recorded_on).sort((a, b) => a.recorded_on!.localeCompare(b.recorded_on!)); const undated = memories.filter(m => !m.recorded_on)
  if (!memories.length) return null
  return <section aria-labelledby="tl"><h3 id="tl" className="font-serif text-2xl mb-2">Timeline</h3>
    <ol className="border-l-2 border-bronze ml-2 space-y-3">{dated.map(m => <li key={m.id} className="pl-4"><span className="text-xs text-muted">Recorded {m.recorded_on}</span><button className="block text-left font-serif text-lg hover:text-amber" onClick={() => open(m.story_id, m.evidence[0].start_seconds)}>{m.title}</button></li>)}</ol>
    {undated.length > 0 && <p className="text-sm text-muted mt-2">{undated.length} memories have no date — Ghostlight doesn’t guess: {undated.map(m => m.title).join(', ')}.</p>}</section>
}

export function Stories({ open, go }: { open: (id: string) => void; go: (v: string) => void }) {
  const [s, setS] = useState<Story[] | null>(null); const [err, setErr] = useState('')
  useEffect(() => { api.stories().then(setS).catch(e => setErr(e.message)) }, [])
  if (err) return <ErrorBox msg={err} />; if (!s) return <Skeleton />
  return <div className="space-y-3"><h2 className="font-serif text-3xl">Stories</h2>
    {s.length === 0 ? <Empty title="Nothing here yet" hint="Every story starts with a recording."><button className="btn" onClick={() => go('record')}>Record a story</button></Empty> :
      s.map(x => <button key={x.id} className="card w-full text-left hover:bg-white/5" onClick={() => open(x.id)}><span className="font-serif text-xl">{x.title}</span>
        <span className="block text-sm text-muted">{x.storyteller || 'Unknown'} · {x.recorded_on || 'no date'} · {x.duration ? fmt(x.duration) : '—'} · {x.status}{!x.consent && ' · consent withdrawn'}</span></button>)}</div>
}

export function Archive({ open }: { open: (id: string, t?: number) => void }) {
  const [m, setM] = useState<Memory[] | null>(null); const [stories, setStories] = useState<Story[]>([]); const [f, setF] = useState<Record<string, string>>({}); const [err, setErr] = useState('')
  useEffect(() => { api.stories().then(setStories).catch(() => {}) }, [])
  useEffect(() => { const q = Object.fromEntries(Object.entries(f).filter(([, v]) => v)); api.archive(q).then(setM).catch(e => setErr(e.message)) }, [f])
  const cats = ['PERSON', 'PLACE', 'EVENT', 'FOOD_OR_RECIPE', 'TRADITION', 'OBJECT', 'SAYING_OR_EXPRESSION', 'SONG_OR_MUSIC_REFERENCE', 'FAMILY_HISTORY', 'LIFE_LESSON', 'OTHER']
  const sel = (k: string, label: string, opts: [string, string][]) => <label className="text-sm">{label}<select className="input mt-1" value={f[k] || ''} onChange={e => setF({ ...f, [k]: e.target.value })}><option value="">All</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
  return <div className="space-y-4"><h2 className="font-serif text-3xl">Memory Archive</h2>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{sel('category', 'Category', cats.map(c => [c, c.replaceAll('_', ' ').toLowerCase()]))}{sel('story_id', 'Story', stories.map(s => [s.id, s.title]))}
      <label className="text-sm">Person<input className="input mt-1" value={f.person || ''} onChange={e => setF({ ...f, person: e.target.value })} disabled={DEMO} /></label>
      <label className="text-sm">Place<input className="input mt-1" value={f.place || ''} onChange={e => setF({ ...f, place: e.target.value })} disabled={DEMO} /></label></div>
    {err ? <ErrorBox msg={err} /> : !m ? <Skeleton /> : m.length === 0 ? <Empty title="No approved memories" hint="Approve memory candidates from a story’s studio and they will appear here with their sources." /> :
      <><div className="space-y-3">{m.map(x => <MemoryCard key={x.id} m={x} onOpen={open} />)}</div><Timeline memories={m} open={open} /></>}</div>
}
