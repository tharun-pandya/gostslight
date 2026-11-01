import { useEffect, useState } from 'react'
import { Flame } from 'lucide-react'
import { api, DEMO } from '../services/api'
import { Empty, ErrorBox, Skeleton } from '../components/ui'
import { MemoryCard } from '../components/MemoryCard'
import { useToast } from '../hooks/useToast'
import type { Collection, Memory } from '../types'

export function Collections({ open }: { open: (id: string, t?: number) => void }) {
  const toast = useToast(); const [cols, setCols] = useState<Collection[] | null>(null); const [mem, setMem] = useState<Memory[]>([]); const [sel, setSel] = useState<Set<string>>(new Set())
  const [name, setName] = useState(''); const [note, setNote] = useState(''); const [view, setView] = useState<string | null>(null); const [err, setErr] = useState('')
  const load = () => Promise.all([api.collections(), api.archive()]).then(([c, m]) => { setCols(c); setMem(m) }).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])
  if (err) return <ErrorBox msg={err} />; if (!cols) return <Skeleton />
  const active = cols.find(c => c.id === view)
  if (active) return <div className="space-y-4 rounded-2xl p-5" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(240,184,74,.25), #16161a 60%)' }}>
    <button className="btn-ghost" onClick={() => setView(null)}>← Collections</button>
    <header className="text-center"><Flame className="mx-auto text-amber flame" aria-hidden /><h2 className="font-serif text-4xl">{active.name}</h2><p className="text-muted">{active.note}</p><p className="text-xs text-muted">Original words and recordings only — nothing here is generated.</p></header>
    <div className="grid md:grid-cols-2 gap-3">{active.memory_ids.map(id => mem.find(m => m.id === id)).filter(Boolean).map(m => <MemoryCard key={m!.id} m={m!} onOpen={open} />)}</div>
    {!DEMO && <div className="flex gap-2"><button className="btn" onClick={() => api.exportCollection(active.id).catch(e => toast(e.message, true))}>Export HTML</button><button className="btn-ghost" onClick={() => window.print()}>Print memory book</button></div>}</div>
  return <div className="space-y-4"><h2 className="font-serif text-3xl">Collections</h2>
    {cols.length === 0 ? <Empty title="No collections yet" hint="Gather approved memories into a remembrance collection below." /> :
      <ul className="grid md:grid-cols-2 gap-3">{cols.map(c => <li key={c.id}><button className="card w-full text-left hover:bg-white/5" onClick={() => setView(c.id)}><span className="font-serif text-xl">{c.name}</span><span className="block text-sm text-muted">{c.memory_ids.length} memories</span></button></li>)}</ul>}
    {!DEMO && <form className="card space-y-2" onSubmit={async e => { e.preventDefault(); try { await api.createCollection(name, [...sel], note); toast('Collection created'); setName(''); setNote(''); setSel(new Set()); load() } catch (x: any) { toast(x.message, true) } }}>
      <h3 className="font-serif text-xl">New collection</h3><input className="input" placeholder="Name" aria-label="Collection name" value={name} onChange={e => setName(e.target.value)} required />
      <input className="input" placeholder="A note (optional)" aria-label="Note" value={note} onChange={e => setNote(e.target.value)} />
      {mem.length === 0 ? <p className="text-sm text-muted">Approve some memories first.</p> : <fieldset className="space-y-1"><legend className="text-sm text-muted">Approved memories</legend>{mem.map(m => <label key={m.id} className="flex gap-2"><input type="checkbox" checked={sel.has(m.id)} onChange={() => setSel(s => { const n = new Set(s); n.has(m.id) ? n.delete(m.id) : n.add(m.id); return n })} />{m.title}</label>)}</fieldset>}
      <button className="btn" disabled={!name || sel.size === 0}>Create collection</button></form>}</div>
}
